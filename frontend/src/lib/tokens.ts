// JS mirror of src/styles/tokens.css — keep these two files in lockstep.
// Use these constants anywhere a JS value is needed (e.g. Recharts `fill` props)
// instead of writing a hex literal a second time.

export const colors = {
  navyDark: '#0D1B2A',
  navyMid: '#1A2744',
  cyanPrimary: '#00B4D8',
  cyanPrimaryHover: '#0099BB',
  cyanLight: '#90E0EF',
  cyanPale: '#CAF0F8',
  white: '#FFFFFF',
  offWhite: '#F8F9FA',
  lightGray: '#F1F3F5',
  midGray: '#CED4DA',
  darkGray: '#495057',
  black: '#212529',
  timestampGray: '#6C757D',

  critical: '#E63946',
  criticalBg: '#FDECEC',
  high: '#F4A261',
  highBg: '#FEF3E2',
  medium: '#3A86FF',
  mediumBg: '#EBF3FF',
  resolved: '#2DC653',
  resolvedBg: '#E9F7EF',

  purple: '#7B2FBE',
  purpleLight: '#F3E8FF',
} as const;

// Exceptions-by-source horizontal bar colours (COLOUR_SPEC B5)
export const sourceColors: Record<string, string> = {
  Axon: colors.cyanPrimary,
  Helion: colors.purple,
  Anaplan: colors.high,
  Binocs: colors.medium,
  SAP: colors.navyMid,
  Manual: colors.midGray,
};

export function responseTimeColor(hours: number): string {
  if (hours < 4) return colors.resolved;
  if (hours <= 8) return colors.high;
  return colors.critical;
}
