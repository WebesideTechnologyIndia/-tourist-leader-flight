// Insurance enquiry options.
export const INSURANCE_TYPES = [
  { id: "TRAVEL", label: "Travel" },
  { id: "MOTOR", label: "Motor" },
  { id: "HOUSE", label: "House" },
  { id: "LIFE", label: "Life" },
];

export const CITIZENSHIP = ["Indian", "NRI / Other"];
export const VEHICLE_TYPES = ["Two Wheeler", "Four Wheeler", "Commercial Vehicle"];
export const PROPERTY_KIND = ["Apartment / Flat", "Independent House", "Villa", "Other"];

export const INSURANCE_STATUSES = ["NEW", "CONTACTED", "QUOTED", "ISSUED", "CLOSED"];

export const INSURANCE_TYPE_LABEL: Record<string, string> = {
  TRAVEL: "Travel Insurance",
  MOTOR: "Motor Insurance",
  HOUSE: "House Insurance",
  LIFE: "Life Insurance",
};
