// Travel-agent registration config.

export const AGENT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

// Documents requested at registration. `required` ones must be uploaded to submit.
export const AGENT_DOCS: { key: string; label: string; required: boolean }[] = [
  { key: "pan", label: "PAN Card", required: true },
  { key: "gst", label: "GST Certificate", required: false },
  { key: "id_proof", label: "ID Proof (Aadhaar / Passport / DL)", required: true },
  { key: "address_proof", label: "Address Proof", required: false },
  { key: "agency_proof", label: "Agency / Business Proof", required: false },
  { key: "photo", label: "Photograph", required: false },
];

// Shown to rejected applicants so they can reach the team.
export const TL_CONTACT = {
  email: "help@touristleader.com",
  phone: "+91 9987-495-897",
};

export interface AgentDoc { label: string; url: string }

export const AGENT_DETAIL_FIELDS: { key: string; label: string; type?: string }[] = [
  { key: "fullName", label: "Full name" },
  { key: "agencyName", label: "Agency / company name" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "address", label: "Address" },
  { key: "gstNumber", label: "GST number" },
  { key: "panNumber", label: "PAN number" },
  { key: "experience", label: "Years in travel business" },
];
