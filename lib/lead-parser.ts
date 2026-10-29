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
 * Normalizes a header or key: lowercases, strips BOM, and strips all punctuation/symbols except '?'.
 * Handles cases like "Full Name *", "Phone Number (WhatsApp)", "Contact No.", etc.
 */
export function normalizeKey(key: string): string {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[^a-z0-9?]/g, "");
}

/**
 * Normalizes a phone number to standard 10 digits for Indian numbers, or clean digits.
 * If the cleaned digits are fewer than 7 digits, it returns an empty string for `clean`
 * to avoid matching short/invalid strings as duplicate phone numbers.
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
  if (clean.length < 7) {
    clean = "";
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
 * Automatically decodes raw byte arrays (Uint8Array) of text files,
 * supporting UTF-16LE (Meta Ads export format), UTF-16BE, UTF-8 with BOM, and standard UTF-8.
 */
export function decodeTextBytes(u8: Uint8Array): string {
  if (u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(u8.subarray(2));
  }
  if (u8.length >= 2 && u8[0] === 0xfe && u8[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(u8.subarray(2));
  }
  if (u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(u8.subarray(3));
  }
  // Check if UTF-16LE without BOM (every alternate byte is 0x00 for ASCII text)
  if (u8.length >= 4 && u8[1] === 0x00 && u8[3] === 0x00) {
    return new TextDecoder("utf-16le").decode(u8);
  }
  return new TextDecoder("utf-8").decode(u8);
}

/**
 * Robust CSV parser that parses raw CSV/TSV text into an array of row objects.
 * Automatically detects comma, semicolon, or tab delimiters.
 * Properly handles quotes, escaped quotes (""), and multiline fields within quotes.
 */
export function parseCsvToRows(csvText: string): Record<string, any>[] {
  const cleanText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return [];

  const firstLine = cleanText.split(/\r\n|\n|\r/)[0] || "";
  let delimiter = ",";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ";";
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = "\t";

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++; // handle CRLF
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, "").trim());
  const dataRows: Record<string, any>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const rowVals = rows[r];
    const obj: Record<string, any> = {};
    let hasVal = false;
    headers.forEach((h, idx) => {
      let val = rowVals[idx] ?? "";
      if (typeof val === "string") val = val.replace(/^["']|["']$/g, "").trim();
      obj[h] = val;
      if (val) hasVal = true;
    });
    if (hasVal) {
      dataRows.push(obj);
    }
  }

  return dataRows;
}

/**
 * Formats a raw column header into a human-readable question title.
 * e.g., "what_is_your_neet_score?" -> "What is your neet score?"
 *       "preferred_country" -> "Preferred Country"
 */
export function formatQuestionTitle(header: string): string {
  let cleaned = header
    .replace(/^\uFEFF/, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[_]+/g, " ")
    .replace(/[:*]+$/, "")
    .trim();

  if (!cleaned) return "Question";

  const words = cleaned.split(/\s+/);
  const formattedWords = words.map((w, idx) => {
    if (w.length > 1 && w === w.toUpperCase() && /^[A-Z0-9]+$/.test(w)) {
      return w;
    }
    const lower = w.toLowerCase();
    if (idx === 0) {
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
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

  // Handle single-column merged CSV rows where delimiter wasn't split by external reader
  const initialKeys = Object.keys(row);
  if (initialKeys.length === 1) {
    const singleKey = initialKeys[0];
    const singleVal = String(row[singleKey] ?? "");
    let delimiter = "";
    if (singleKey.includes(";")) delimiter = ";";
    else if (singleKey.includes("\t")) delimiter = "\t";
    else if (singleKey.includes(",")) delimiter = ",";

    if (delimiter) {
      const splitKeys = singleKey.split(delimiter).map((k) => k.replace(/^["']|["']$/g, "").trim());
      const splitVals = singleVal.split(delimiter).map((v) => v.replace(/^["']|["']$/g, "").trim());
      const newRow: Record<string, any> = {};
      splitKeys.forEach((k, idx) => {
        newRow[k] = splitVals[idx] ?? "";
      });
      return extractLeadFromRow(newRow, fileName);
    }
  }

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
      norm === "personname" ||
      norm === "username" ||
      norm === "nameofstudent" ||
      norm === "nameofcandidate" ||
      norm === "candidatesname" ||
      norm === "studentsname" ||
      norm === "nameasperpassport" ||
      norm === "nameasperaadhar" ||
      norm === "firstandlastname" ||
      norm.endsWith("studentname") ||
      norm.endsWith("candidatename") ||
      norm.endsWith("fullname")
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
      norm === "phno" ||
      norm === "contact" ||
      norm === "contactno" ||
      norm === "contactnumber" ||
      norm === "number" ||
      norm === "tel" ||
      norm === "telephone" ||
      norm === "telephonenumber" ||
      norm === "whatsappno" ||
      norm === "whatsappnum" ||
      norm === "phonenum" ||
      norm === "mobilenum" ||
      norm === "contactnum" ||
      norm === "phonenumberwhatsapp" ||
      norm === "whatsappphonenumber" ||
      norm === "cell" ||
      norm === "cellphone" ||
      norm === "cellnumber" ||
      norm === "primaryphone" ||
      norm === "studentphone" ||
      norm === "candidatephone" ||
      norm.includes("phone") ||
      norm.includes("mobile") ||
      norm.includes("whatsapp") ||
      norm.includes("contactno")
    ) {
      if (!phoneVal) phoneVal = valStr;
      continue;
    }

    // 4. Email matching
    if (
      norm === "email" ||
      norm === "emailaddress" ||
      norm === "emailid" ||
      norm === "mail" ||
      norm === "studentemail" ||
      norm === "candidateemail" ||
      norm === "primaryemail" ||
      norm.includes("email")
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

  // Positional / content fallback if headers did not match standard labels
  if (!nameVal && !phoneVal && Object.keys(row).length > 0) {
    const entries = Object.entries(row);
    for (const [, v] of entries) {
      const val = String(v ?? "").trim();
      if (!val) continue;
      const { clean } = cleanPhoneNumber(val);
      if (clean && clean.length >= 7 && !phoneVal) {
        phoneVal = val;
      } else if (!emailVal && val.includes("@") && val.includes(".")) {
        emailVal = val;
      } else if (!nameVal && !val.includes("@") && !/\d{6,}/.test(val)) {
        nameVal = val;
      }
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
