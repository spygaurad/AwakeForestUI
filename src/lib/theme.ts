// lib/theme.ts — Autumn forest palette
// These hex values are the canonical brand colors; CSS vars in globals.css
// express the same values as oklch() for perceptual uniformity.

export const theme = {
  // ── Raw palette ──────────────────────────────────────────────────────
  coffeeBean:   '#7f5539',  // burnt sienna   — primary brand action
  camel:        '#a68a64',  // warm amber      — secondary / muted
  almondCream:  '#ede0d4',  // parchment cream — accent / light fills
  dustyOlive:   '#656d4a',  // sage green      — success / CTA alternate
  ebony:        '#414833',  // deep forest     — sidebar, dark sections
  parchment:    '#f5ede0',  // warm white      — page background

  // ── Semantic aliases ─────────────────────────────────────────────────
  primary:     '#7f5539',  // coffee-bean sienna
  secondary:   '#a68a64',  // camel amber
  accent:      '#ede0d4',  // almond-cream parchment
  success:     '#656d4a',  // dusty-olive sage
  danger:      '#b35e4c',  // warm terracotta red
  warning:     '#c4985c',  // harvest gold
  info:        '#a68a64',  // camel

  // ── Map editor dark nav palette ───────────────────────────────────────
  // Used exclusively by the map editor's top nav and status bar.
  // Darker than `ebony` to contrast with the forest map canvas.
  mapNavBg:      '#242c20',  // dark forest green nav / status bar
  mapNavBorder:  '#1a2118',  // darkest border on dark surfaces
  mapNavText:    '#e8d8bc',  // parchment text on dark nav
  mapNavMuted:   '#b8c4a4',  // muted text on dark nav
  mapLoadBg:     '#1c2119',  // loading screen background
  mapRingMid:    '#3d4535',  // mid ring in map loading animation

  // ── Map editor panel palette (warm cream panels) ──────────────────────
  // Panels float above the map canvas using slightly warm cream tones.
  mapPanelBg:    '#f5efe4',  // warm cream panel (slightly warmer than parchment)
  mapPanelBorder:'#d0c0a0',  // warm tan panel border
  mapText:       '#2e3428',  // dark forest text on light panels
  mapTextSec:    '#4e4137',  // warm mid-brown secondary text (~4.8:1 on panel bg)
  mapTextMuted:  '#6e5f50',  // warm brown tertiary text (~4.5:1 on panel bg)
  mapLabel:      '#5e5044',  // section label text (~4.6:1 on panel bg)
  mapStatusText: '#c8b898',  // muted parchment on status bar
  mapBorder:     '#d8c9b0',  // general panel border
  mapInputBg:    '#faf5ef',  // input field background
  mapInputBorder:'#d0bfa6',  // input field border
  mapInfo:       '#4a7ea8',  // info sky blue (alerts / info badges)

  // ── Clerk appearance ─────────────────────────────────────────────────
  // Use `theme.primary` as `colorPrimary` in ClerkProvider appearance.
} as const;

export type ThemeColor = keyof typeof theme;
