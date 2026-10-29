import { NextRequest, NextResponse } from "next/server";
import { createLead, getNextRoundRobinUser } from "@/lib/db";
import { AdminSettingsModel, LeadModel } from "@/lib/models";
import { dbConnect } from "@/lib/mongoose";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Delhi NCR", "Jammu and Kashmir", "Ladakh", "Chandigarh"
];

const COUNTRY_CANDIDATES = [
  "Russia", "China", "Kazakhstan", "Kyrgyzstan", "Georgia", "Uzbekistan", "Nepal"
];

// ── GET: Webhook Verification Endpoint for Meta ──────────────────────────────
// When you click "Verify and save" in Meta for Developers, Meta sends a GET request
// with hub.mode, hub.verify_token, and hub.challenge.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  await dbConnect();
  const adminSettings = await AdminSettingsModel.findOne({ id: "admin_settings" }).lean();

  const expectedToken =
    (adminSettings as any)?.metaVerifyToken ||
    process.env.META_VERIFY_TOKEN ||
    "fx_meta_leads_token_2026";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[Meta Webhook] Verified successfully with token:", token);
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
}

// ── Helper to extract values from Meta field_data ────────────────────────────
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

// Helper to deduce state from text if form didn't provide a direct state field
function detectIndianState(text: string): string {
  const lower = text.toLowerCase();
  for (const st of INDIAN_STATES) {
    const stLower = st.toLowerCase();
    const regex = new RegExp(`\\b${stLower.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (regex.test(lower)) {
      return st;
    }
  }
  // Common short matches
  if (/\bup\b/i.test(lower) && !lower.includes("support")) return "Uttar Pradesh";
  if (/\bmp\b/i.test(lower)) return "Madhya Pradesh";
  if (/\bwb\b/i.test(lower)) return "West Bengal";
  if (/\bncr\b/i.test(lower)) return "Delhi NCR";
  return "";
}

// Helper to deduce preferred country from text
function detectCountry(text: string): string {
  const lower = text.toLowerCase();
  for (const c of COUNTRY_CANDIDATES) {
    if (lower.includes(c.toLowerCase())) return c;
  }
  return "";
}

// ── POST: Receive Real-Time Lead from Meta Lead Ads ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    await dbConnect();
    const adminSettings = await AdminSettingsModel.findOne({ id: "admin_settings" }).lean();

    const pageAccessToken =
      (adminSettings as any)?.metaPageAccessToken ||
      process.env.META_PAGE_ACCESS_TOKEN ||
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
      "";

    // ── Case A: Direct Test Lead / Simulator Payload ───────────────────────
    if (body.test === true || (body.name && (body.phone || body.mobile))) {
      const rawPhone = String(body.phone || body.mobile || "").trim();
      const digits = rawPhone.replace(/\D/g, "");
      let cleanPhone = digits;
      if (digits.length === 12 && digits.startsWith("91")) cleanPhone = digits.slice(2);
      else if (digits.length === 11 && digits.startsWith("0")) cleanPhone = digits.slice(1);
      else if (digits.length > 10) cleanPhone = digits.slice(-10);

      // Check duplicate using flexible formatting regex
      if (cleanPhone && cleanPhone.length >= 7) {
        const phonePattern = cleanPhone.split("").join("\\D*");
        const existing = await LeadModel.findOne({
          deletedAt: null,
          phone: { $regex: phonePattern },
        });
        if (existing) {
          return NextResponse.json({
            status: "skipped_duplicate",
            message: `Lead with phone ${cleanPhone} already exists in CRM.`,
            leadId: existing.id,
          });
        }
      }

      // Round-Robin Distribution
      const assignedUser = await getNextRoundRobinUser();
      const assignedOwnerId = assignedUser?.id || "admin";
      const assignedOwnerName = assignedUser?.name || "Admin";

      const leadState = body.state || detectIndianState(`${body.campaign || ""} ${body.adset || ""} ${body.city || ""}`) || "";
      const leadCountry = body.preferredCountry || detectCountry(`${body.notes || ""} ${body.campaign || ""}`) || "";
      const campaignName = body.campaign || "State-wise";

      const created = await createLead({
        ownerId: assignedOwnerId,
        assignAgent: assignedOwnerName,
        name: String(body.name).trim(),
        phone: cleanPhone || rawPhone || "—",
        email: body.email ? String(body.email).trim() : "",
        city: body.city || undefined,
        state: leadState || undefined,
        neetStatus: body.neetStatus || undefined,
        preferredCountry: leadCountry || undefined,
        channel: "Meta Ads",
        stage: "Initial Contact",
        value: 0,
        notes: `Campaign: ${campaignName}${body.adset ? ` · AdSet: ${body.adset}` : ""}`,
        formNotes: body.formNotes || (leadState ? `• State: ${leadState}` : ""),
        services: leadCountry ? [leadCountry] : ["Others"],
        serviceType: leadCountry || "Others",
      });

      return NextResponse.json({
        success: true,
        status: "created",
        leadId: created.id,
        assignedTo: { id: assignedOwnerId, name: assignedOwnerName },
        message: `Lead successfully routed to ${assignedOwnerName} via Round-Robin.`,
      });
    }

    // ── Case B: Official Meta Webhook Event (object === "page") ─────────────
    if (body.object !== "page") {
      return NextResponse.json({ error: "Invalid event object, expected 'page'." }, { status: 400 });
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];
    const results: any[] = [];
    let totalLeadgenEvents = 0;

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      for (const change of changes) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        const formId = change.value?.form_id;
        const pageId = change.value?.page_id || entry.id;

        if (!leadgenId) continue;
        totalLeadgenEvents++;

        // 1. Fetch details from Meta Graph API using pageAccessToken
        if (!pageAccessToken) {
          console.error("[Meta Webhook] Cannot retrieve lead details: META_PAGE_ACCESS_TOKEN is missing or not configured.");
          results.push({
            status: "failed",
            leadgenId,
            error: "No Meta Page Access Token configured on server",
          });
          continue;
        }

        let leadData: any = null;
        let apiError = "";

        try {
          const graphRes = await fetch(
            `https://graph.facebook.com/v21.0/${leadgenId}?fields=id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data&access_token=${pageAccessToken}`,
            { signal: AbortSignal.timeout(10000) }
          );
          leadData = await graphRes.json().catch(() => null);

          if (!graphRes.ok || !leadData || leadData.error) {
            apiError = leadData?.error?.message || `HTTP ${graphRes.status}`;
            console.error(`[Meta Webhook] Meta Graph API error for leadgen ${leadgenId}:`, apiError);
            results.push({
              status: "failed",
              leadgenId,
              error: apiError,
              errorCode: leadData?.error?.code,
              errorSubcode: leadData?.error?.error_subcode,
            });
            continue;
          }
        } catch (err: any) {
          apiError = err?.message || "Failed to query Meta Graph API";
          console.error(`[Meta Webhook] Network exception querying Meta Graph API for leadgen ${leadgenId}:`, err);
          results.push({
            status: "failed",
            leadgenId,
            error: apiError,
          });
          continue;
        }

        let campaignName = leadData.campaign_name || "State-wise";
        let adsetName = leadData.adset_name || "";
        let adName = leadData.ad_name || "";

        // If campaign name is not populated directly on leadgen, fetch via campaign_id
        if (!leadData.campaign_name && leadData.campaign_id) {
          try {
            const campRes = await fetch(
              `https://graph.facebook.com/v21.0/${leadData.campaign_id}?fields=name&access_token=${pageAccessToken}`,
              { signal: AbortSignal.timeout(6000) }
            );
            const campData = await campRes.json().catch(() => null);
            if (campData?.name) campaignName = campData.name;
          } catch {}
        }

        // If adset name is not populated directly on leadgen, fetch via adset_id
        if (!adsetName && leadData.adset_id) {
          try {
            const adsetRes = await fetch(
              `https://graph.facebook.com/v21.0/${leadData.adset_id}?fields=name&access_token=${pageAccessToken}`,
              { signal: AbortSignal.timeout(6000) }
            );
            const adsetData = await adsetRes.json().catch(() => null);
            if (adsetData?.name) adsetName = adsetData.name;
          } catch {}
        }

        // If ad name is not populated directly on leadgen, fetch via ad_id
        if (!adName && leadData.ad_id) {
          try {
            const adRes = await fetch(
              `https://graph.facebook.com/v21.0/${leadData.ad_id}?fields=name&access_token=${pageAccessToken}`,
              { signal: AbortSignal.timeout(6000) }
            );
            const adData = await adRes.json().catch(() => null);
            if (adData?.name) adName = adData.name;
          } catch {}
        }

        const fieldData: Array<{ name: string; values: string[] }> = Array.isArray(leadData.field_data)
          ? leadData.field_data
          : [];

        let leadName = extractMetaField(fieldData, [
          "full_name",
          "name",
          "first_name",
          "customer_name",
          "your_name",
          "student_name",
        ]) || "Meta Lead";

        const leadPhone = extractMetaField(fieldData, [
          "phone_number",
          "whatsapp_number",
          "phone",
          "mobile_number",
          "contact_number",
          "mobile",
          "student_phone",
        ]);

        const leadEmail = extractMetaField(fieldData, [
          "email",
          "email_address",
          "student_email",
        ]);

        const leadCity = extractMetaField(fieldData, [
          "city",
          "location",
          "current_city",
          "town",
          "district",
        ]);

        let leadState = extractMetaField(fieldData, [
          "state",
          "current_state",
          "your_state",
          "select_state",
          "which_state",
          "region",
          "home_state",
        ]);

        const leadNeetStatus = extractMetaField(fieldData, [
          "neet_status",
          "neet",
          "neet_score",
          "neet_qualified",
          "neet_result",
          "have_you_appeared_for_neet",
          "have_you_qualified_neet",
          "qualified_neet",
        ]);

        let leadPreferredCountry = extractMetaField(fieldData, [
          "preferred_country",
          "country",
          "destination",
          "target_country",
          "study_destination",
          "which_country",
        ]);

        const extractedPlatform = extractMetaField(fieldData, [
          "platform",
          "source",
        ]);

        const extraFormFields: string[] = [];

        // Collect custom questions from the lead form (e.g. parent/student, annual budget)
        for (const field of fieldData) {
          const rawName = (field.name || "").toLowerCase();
          const normName = rawName.replace(/[^a-z0-9]/g, "");

          const isStandardField = [
            "fullname", "name", "firstname", "customername", "yourname", "studentname",
            "phonenumber", "whatsappnumber", "phone", "mobilenumber", "contactnumber", "mobile",
            "email", "emailaddress", "platform", "source", "city", "location", "currentcity",
            "state", "currentstate", "inboxurl", "inboxlink", "threadurl",
          ].some((std) => normName === std || normName === `${std}id`);

          if (normName.includes("inbox") || normName.includes("thread")) continue;

          if (!isStandardField && Array.isArray(field.values) && field.values.length > 0) {
            const valStr = field.values.join(", ").trim();
            if (!valStr) continue;
            const cleanName = field.name
              .replace(/_/g, " ")
              .replace(/\s+/g, " ")
              .replace(/[?:]+$/, "")
              .trim();
            const qFormatted = cleanName
              ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
              : cleanName;
            extraFormFields.push(`${qFormatted}?: ${valStr}`);
          }
        }

        // Deduce state if not explicitly in form
        if (!leadState) {
          leadState = detectIndianState(`${campaignName} ${adsetName} ${adName} ${leadCity} ${extraFormFields.join(" ")}`);
        }

        // Deduce preferred country if not explicitly in form
        if (!leadPreferredCountry) {
          leadPreferredCountry = detectCountry(`${campaignName} ${adsetName} ${adName} ${extraFormFields.join(" ")}`);
        }

        // Clean phone number
        const rawPhone = leadPhone;
        const digits = rawPhone.replace(/\D/g, "");
        let cleanPhone = digits;
        if (digits.length === 12 && digits.startsWith("91")) cleanPhone = digits.slice(2);
        else if (digits.length === 11 && digits.startsWith("0")) cleanPhone = digits.slice(1);
        else if (digits.length > 10) cleanPhone = digits.slice(-10);

        if (!cleanPhone && !rawPhone) {
          console.warn(`[Meta Webhook] Leadgen ${leadgenId} has no phone number. Skipping creation.`);
          results.push({
            status: "failed",
            leadgenId,
            error: "Lead has no phone number",
          });
          continue;
        }

        // Check for duplicate lead in CRM (flexible matching against stored formats)
        if (cleanPhone && cleanPhone.length >= 7) {
          const phonePattern = cleanPhone.split("").join("\\D*");
          const orConditions: any[] = [
            { phone: { $regex: phonePattern } },
          ];
          if (leadEmail && leadEmail.includes("@")) {
            orConditions.push({
              email: { $regex: `^${leadEmail.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
            });
          }

          const existing = await LeadModel.findOne({
            deletedAt: null,
            $or: orConditions,
          });

          if (existing) {
            console.log(`[Meta Webhook] Duplicate lead skipped: ${leadName} (${cleanPhone})`);
            results.push({ status: "skipped_duplicate", leadgenId, phone: cleanPhone, existingLeadId: existing.id });
            continue;
          }
        }

        // ── Round-Robin Counselor / User Assignment ──────────────────────────
        const assignedUser = await getNextRoundRobinUser();
        const assignedOwnerId = assignedUser?.id || "admin";
        const assignedOwnerName = assignedUser?.name || "Admin";

        // Format lead form notes
        const formNotesLines: string[] = [];
        if (leadState) formNotesLines.push(`• State: ${leadState}`);
        if (leadCity) formNotesLines.push(`• City: ${leadCity}`);
        if (leadNeetStatus) formNotesLines.push(`• NEET Status: ${leadNeetStatus}`);
        if (leadPreferredCountry) formNotesLines.push(`• Preferred Country: ${leadPreferredCountry}`);
        if (extraFormFields.length > 0) formNotesLines.push(...extraFormFields.map((f) => `• ${f}`));

        const formAnswers = formNotesLines.join("\n");
        const leadServices = leadPreferredCountry ? [leadPreferredCountry] : ["Others"];

        // Create lead in CRM Initial Stage
        const created = await createLead({
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
          stage: "Initial Contact",
          value: 0,
          notes: `Campaign: ${campaignName || "State-wise"}${adsetName ? ` · AdSet: ${adsetName}` : ""}${adName ? ` · Ad: ${adName}` : ""}`,
          formNotes: formAnswers,
          services: leadServices,
          serviceType: leadServices[0],
        });

        results.push({
          status: "created",
          leadId: created.id,
          leadgenId,
          campaign: campaignName,
          assignedTo: { id: assignedOwnerId, name: assignedOwnerName },
        });
      }
    }

    const failedCount = results.filter((r) => r.status === "failed").length;
    if (totalLeadgenEvents > 0 && failedCount === totalLeadgenEvents) {
      // Return HTTP 500 so Meta will retry webhook delivery once token is restored
      return NextResponse.json(
        {
          success: false,
          error: "All Meta leadgen events failed to process (e.g. invalid or expired Page Access Token).",
          processed: results,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, processed: results }, { status: 200 });
  } catch (error: any) {
    console.error("[Meta Webhook Error]:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
