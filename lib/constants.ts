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

export const CHANNELS = ["WhatsApp", "Instagram", "TikTok", "Email"] as const;
export type Channel = (typeof CHANNELS)[number];
