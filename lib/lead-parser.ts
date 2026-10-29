import type { Channel } from "./constants";

export type ExtractedLeadRow = {
  name: string;
  phone: string;
  rawPhone: string;
  platform: string;
  channel: Channel;
  email?: string;
  city?: string;
  state?: string;
  neetStatus?: string;
  preferredCountry?: string;
  formNotes?: string;
  notes?: string;
  fileName?: string;
};

/**
 * Normalizes a header or key: lowercases, removes non-alphanumeric chars (except ?).
 */
export function normalizeKey(key: string): string {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

/**
 * Normalizes a phone number to standard 10 digits for Indian numbers, or clean digits.
 */
export function cleanPhoneNumber(val: unknown): { clean: string; raw: string } {
  const raw = String(val ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  let clean = digits;
  if (digits.length === 12 && digits.startsWith("91")) {
    clean = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    clean = digits.slice(1);
  } else if (digits.length > 10) {
    clean = digits.slice(-10);
  }
  return { clean, raw };
}

/**
 * Normalizes platform/channel names to standard CRM formats.
 */
export function normalizePlatform(val: unknown): { platform: string; channel: Channel } {
  const str = String(val ?? "").trim().toLowerCase();
  if (str === "fb" || str.includes("facebook") || str.includes("meta ads") || str === "meta") {
    return { platform: "fb", channel: "Facebook" };
  }
  if (str === "ig" || str.includes("instagram") || str.includes("insta")) {
    return { platform: "ig", channel: "Instagram" };
  }
  if (str.includes("wa") || str.includes("whatsapp")) {
    return { platform: "whatsapp", channel: "WhatsApp" };
  }
  if (str.includes("ad") || str.includes("google")) {
    return { platform: "ads", channel: "Ads" };
  }
  if (str.includes("email") || str.includes("mail")) {
    return { platform: "email", channel: "Email" };
  }
  return { platform: str || "fb", channel: "Facebook" };
}

/**
 * Formats a raw column header into a human-readable question title.
 * e.g., "what_is_your_neet_score?" -> "What is your neet score?"
 *       "preferred_country" -> "Preferred Country"
 */
export function formatQuestionTitle(header: string): string {
  let cleaned = header
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[_]+/g, " ")
    .replace(/[:]+$/, "")
    .trim();

  if (!cleaned) return "Question";

  // Capitalize words or first letter nicely
  const words = cleaned.split(/\s+/);
  const formattedWords = words.map((w, idx) => {
    // Preserve words in ALL CAPS (like NEET, PCB, MBBS, USA, UK, CAD, INR)
    if (w.length > 1 && w === w.toUpperCase() && /^[A-Z0-9]+$/.test(w)) {
      return w;
    }
    const lower = w.toLowerCase();
    if (idx === 0) {
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
    // Capitalize acronyms or special words
    if (["neet", "pcb", "mbbs", "crm", "id", "dob", "nri", "lrs", "kyc"].includes(lower)) {
      return lower.toUpperCase();
    }
    return lower;
  });

  return formattedWords.join(" ");
}

export function formatAnswerValue(val: string): string {
  let str = String(val ?? "").trim();
  if (!str) return "";
  const lower = str.toLowerCase();
  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  if (lower === "student") return "Student";
  if (lower === "parent") return "Parent";

  // Clean underscores into spaces
  let cleaned = str.replace(/[_]+/g, " ").trim();
  if (lower.includes("appearing")) {
    cleaned = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  cleaned = cleaned.replace(/\blakh\b/i, "Lakh");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Delhi NCR", "Jammu and Kashmir", "Ladakh", "Chandigarh"
];

const COUNTRY_CANDIDATES = [
  "Russia", "China", "Kazakhstan", "Kyrgyzstan", "Georgia", "Uzbekistan", "Nepal", "Philippines"
];

export function detectIndianState(text: string): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  for (const st of INDIAN_STATES) {
    const stLower = st.toLowerCase();
    const regex = new RegExp(`\\b${stLower.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (regex.test(lower)) {
      return st;
    }
  }
  if (/\bup\b/i.test(lower) && !lower.includes("support")) return "Uttar Pradesh";
  if (/\bmp\b/i.test(lower)) return "Madhya Pradesh";
  if (/\bwb\b/i.test(lower)) return "West Bengal";
  if (/\bncr\b/i.test(lower) || lower.includes("delhi")) return "Delhi NCR";
  if (/\bbr\b/i.test(lower)) return "Bihar";
  if (/\brj\b/i.test(lower)) return "Rajasthan";
  return "";
}

export function detectCountry(text: string): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  if (
    lower.includes("kursk") ||
    lower.includes("russia") ||
    lower.includes("omsk") ||
    lower.includes("samara") ||
    lower.includes("kazan") ||
    lower.includes("bashkir") ||
    lower.includes("crimean") ||
    lower.includes("tver")
  ) {
    return "Russia";
  }
  for (const c of COUNTRY_CANDIDATES) {
    if (lower.includes(c.toLowerCase())) return c;
  }
  return "";
}

const IGNORED_METADATA_KEYS = new Set([
  "id",
  "leadid",
  "leadgenid",
  "createdtime",
  "creationtime",
  "date",
  "time",
  "timestamp",
  "isorganic",
  "organic",
  "adid",
  "adsetid",
  "campaignid",
  "formid",
  "pageid",
  "pagename",
  "inboxurl",
  "inboxlink",
  "threadurl",
  "threadid",
  "_rownumber",
  "rowid",
  "row",
  "index",
  "filename",
  "file_name",
  "file",
  "sourcefile",
  "source_file",
  "sheet",
  "sheetname",
  "sheet_name",
  "workbook",
  "filepath",
  "path",
]);

/**
 * Extracts a structured lead from a single row of an Excel sheet or CSV file,
 * capturing name, phone, email, platform, location, education fields, and ALL customer form questions/answers.
 */
export function extractLeadFromRow(
  row: Record<string, any>,
  fileName: string = ""
): ExtractedLeadRow | null {
  if (!row || typeof row !== "object") return null;

  let nameVal = "";
  let firstNameVal = "";
  let lastNameVal = "";
  let phoneVal = "";
  let emailVal = "";
  let platformVal = "";
  let cityVal = "";
  let stateVal = "";
  let neetVal = "";
  let countryVal = "";

  let campaignVal = "";
  let adsetVal = "";
  let adVal = "";
  let formNameVal = "";

  const explicitAnswersList: string[] = [];
  const customQuestions: Array<{ key: string; question: string; answer: string }> = [];

  for (const [rawKey, rawVal] of Object.entries(row)) {
    if (rawVal === undefined || rawVal === null) continue;
    const valStr = String(rawVal).trim();
    if (!valStr || valStr.toLowerCase() === "null" || valStr.toLowerCase() === "undefined") {
      continue;
    }

    const key = rawKey.trim();
    const norm = normalizeKey(key);

    // 1. Ignored System Metadata & File references
    if (
      IGNORED_METADATA_KEYS.has(norm) ||
      norm.includes("inboxurl") ||
      norm.includes("threadurl") ||
      norm.includes("filename") ||
      norm.includes("file_name") ||
      norm === "file" ||
      norm.endsWith("file") ||
      norm.includes("sheet") ||
      /\.(xls|xlsx|csv|tsv)$/i.test(valStr)
    ) {
      continue;
    }

    // 2. Name matching
    if (
      norm === "fullname" ||
      norm === "name" ||
      norm === "clientname" ||
      norm === "customername" ||
      norm === "leadname" ||
      norm === "contactname" ||
      norm === "studentname" ||
      norm === "candidatename" ||
      norm === "candidate" ||
      norm === "student" ||
      norm === "yourname" ||
      norm === "applicantname" ||
      norm === "personname"
    ) {
      if (!nameVal) nameVal = valStr;
      continue;
    }
    if (norm === "firstname" || norm === "fname") {
      firstNameVal = valStr;
      continue;
    }
    if (norm === "lastname" || norm === "lname") {
      lastNameVal = valStr;
      continue;
    }

    // 3. Phone matching
    if (
      norm === "whatsappnumber" ||
      norm === "whatsapp" ||
      norm === "phone" ||
      norm === "phonenumber" ||
      norm === "mobile" ||
      norm === "mobilenumber" ||
      norm === "mobileno" ||
      norm === "phoneno" ||
      norm === "contact" ||
      norm === "contactno" ||
      norm === "contactnumber" ||
      norm === "number" ||
      norm === "tel"
    ) {
      if (!phoneVal) phoneVal = valStr;
      continue;
    }

    // 4. Email matching
    if (
      norm === "email" ||
      norm === "emailaddress" ||
      norm === "emailid" ||
      norm === "mail"
    ) {
      if (!emailVal) emailVal = valStr;
      continue;
    }

    // 5. Platform matching
    if (
      norm === "platform" ||
      norm === "source" ||
      norm === "channel" ||
      norm === "sourceplatform" ||
      norm === "adplatform" ||
      norm === "social"
    ) {
      if (!platformVal) platformVal = valStr;
      continue;
    }

    // 6. Campaign & Ad details
    if (norm === "campaignname" || norm === "campaign") {
      campaignVal = valStr;
      continue;
    }
    if (norm === "adsetname" || norm === "adset") {
      adsetVal = valStr;
      continue;
    }
    if (norm === "adname" || norm === "ad") {
      adVal = valStr;
      continue;
    }
    if (norm === "formname") {
      formNameVal = valStr;
      continue;
    }

    // 7. Explicit "Form Answers" or "Customer Form Answers" column
    if (
      norm === "customerformanswers" ||
      norm === "formanswers" ||
      norm === "formnotes" ||
      norm === "questionsanswers" ||
      norm === "qanda" ||
      norm === "answers" ||
      norm === "formanswers:"
    ) {
      explicitAnswersList.push(valStr);
      continue;
    }

    // 8. Location: State & City
    if (norm === "state" || norm === "region" || norm === "province" || norm === "currentstate") {
      stateVal = valStr;
      continue;
    }
    if (norm === "city" || norm === "location" || norm === "town" || norm === "district" || norm === "currentcity") {
      cityVal = valStr;
      continue;
    }

    // 9. NEET Status / Score
    if (
      norm.includes("neet") ||
      norm === "whatisyourneetscore" ||
      norm === "whatisyourneetscore?" ||
      norm === "whatisyourneetstatus" ||
      norm === "whatisyourneetstatus?" ||
      norm === "areyouneetqualified" ||
      norm === "areyouneetqualified?"
    ) {
      const ansFormatted = formatAnswerValue(valStr);
      if (ansFormatted === "Yes") neetVal = "Qualified (Yes)";
      else if (ansFormatted.toLowerCase().includes("appearing")) neetVal = ansFormatted;
      else if (ansFormatted === "No") neetVal = "Not Qualified";
      else neetVal = ansFormatted;
      // Also add to custom questions so the full question text is preserved in form answers
      customQuestions.push({
        key: norm,
        question: formatQuestionTitle(key),
        answer: ansFormatted,
      });
      continue;
    }

    // 10. Preferred Country
    if (
      norm === "preferredcountry" ||
      norm === "countrypreference" ||
      norm === "whichcountrydoyouprefer" ||
      norm === "whichcountrydoyouprefer?" ||
      norm === "preferreddestination" ||
      norm === "targetcountry" ||
      norm === "destination"
    ) {
      countryVal = formatAnswerValue(valStr);
      continue;
    }

    // 11. Custom Form Questions / Answers (Any other column!)
    const formattedTitle = formatQuestionTitle(key);
    customQuestions.push({
      key: norm,
      question: formattedTitle,
      answer: formatAnswerValue(valStr),
    });
  }

  // Combine first and last name if full name was not provided
  if (!nameVal && (firstNameVal || lastNameVal)) {
    nameVal = `${firstNameVal} ${lastNameVal}`.trim();
  }

  // Positional fallback for column-less or unheadered rows
  if (!nameVal && !phoneVal && Object.keys(row).length > 0) {
    const values = Object.values(row).map((v) => String(v ?? "").trim()).filter(Boolean);
    if (values.length >= 3) {
      platformVal = values[0];
      nameVal = values[1];
      phoneVal = values[2];
    } else if (values.length === 2) {
      nameVal = values[0];
      phoneVal = values[1];
    }
  }

  if (!nameVal && !phoneVal) {
    return null;
  }

  // Deduce State and Country from AdSet / Campaign / Ad if not explicitly given
  if (!stateVal) {
    stateVal = detectIndianState(`${adsetVal} ${cityVal} ${campaignVal}`);
  }
  if (!countryVal) {
    countryVal = detectCountry(`${campaignVal} ${adsetVal} ${adVal} ${formNameVal}`);
  }

  // Normalize phone & platform
  const { clean, raw } = cleanPhoneNumber(phoneVal);
  const { platform, channel } = normalizePlatform(platformVal);

  // ── Build Customer Form Answers (formNotes) ─────────────────────────────
  const formNotesLines: string[] = [];
  const addedQuestions = new Set<string>();

  if (stateVal) {
    formNotesLines.push(`• State: ${stateVal}`);
    addedQuestions.add("state");
  }
  if (cityVal) {
    formNotesLines.push(`• City: ${cityVal}`);
    addedQuestions.add("city");
  }
  if (countryVal) {
    formNotesLines.push(`• Preferred Country: ${countryVal}`);
    addedQuestions.add("preferredcountry");
    addedQuestions.add("country");
  }
  if (neetVal) {
    formNotesLines.push(`• NEET Status: ${neetVal}`);
    addedQuestions.add("neet");
    addedQuestions.add("neetstatus");
    addedQuestions.add("neetscore");
  }

  // Append custom form questions
  for (const item of customQuestions) {
    if (addedQuestions.has(item.key)) continue;
    addedQuestions.add(item.key);

    const qDisplay = item.question.endsWith("?") ? item.question : `${item.question}`;
    formNotesLines.push(`• ${qDisplay}: ${item.answer}`);
  }

  // Append explicit answers block if present
  for (const exp of explicitAnswersList) {
    const subLines = exp.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    for (const sub of subLines) {
      const cleanSub = sub.replace(/^[•\s*-]+/, "").trim();
      if (cleanSub) {
        formNotesLines.push(`• ${cleanSub}`);
      }
    }
  }

  const formNotes = formNotesLines.join("\n");

  // Construct notes (campaign, adset, ad, form - never mention file names)
  const notesParts: string[] = [];
  if (campaignVal) notesParts.push(`Campaign: ${campaignVal}`);
  if (adsetVal) notesParts.push(`AdSet: ${adsetVal}`);
  if (adVal) notesParts.push(`Ad: ${adVal}`);
  if (formNameVal) notesParts.push(`Form: ${formNameVal}`);
  if (notesParts.length === 0) {
    notesParts.push(`Imported via Platform: ${platform.toUpperCase()}`);
  }
  const notes = notesParts.join(" · ");

  return {
    name: nameVal || "Unnamed Lead",
    phone: clean || raw || "—",
    rawPhone: raw,
    platform: platform || "fb",
    channel,
    email: emailVal || undefined,
    city: cityVal || undefined,
    state: stateVal || undefined,
    neetStatus: neetVal || undefined,
    preferredCountry: countryVal || undefined,
    formNotes: formNotes || undefined,
    notes,
    fileName: fileName || undefined,
  };
}
