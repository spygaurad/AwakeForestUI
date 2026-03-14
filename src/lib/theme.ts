// lib/theme.ts
export const theme = {
  coffeeBean: '#7f5539',
  camel: '#a68a64',
  almondCream: '#ede0d4',
  dustyOlive: '#656d4a',
  ebony: '#414833',

  // Semantic aliases
  primary: '#7f5539',
  secondary: '#a68a64',
  accent: '#ede0d4',
  success: '#656d4a',
  danger: '#b35e4c', // warm brick red (new)
  warning: '#a68a64',
  info: '#7f5539',
} as const;

export type ThemeColor = keyof typeof theme;