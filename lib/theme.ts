// Design tokens — Lubela brand system
//
// Tipografía:
//   Display / wordmark / nombres / números grandes → Cormorant Garamond (serif)
//   Interfaz / botones / labels / datos / nav      → Jost (sans geométrica)
//   Labels chicos: Jost uppercase + letter-spacing 0.16–0.20em
//
// Paleta:
//   Marino   #13263F  — botones, íconos, nav, texto primario
//   Blanco   #FFFFFF  — superficies (cards, inputs, sheets)
//   Hueso    #F3F1EC  — fondo del canvas
//   + neutrales con tinte frío-cálido según superficie

export const colors = {
  // Surfaces
  background: "#F3F1EC", // hueso — canvas de la app
  surface: "#FFFFFF",    // tarjetas, inputs, sheets
  surfaceMuted: "#EAE7E0", // fills suaves sobre hueso

  // Text
  ink: "#13263F",         // texto primario (marino)
  muted: "#647289",       // texto secundario — gris con tinte marino
  faint: "#9AA5B8",       // placeholders y terciario

  // Lines
  border: "#E0DDD6",      // borde cálido (combina con hueso)
  borderStrong: "#C8C4BC",

  // Brand accent — marino
  accent: "#13263F",
  accentSoft: "#E8EBF2",  // tinte marino muy suave

  // Pro (gold premium)
  pro: "#B7791F",
  proSoft: "#FBF3E1",
  proBorder: "#F0DFB0",

  // Feedback
  success: "#059669",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FCA5A5",

  // On-color
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

// Subtle, single-direction elevation.
export const shadow = {
  card: {
    shadowColor: "#13263F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  soft: {
    shadowColor: "#13263F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
