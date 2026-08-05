export const FLAG_OPTIONS = [
  { code: "pl", label: "Poland" },
  { code: "us", label: "United States" },
  { code: "jp", label: "Japan" },
  { code: "kr", label: "South Korea" },
  { code: "cn", label: "China" },
  { code: "gb", label: "United Kingdom" },
  { code: "br", label: "Brazil" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "es", label: "Spain" },
  { code: "au", label: "Australia" },
  { code: "ca", label: "Canada" },
  { code: "mx", label: "Mexico" },
  { code: "nl", label: "Netherlands" },
  { code: "se", label: "Sweden" },
  { code: "no", label: "Norway" },
  { code: "fi", label: "Finland" },
  { code: "ru", label: "Russia" },
  { code: "it", label: "Italy" },
  { code: "ph", label: "Philippines" },
] as const;

export type FlagCode = (typeof FLAG_OPTIONS)[number]["code"];
