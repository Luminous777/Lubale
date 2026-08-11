// Design tokens — minimal & clean direction.
// Near-black ink for primary actions, a single refined blue accent for
// brand/interactive states, soft neutrals, hairline borders, subtle shadows.

export const colors = {
  // Surfaces
  background: "#F6F7F9", // app canvas
  surface: "#FFFFFF", // cards, inputs
  surfaceMuted: "#F1F3F5", // subtle fills

  // Text
  ink: "#111827", // primary text & primary buttons
  muted: "#6B7280", // secondary text
  faint: "#9CA3AF", // tertiary text, placeholders

  // Lines
  border: "#E8EAED", // hairline borders
  borderStrong: "#D6D9DE",

  // Brand accent (blue)
  accent: "#2563EB",
  accentSoft: "#EEF3FF",

  // Pro (violet)
  pro: "#7C3AED",
  proSoft: "#F5F3FF",
  proBorder: "#E9D5FF",

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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  soft: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
