// Design tokens — minimal & clean direction, matched to the web app.
// Violet brand accent for primary actions & interactive/selected states,
// dark ink reserved for text & the QR, soft neutrals, hairline borders.

export const colors = {
  // Surfaces
  background: "#F6F6FB", // app canvas
  surface: "#FFFFFF", // cards, inputs
  surfaceMuted: "#F1F0F8", // subtle fills

  // Text
  ink: "#1B1A2E", // primary text & the QR (kept dark for contrast)
  muted: "#7B7B90", // secondary text
  faint: "#A0A0B4", // tertiary text, placeholders

  // Lines
  border: "#E7E6F0", // hairline borders
  borderStrong: "#D6D4E4",

  // Brand accent (violet) — primary buttons & selected states
  accent: "#6D5EF6",
  accentSoft: "#EFEDFE",

  // Pro (premium gold) — distinct from the violet brand accent
  pro: "#B7791F",
  proSoft: "#FBF3E1",
  proBorder: "#F0DFB0",

  // Feedback
  success: "#059669",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FCA5A5",

  // On-color text
  onInk: "#FFFFFF",
  onAccent: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const font = {
  // sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  "2xl": 26,
  // weights
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

// Subtle, single-direction elevation. Kept restrained for the minimal look.
export const shadow = {
  card: {
    shadowColor: "#14142B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  soft: {
    shadowColor: "#14142B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
