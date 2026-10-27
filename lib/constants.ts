export const COUNTRY_OPTIONS = [
  "Russia",
  "China",
  "Kazakhstan",
  "Kyrgyzstan",
  "Georgia",
  "Uzbekistan",
  "Nepal",
  "Others",
] as const;
export type CountryOption = (typeof COUNTRY_OPTIONS)[number];

export const COUNTRIES = COUNTRY_OPTIONS;
export const SERVICES = COUNTRY_OPTIONS;
export type Service = CountryOption;

export const STAGES = [
  "Initial Contact",
  "Connected",
  "Interested",
  "Proposal",
  "Registration",
  "Admission Letter",
  "2nd Payment",
  "OTC",
  "Invitation",
  "3rd Payment",
  "Visa Process",
] as const;
export type Stage = (typeof STAGES)[number];

export const LEGACY_STAGES = [
  "Filtered",
  "Initial",
  "Cold Stage",
  "Hot Stage",
  "Interview",
  "Document",
  "Visa Payment",
  "VFS",
  "Fee Deposit",
  "Visa Success",
  "Confirmed",
  "Closed",
  "Shiksha",
] as const;
export type LegacyStage = (typeof LEGACY_STAGES)[number];

export const ALL_VALID_STAGES = [...STAGES, ...LEGACY_STAGES] as const;

export function normalizeStage(stage: string | null | undefined): Stage {
  if (!stage) return "Initial Contact";
  const trimmed = stage.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "initial" || lower === "initial contact" || lower === "shiksha") return "Initial Contact";
  if (lower === "connected") return "Connected";
  if (lower === "interested") return "Interested";
  if (lower === "proposal" || lower === "hot" || lower === "hot stage") return "Proposal";
  if (lower === "registration") return "Registration";
  if (lower === "admission letter" || lower === "admission") return "Admission Letter";
  if (lower === "2nd payment" || lower === "second payment" || lower === "visa payment") return "2nd Payment";
  if (lower === "otc") return "OTC";
  if (lower === "invitation") return "Invitation";
  if (lower === "3rd payment" || lower === "third payment" || lower === "fee deposit") return "3rd Payment";
  if (lower === "visa process" || lower === "visa success" || lower === "confirmed" || lower === "visa" || lower === "vfs") return "Visa Process";

  const match = STAGES.find((s) => s.toLowerCase() === lower);
  if (match) return match;

  return "Initial Contact";
}

export const STAGE_LABELS: Record<Stage, string> = {
  "Initial Contact": "INITIAL CONTACT",
  "Connected": "CONNECTED",
  "Interested": "INTERESTED",
  "Proposal": "PROPOSAL",
  "Registration": "REGISTRATION",
  "Admission Letter": "ADMISSION LETTER",
  "2nd Payment": "2ND PAYMENT",
  "OTC": "OTC",
  "Invitation": "INVITATION",
  "3rd Payment": "3RD PAYMENT",
  "Visa Process": "VISA PROCESS",
};

export type StageMetaConfig = {
  dot: string;
  bar: string;
  badge: string;
  text: string;
  border: string;
  lineColor: string;
};

export const STAGE_META: Record<Stage, StageMetaConfig> = {
  "Initial Contact": {
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    text: "text-blue-600",
    border: "border-blue-400",
    lineColor: "bg-sky-400 border-dashed",
  },
  "Connected": {
    dot: "bg-amber-400",
    bar: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-600",
    border: "border-amber-400",
    lineColor: "bg-yellow-300",
  },
  "Interested": {
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    text: "text-sky-600",
    border: "border-sky-400",
    lineColor: "bg-sky-400",
  },
  "Proposal": {
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-600",
    border: "border-amber-400",
    lineColor: "bg-amber-400",
  },
  "Registration": {
    dot: "bg-rose-400",
    bar: "bg-rose-400",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-600",
    border: "border-rose-400",
    lineColor: "bg-rose-300",
  },
  "Admission Letter": {
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    text: "text-sky-600",
    border: "border-sky-400",
    lineColor: "bg-sky-400",
  },
  "2nd Payment": {
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    text: "text-sky-600",
    border: "border-sky-400",
    lineColor: "bg-sky-400",
  },
  "OTC": {
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    text: "text-sky-600",
    border: "border-sky-400",
    lineColor: "bg-sky-400",
  },
  "Invitation": {
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    text: "text-sky-600",
    border: "border-sky-400",
    lineColor: "bg-sky-400",
  },
  "3rd Payment": {
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    text: "text-sky-600",
    border: "border-sky-400",
    lineColor: "bg-sky-400",
  },
  "Visa Process": {
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    text: "text-sky-600",
    border: "border-sky-400",
    lineColor: "bg-sky-400",
  },
};

export const CHANNELS = [
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Ads",
  "Meta Ads",
  "Google Sheets",
  "Website",
  "Email",
  "Referral/Others",
] as const;
export type Channel = (typeof CHANNELS)[number];

export const CLIENT_VISIT_STAGES = ["Live", "Disc in progress", "Converted", "Not interested"] as const;
export type ClientVisitStage = (typeof CLIENT_VISIT_STAGES)[number];
export const CLIENT_VISIT_STATUSES = CLIENT_VISIT_STAGES;
export type ClientVisitStatus = ClientVisitStage;

export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", baseRate: 86.50 },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", baseRate: 90.20 },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", baseRate: 108.40 },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦", baseRate: 60.10 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", baseRate: 54.80 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", baseRate: 64.30 },
  { code: "AED", name: "UAE Dirham", symbol: "AED", flag: "🇦🇪", baseRate: 23.55 },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭", baseRate: 2.52 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", baseRate: 0.56 },
] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const LRS_PURPOSES = [
  "Education Abroad (University Fees)",
  "Family Maintenance / Gift",
  "Medical Treatment Abroad",
  "Personal Travel & Tourism",
  "Business Travel & Seminars",
  "Emigration / Settlement",
] as const;

export const COMPLIANCE_LIMITS = {
  CASH_NOTES_USD_CAP: 3000,
  PAY_ON_DELIVERY_INR_CAP: 49999,
  LRS_ANNUAL_USD_CAP: 250000,
} as const;

export const NEET_STATUS_OPTIONS = [
  "",
  "Appeared",
  "Passed",
  "Pending",
  "Not Applicable",
] as const;

// (COUNTRY_OPTIONS is exported at top of file)

export const OPERATING_CITIES = [
  "Delhi NCR",
  "Mumbai",
  "Kolkata",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Ahmedabad",
  "Pune",
  "Chandigarh",
  "Kochi",
] as const;

export const DEFAULT_USER_PASSWORD = "Edufin@2026";

export const BRANCHES = [
  { id: "br-delhi-01", name: "Delhi NCR Branch", city: "Delhi NCR" },
  { id: "br-kolkata-01", name: "Kolkata Branch", city: "Kolkata" },
  { id: "br-mumbai-01", name: "Mumbai Branch", city: "Mumbai" },
] as const;

export type BranchItem = (typeof BRANCHES)[number];
