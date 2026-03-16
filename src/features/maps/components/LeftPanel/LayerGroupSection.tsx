'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { MC } from '../../mapColors';

// ── Reduced-motion hook — SSR-safe ─────────────────────────────────────────────
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export interface LayerGroupSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function LayerGroupSection({
  title,
  count,
  children,
  defaultOpen = true,
}: LayerGroupSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();

  // Open: 200ms ease-out-quint (smooth deceleration, content arrives naturally)
  // Close: 150ms ease-in-quart (faster exit — exits are always snappier than entrances)
  // grid-template-rows: 0fr ↔ 1fr is the layout-free collapse technique —
  // avoids the per-frame height recalculation of max-height transitions.
  const collapseTransition = reducedMotion
    ? 'none'
    : open
      ? 'grid-template-rows 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
      : 'grid-template-rows 0.15s cubic-bezier(0.5, 0, 0.75, 0)';

  const chevronTransition = reducedMotion
    ? 'none'
    : 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)';

  const microTransition = reducedMotion ? 'none' : 'background 0.1s, color 0.1s';

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Semantic button — screen readers announce expanded state */}
      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-expanded={open}
        aria-controls={`layer-group-${title}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: 30,
          paddingLeft: 10,
          paddingRight: 8,
          cursor: 'pointer',
          userSelect: 'none',
          background: hovered ? MC.accentDim : 'transparent',
          border: 'none',
          borderRadius: 4,
          transition: microTransition,
          // Reset button defaults
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      >
        <ChevronRight
          size={11}
          style={{
            color: hovered ? MC.accent : MC.textMuted,
            marginRight: 5,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: chevronTransition,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: hovered ? MC.text : MC.sectionLabel,
            textAlign: 'left',
            transition: microTransition,
          }}
        >
          {title}
        </span>
        {count > 0 && (
          <span
            style={{
              fontSize: 10,
              color: MC.accent,
              background: MC.accentDim,
              borderRadius: 8,
              padding: '0 5px',
              lineHeight: '16px',
              fontWeight: 600,
            }}
          >
            {count}
          </span>
        )}
      </button>

      {/*
        grid-template-rows: 0fr → 1fr collapse.
        The inner div with minHeight: 0 is mandatory — without it the grid row
        can't shrink below the content's intrinsic height, so 0fr has no effect.
        overflow: hidden clips the content as it slides in/out.
      */}
      <div
        id={`layer-group-${title}`}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: collapseTransition,
          overflow: 'hidden',
        }}
      >
        <div style={{ minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
