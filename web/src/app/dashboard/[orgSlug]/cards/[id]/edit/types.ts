export type Layout = 'retrato' | 'franja' | 'editorial' | 'panoramica' | 'monograma' | 'minimal';
export type TypePair = 'clasico' | 'moderno' | 'mixto';
export type PhotoShape = 'circulo' | 'redondo' | 'cuadrado';
export type BgMode = 'ninguno' | 'imagen' | 'marca';
export type LockKey = 'plantilla' | 'colores' | 'tipografia' | 'foto' | 'fondo';

export type Brand = {
  name: string;
  initials: string;
  logoUrl: string | null;
  layout: Layout;
  primary: string;
  secondary: string;
  typePair: TypePair;
  photoShape: PhotoShape;
  locks: Record<LockKey, 'org' | 'member'>;
};

export type CardLink = {
  id: string;
  kind: string;
  title: string;
  url: string;
  enabled: boolean;
};

export type Card = {
  id: string;
  slug: string;
  displayName: string;
  title: string;
  bio: string;
  phone: string;
  emailPublic: string;
  photoUrl: string | null;
  backgroundUrl: string | null;
  layout: Layout | null;
  primary: string | null;
  secondary: string | null;
  typePair: TypePair | null;
  photoShape: PhotoShape | null;
  bgMode: BgMode;
  links: CardLink[];
};

export const LAYOUTS: { key: Layout; label: string; hint: string }[] = [
  { key: 'retrato', label: 'Retrato', hint: 'Foto centrada sobre color. El más versátil.' },
  { key: 'franja', label: 'Franja', hint: 'Banda de marca al costado, datos a la izquierda.' },
  { key: 'editorial', label: 'Editorial', hint: 'Nombre grande en serif sobre papel.' },
  { key: 'panoramica', label: 'Panorámica', hint: 'Foto del local o la obra a sangre.' },
  { key: 'monograma', label: 'Monograma', hint: 'Iniciales grandes, sin foto.' },
  { key: 'minimal', label: 'Mínima', hint: 'Solo tipografía y líneas.' },
];

export const PALETTES = [
  { key: 'marino', label: 'Marino', primary: '#13263F', secondary: '#3C5A80' },
  { key: 'tinta', label: 'Tinta', primary: '#1C1C1A', secondary: '#4A4A44' },
  { key: 'bosque', label: 'Bosque', primary: '#1F3D33', secondary: '#3F7A63' },
  { key: 'borgona', label: 'Borgoña', primary: '#4A1F27', secondary: '#8C4A53' },
  { key: 'arena', label: 'Arena', primary: '#6B5B3E', secondary: '#A08A4B' },
  { key: 'acero', label: 'Acero', primary: '#2C3540', secondary: '#6B7787' },
];

export const CUSTOM_PRIMARIES = ['#13263F','#0E1B2E','#1C1C1A','#1F3D33','#4A1F27','#6B5B3E','#2C3540','#3A2E4A','#12343B','#5A2E1B','#33404A','#402B2B'];
export const CUSTOM_SECONDARIES = ['#3C5A80','#5C7CA6','#4A4A44','#3F7A63','#8C4A53','#A08A4B','#6B7787','#6E5A85','#2E6B75','#96603C','#54626E','#7A5252'];

export const PHOTO_RADIUS: Record<PhotoShape, string> = {
  circulo: '9999px',
  redondo: '16px',
  cuadrado: '3px',
};

export const NAME_FONT: Record<TypePair, string> = {
  clasico: 'var(--font-serif)',
  moderno: 'var(--font-sans)',
  mixto: 'var(--font-serif)',
};

export const BG_APPLIES: Layout[] = ['retrato', 'monograma', 'panoramica'];
