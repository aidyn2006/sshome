// Sanctum design tokens — cool neutrals + blue accent
export const colors = {
  // Neutrals scale
  ink900: "#0B0D12",
  ink800: "#14171D",
  ink700: "#262A33",
  ink600: "#3D424D",
  ink500: "#5B616D",
  ink400: "#8B8F99",
  ink300: "#B7BAC2",
  ink200: "#DCDEE3",
  ink100: "#EAECEF",
  ink50:  "#F4F5F7",

  cream50:  "#FAFBFC",
  cream100: "#F2F4F7",
  cream200: "#E7EAEF",
  surface:  "#FFFFFF",

  // Hairline borders
  hairline:       "rgba(11, 13, 18, 0.08)",
  hairlineStrong: "rgba(11, 13, 18, 0.16)",
  hairlineSoft:   "rgba(11, 13, 18, 0.04)",

  // Accent — assuring blue
  accent:           "#2563EB",
  accentHover:      "#1D4FCE",
  accentSoft:       "#6E8EF5",
  accentTint:       "rgba(37, 99, 235, 0.10)",
  accentTintStrong: "rgba(37, 99, 235, 0.18)",
  onAccent:         "#FFFFFF",

  // Semantic
  success:     "#058E5A",
  successSoft: "rgba(5, 142, 90, 0.10)",
  danger:      "#C7253E",
  dangerSoft:  "rgba(199, 37, 62, 0.10)",
  info:        "#2563EB",
  infoSoft:    "rgba(37, 99, 235, 0.10)",
  warn:        "#B45309",
  warnSoft:    "rgba(180, 83, 9, 0.10)",

  // Legacy aliases (keep backward compat)
  background:    "#F4F5F7",
  card:          "#FFFFFF",
  accentBlue:    "#2563EB",
  accentPurple:  "#4E83F2",
  activeGreen:   "#058E5A",
  inactiveGray:  "#DCDEE3",
  textPrimary:   "#0B0D12",
  textSecondary: "#5B616D",
  textOnAccent:  "#FFFFFF",
  border:        "rgba(11, 13, 18, 0.10)",
  amber:         "#B45309",
  teal:          "#0F766E",
  red:           "#C7253E",
} as const;

export const gradients = {
  accent:    ["#2563EB", "#4E83F2"] as const,
  roomCard:  ["#FFFFFF", "#F2F4F7"] as const,
  toggleOn:  ["rgba(37,99,235,0.08)", "rgba(37,99,235,0.14)"] as const,
  avatar:    ["#14171D", "#262A33"] as const,
  heroLight: ["#F2F4F7", "#FAFBFC"] as const,
} as const;
