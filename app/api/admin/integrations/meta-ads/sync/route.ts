import { NextRequest, NextResponse } from "next/server";
import { createLead, getAdminSettings, getNextRoundRobinUser } from "@/lib/db";
import { AdminSettingsModel, LeadModel } from "@/lib/models";
import { dbConnect } from "@/lib/mongoose";
import { getSession } from "@/lib/session";
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

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const adminSettings = await AdminSettingsModel.findOne({ id: "admin_settings" }).lean();

  const pageAccessToken =
    (adminSettings as any)?.metaPageAccessToken ||
    process.env.META_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    (adminSettings as any)?.metaSystemUserToken ||
    "";

  if (!pageAccessToken) {
    return NextResponse.json(
      { error: "No Meta Page Access Token configured on server." },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "Could not resolve Meta Page ID from token." },
      { status: 400 }
    );
  }

  // 1. Fetch active forms
  let forms: Array<{ id: string; name: string }> = [];
  try {
    const formsRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?access_token=${pageAccessToken}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const formsData = await formsRes.json().catch(() => null);
    if (Array.isArray(formsData?.data)) {
      forms = formsData.data.map((f: any) => ({ id: f.id, name: f.name || f.id }));
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to query Meta forms: ${err.message}` },
      { status: 500 }
    );
  }

  if (forms.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No active Lead Ads forms found on this Meta page.",
      formsScanned: 0,
      totalLeadsFound: 0,
      newlyAdded: 0,
      duplicatesSkipped: 0,
    });
  }

  let totalLeadsFound = 0;
  let newlyAdded = 0;
  let duplicatesSkipped = 0;
  const addedLeadsList: any[] = [];

  for (const form of forms) {
    try {
      const leadsRes = await fetch(
        `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,is_organic,platform,field_data&access_token=${pageAccessToken}&limit=100`,
        { signal: AbortSignal.timeout(15000) }
      );
      const leadsData = await leadsRes.json().catch(() => null);
      const leadItems = Array.isArray(leadsData?.data) ? leadsData.data : [];
      totalLeadsFound += leadItems.length;

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

        // Check duplicate across all leads (active + trash)
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

        // New lead: Assign counselor via round robin
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

        // Set the original created timestamp from Meta if valid
        if (leadData.created_time) {
          try {
            const originalDate = new Date(leadData.created_time).toISOString();
            await LeadModel.updateOne({ id: createdLead.id }, { $set: { createdAt: originalDate } });
          } catch {}
        }

        newlyAdded++;
        addedLeadsList.push({
          name: leadName,
          phone: cleanPhone,
          state: leadState,
          assignedTo: assignedOwnerName,
        });
      }
    } catch (formErr) {
      console.error(`[Meta Sync] Error scanning form ${form.id}:`, formErr);
    }
  }

  return NextResponse.json({
    success: true,
    message: newlyAdded > 0
      ? `Meta Lead Ads Sync Complete: Found and added ${newlyAdded} new leads (${duplicatesSkipped} already existed).`
      : `Meta Lead Ads Sync Complete: All ${totalLeadsFound} leads on Meta are already present in CRM.`,
    formsScanned: forms.length,
    totalLeadsFound,
    newlyAdded,
    duplicatesSkipped,
    addedLeads: addedLeadsList,
  });
}

