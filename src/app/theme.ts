export const colors = {
  bg: '#fef9f2',
  text: '#2d2d33',
  accentBlue: '#5b8def',
  accentGreen: '#7cc36a',
  accentOrange: '#e89a4f',
} as const

export const radii = {
  kid: 16,
} as const

export const tapTargets = {
  minSize: 60,
  minMargin: 16,
} as const

export type ThemeColors = typeof colors
