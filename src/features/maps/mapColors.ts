/**
 * Map editor UI palette — single source of truth.
 *
 * All raw hex values live in `lib/theme.ts`. This file derives
 * semantic aliases (MC.*) for use in map editor components. Because
 * Leaflet's API requires runtime color strings, these cannot be
 * Tailwind classes — they must stay as JS constants.
 *
 * Mixed palette: dark forest nav (from workspace dark palette) + warm cream
 * panels. Golden amber accent works on both dark and light surfaces.
 */

import { theme } from '@/lib/theme';

/** Compute rgba(r,g,b,a) from a hex color + alpha */
function a(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const MC = {
  // ── Dark nav + status bar (matches workspace palette: ProjectsContent) ───
  navBg:         theme.mapNavBg,
  navBorder:     theme.mapNavBorder,
  navText:       theme.mapNavText,
  navTextMuted:  theme.mapNavMuted,
  navAccent:     theme.warning,
  navActiveBtn:  a(theme.warning, 0.18),

  // ── Panel backgrounds (warm cream — float above map) ─────────────────────
  panelBg:     a(theme.mapPanelBg, 0.97),
  panelBorder: theme.mapPanelBorder,

  // ── Status bar ────────────────────────────────────────────────────────────
  statusBg:     theme.mapNavBg,
  statusBorder: theme.mapNavBorder,
  statusText:   theme.mapStatusText,

  // ── General borders ───────────────────────────────────────────────────────
  border:      theme.mapBorder,
  borderLight: theme.almondCream,

  // ── Panel text (dark text on light panel bg) ──────────────────────────────
  text:          theme.mapText,
  textSecondary: theme.mapTextSec,
  textMuted:     theme.mapTextMuted,
  sectionLabel:  theme.mapLabel,

  // ── Accent — golden amber (visible on BOTH dark nav + light panels) ───────
  accent:      theme.warning,
  accentDim:   a(theme.warning, 0.12),
  accentHover: a(theme.warning, 0.20),

  // ── Interactive states ────────────────────────────────────────────────────
  hoverBg:     theme.almondCream,
  inputBg:     theme.mapInputBg,
  inputBorder: theme.mapInputBorder,

  // ── Semantic / data colors ────────────────────────────────────────────────
  success: theme.dustyOlive,
  warning: theme.warning,
  danger:  theme.danger,
  info:    theme.mapInfo,

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadow:   `0 2px 16px ${a(theme.mapNavBg, 0.20)}`,
  shadowMd: `0 4px 24px ${a(theme.mapNavBg, 0.26)}`,
  shadowLg: `0 8px 40px ${a(theme.mapNavBg, 0.34)}`,

  // ── Loading shell (dark — shown before map canvas renders) ───────────────
  loadBg:    theme.mapLoadBg,
  loadText:  a(theme.almondCream, 0.55),
  loadRings: [theme.warning, theme.mapRingMid, theme.mapText] as const,
} as const;

// ── Z-index stacking contract ─────────────────────────────────────────────────
// Single source of truth for all map editor z-index values.
// These are mirrored as CSS custom properties in globals.css for reference.
export const MAP_Z = {
  root:           50,   // shell covers workspace sidebar layout
  canvas:          1,   // Leaflet stacking context (internal z: 200–800)
  panel:         200,   // side panels (Left, Right)
  libraryBackdrop: 240, // library panel backdrop
  library:       250,   // library panel itself
  overlay:       350,   // measurement overlay
  scale:         400,   // scale bar
  dropdown:      500,   // basemap / layer dropdowns
  menu:          600,   // tool menus (annotate dropdown)
} as const;

// ── Semantic data color maps ──────────────────────────────────────────────────
// Aligned to brand semantic colors. Components should import from here
// rather than defining local color records.

/** Tracked object priority → fill color (uses brand semantic palette). */
export const PRIORITY_COLORS: Record<string, string> = {
  critical: MC.danger,   // terracotta — highest urgency
  high:     MC.warning,  // golden amber — elevated urgency
  low:      MC.success,  // dusty olive — low urgency
  // 'medium' intentionally absent — components fall back to layer style.color
};

/** Alert status → marker color (uses brand semantic palette). */
export const ALERT_STATUS_COLORS: Record<string, string> = {
  open:         MC.danger,   // terracotta — requires action
  acknowledged: MC.warning,  // golden amber — in progress
  resolved:     MC.success,  // dusty olive — complete
};
