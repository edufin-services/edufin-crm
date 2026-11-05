import { NextRequest, NextResponse } from "next/server";
import { createLead, getNextRoundRobinUser } from "@/lib/db";
import { AdminSettingsModel, LeadModel } from "@/lib/models";
import { dbConnect } from "@/lib/mongoose";
import { detectCountry } from "@/lib/lead-parser";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Delhi NCR", "Jammu and Kashmir", "Ladakh", "Chandigarh"
];

function extractMetaField(fieldData: Array<{ name: string; values: string[] }>, keys: string[]): string {
  if (!Array.isArray(fieldData)) return "";
  for (const field of fieldData) {
    const rawName = (field.name || "").toLowerCase();
    const normName = rawName.replace(/[^a-z0-9]/g, "");
    for (const key of keys) {
      const rawKey = key.toLowerCase();
      const normKey = rawKey.replace(/[^a-z0-9]/g, "");
      if (
        normName === normKey ||
        normName.includes(normKey) ||
        (normKey.length >= 4 && normName.includes(normKey))
      ) {
        if (field.values?.[0]) {
          return String(field.values[0]).trim();
        }
      }
    }
  }
  return "";
}

function detectIndianState(text: string): string {
  const lower = text.toLowerCase();
  for (const st of INDIAN_STATES) {
    const stLower = st.toLowerCase();
    const regex = new RegExp(`\\b${stLower.replace(/\\s+/g, "\\s+")}\\b`, "i");
    if (regex.test(lower)) {
      return st;
    }
  }
  if (/\bup\b/i.test(lower) && !lower.includes("support")) return "Uttar Pradesh";
  if (/\bmp\b/i.test(lower)) return "Madhya Pradesh";
  if (/\bwb\b/i.test(lower)) return "West Bengal";
  if (/\bncr\b/i.test(lower)) return "Delhi NCR";
  return "";
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const adminSettings = await AdminSettingsModel.findOne({ id: "admin_settings" }).lean();

    const pageAccessToken =
      (adminSettings as any)?.metaPageAccessToken ||
      process.env.META_PAGE_ACCESS_TOKEN ||
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
      (adminSettings as any)?.metaSystemUserToken ||
      "";

    if (!pageAccessToken) {
      return NextResponse.json({ status: "skipped", reason: "No access token configured" });
    }

    let pageId = (adminSettings as any)?.metaPageId || "";
    if (!pageId) {
      try {
        const meRes = await fetch(
          `https://graph.facebook.com/v21.0/me?access_token=${pageAccessToken}&fields=id`,
          { signal: AbortSignal.timeout(7000) }
        );
        const meData = await meRes.json().catch(() => null);
        if (meData?.id) pageId = meData.id;
      } catch {}
    }

    if (!pageId) {
      return NextResponse.json({ status: "skipped", reason: "Could not resolve Page ID" });
    }

    const formsRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?access_token=${pageAccessToken}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const formsData = await formsRes.json().catch(() => null);
    const forms: Array<{ id: string; name: string }> = Array.isArray(formsData?.data)
      ? formsData.data.map((f: any) => ({ id: f.id, name: f.name || f.id }))
      : [];

    let newlyAdded = 0;
    let duplicatesSkipped = 0;

    for (const form of forms) {
      const leadsRes = await fetch(
        `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,is_organic,platform,field_data&access_token=${pageAccessToken}&limit=50`,
        { signal: AbortSignal.timeout(12000) }
      );
      const leadsData = await leadsRes.json().catch(() => null);
      const leadItems = Array.isArray(leadsData?.data) ? leadsData.data : [];

      for (const leadData of leadItems) {
        const fieldData: Array<{ name: string; values: string[] }> = Array.isArray(leadData.field_data)
          ? leadData.field_data
          : [];

        const leadName = extractMetaField(fieldData, [
          "full_name", "name", "first_name", "customer_name", "your_name", "student_name",
        ]) || "Meta Lead";

        const rawPhone = extractMetaField(fieldData, [
          "phone_number", "whatsapp_number", "phone", "mobile_number", "contact_number", "mobile",
        ]);

        const leadEmail = extractMetaField(fieldData, [
          "email", "email_address", "student_email",
        ]);

        const leadCity = extractMetaField(fieldData, [
          "city", "location", "current_city", "town", "district",
        ]);

        let leadState = extractMetaField(fieldData, [
          "state", "current_state", "your_state", "select_state", "which_state", "region", "home_state",
        ]);

        const leadNeetStatus = extractMetaField(fieldData, [
          "neet_status", "neet", "neet_score", "neet_qualified", "neet_result",
          "have_you_appeared_for_neet", "have_you_qualified_neet", "qualified_neet",
        ]);

        let leadPreferredCountry = extractMetaField(fieldData, [
          "preferred_country", "country", "destination", "target_country",
        ]);
        if (leadPreferredCountry && leadPreferredCountry.toLowerCase() === "others") {
          leadPreferredCountry = "";
        }

        const rawPlatform = String(leadData?.platform || "").trim().toLowerCase();
        let leadPlatform = "";
        if (rawPlatform === "fb" || rawPlatform.includes("facebook")) leadPlatform = "fb";
        else if (rawPlatform === "ig" || rawPlatform.includes("instagram")) leadPlatform = "ig";
        else if (rawPlatform) leadPlatform = rawPlatform;

        const campaignName = leadData.campaign_name || "State-wise";
        const adsetName = leadData.adset_name || "";
        const adName = leadData.ad_name || "";

        const extraFormFields: string[] = [];
        for (const field of fieldData) {
          const rawN = (field.name || "").toLowerCase();
          const normN = rawN.replace(/[^a-z0-9]/g, "");
          const isStandard = [
            "fullname", "name", "firstname", "customername", "yourname", "studentname",
            "phonenumber", "whatsappnumber", "phone", "mobilenumber", "contactnumber", "mobile",
            "email", "emailaddress", "platform", "source", "city", "location", "currentcity",
            "state", "currentstate",
          ].some((std) => normN === std || normN === `${std}id`);

          if (!isStandard && Array.isArray(field.values) && field.values.length > 0) {
            const val = field.values.join(", ").trim();
            if (val) {
              const cleanQ = field.name.replace(/_/g, " ").replace(/[?:]+$/, "").trim();
              const formattedQ = cleanQ.charAt(0).toUpperCase() + cleanQ.slice(1);
              extraFormFields.push(`${formattedQ}?: ${val}`);
            }
          }
        }

        if (!leadState) {
          leadState = detectIndianState(`${campaignName} ${adsetName} ${adName} ${leadCity} ${extraFormFields.join(" ")}`);
        }

        if (!leadPreferredCountry) {
          const detected = detectCountry(`${campaignName} ${adsetName} ${adName} ${extraFormFields.join(" ")}`);
          if (detected && detected.toLowerCase() !== "others") {
            leadPreferredCountry = detected;
          }
        }

        const digits = rawPhone.replace(/\D/g, "");
        let cleanPhone = digits;
        if (digits.length === 12 && digits.startsWith("91")) cleanPhone = digits.slice(2);
        else if (digits.length === 11 && digits.startsWith("0")) cleanPhone = digits.slice(1);
        else if (digits.length > 10) cleanPhone = digits.slice(-10);

        if (!cleanPhone && !rawPhone) continue;

        if (cleanPhone && cleanPhone.length >= 7) {
          const phonePattern = cleanPhone.split("").join("\\D*");
          const existing = await LeadModel.findOne({
            phone: { $regex: phonePattern },
          });

          if (existing) {
            duplicatesSkipped++;
            continue;
          }
        }

        const assignedUser = await getNextRoundRobinUser();
        const assignedOwnerId = assignedUser?.id || "admin";
        const assignedOwnerName = assignedUser?.name || "Admin";

        const formNotesLines: string[] = [];
        if (leadPlatform) formNotesLines.push(`• Platform: ${leadPlatform === "fb" ? "Facebook" : "Instagram"}`);
        if (leadState) formNotesLines.push(`• State: ${leadState}`);
        if (leadCity) formNotesLines.push(`• City: ${leadCity}`);
        if (leadNeetStatus) formNotesLines.push(`• NEET Status: ${leadNeetStatus}`);
        if (leadPreferredCountry) formNotesLines.push(`• Preferred Country: ${leadPreferredCountry}`);
        if (extraFormFields.length > 0) formNotesLines.push(...extraFormFields.map((f) => `• ${f}`));

        const formAnswers = formNotesLines.join("\n");
        const leadServices = leadPreferredCountry ? [leadPreferredCountry] : [];

        const createdLead = await createLead({
          ownerId: assignedOwnerId,
          assignAgent: assignedOwnerName,
          name: leadName,
          phone: cleanPhone || rawPhone || "—",
          email: leadEmail,
          city: leadCity || undefined,
          state: leadState || undefined,
          neetStatus: leadNeetStatus || undefined,
          preferredCountry: leadPreferredCountry || undefined,
          channel: "Meta Ads",
          platform: leadPlatform || undefined,
          stage: "Initial Contact",
          value: 0,
          notes: "",
          campaign: campaignName || undefined,
          adset: adsetName || undefined,
          adName: adName || undefined,
          formNotes: formAnswers,
          services: leadServices,
          serviceType: leadServices[0] || undefined,
        });

        if (leadData.created_time) {
          try {
            const originalDate = new Date(leadData.created_time).toISOString();
            await LeadModel.updateOne({ id: createdLead.id }, { $set: { createdAt: originalDate } });
          } catch {}
        }

        newlyAdded++;
      }
    }

    return NextResponse.json({
      status: "ok",
      newlyAdded,
      duplicatesSkipped,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Meta Cron Sync Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

