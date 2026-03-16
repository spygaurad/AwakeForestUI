'use client';

import { useState } from 'react';
import { Layers, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { LayerGroupSection } from './LayerGroupSection';
import { DatasetLayerItem } from './DatasetLayerItem';
import { AnnotationLayerItem } from './AnnotationLayerItem';
import { LayerItem } from './LayerItem';
import type { Dataset, Annotation, TrackedObject, Alert } from '@/types/api';
import { MC, MAP_Z } from '../../mapColors';
import { useIsCompact } from '@/hooks/use-mobile';

type PanelTab = 'layers' | 'legend';

export interface LeftPanelProps {
  open: boolean;
  onToggle: () => void;
  topOffset: number;
  bottomOffset: number;
  projectId: string;
  datasets: Dataset[];
  annotations: Annotation[];
  trackedObjects: TrackedObject[];
  alerts: Alert[];
}

export function LeftPanel({
  open,
  onToggle,
  topOffset,
  bottomOffset,
  datasets,
  annotations,
  trackedObjects,
  alerts,
}: LeftPanelProps) {
  const [tab, setTab] = useState<PanelTab>('layers');
  const isCompact = useIsCompact();

  const annotationsByLabel = annotations.reduce<Record<string, Annotation[]>>((acc, a) => {
    if (!acc[a.label]) acc[a.label] = [];
    acc[a.label].push(a);
    return acc;
  }, {});

  const totalItems =
    datasets.length +
    Object.keys(annotationsByLabel).length +
    trackedObjects.length +
    alerts.length;

  // ── Desktop geometry ────────────────────────────────────────────────────────
  const panelTop = topOffset + 8;
  const maxPanelH = topOffset > 0
    ? `calc(100vh - ${topOffset + bottomOffset + 16}px)`
    : 'calc(100% - 16px)';

  // ── Shared panel content ────────────────────────────────────────────────────
  const panelContent = (
    <>
      {/* Drag handle — compact only */}
      {isCompact && (
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: MC.border,
          margin: '10px auto 0',
          flexShrink: 0,
        }} />
      )}

      {/* ── Panel header ─────────────────────────────────────── */}
      <div
        style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px 0 14px',
          background: MC.navBg,
          borderBottom: `1px solid ${MC.navBorder}`,
          flexShrink: 0,
          gap: 7,
          marginTop: isCompact ? 8 : 0,
        }}
      >
        <Layers size={13} style={{ color: MC.navAccent, flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: MC.navText,
          }}
        >
          Layers
          {totalItems > 0 && (
            <span style={{
              marginLeft: 6,
              fontSize: 10,
              color: MC.navAccent,
              fontWeight: 600,
            }}>
              {totalItems}
            </span>
          )}
        </span>
        <button
          onClick={onToggle}
          title={isCompact ? 'Dismiss' : 'Collapse panel'}
          aria-label={isCompact ? 'Dismiss layers panel' : 'Collapse layers panel'}
          style={{
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: MC.navTextMuted,
            cursor: 'pointer',
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          {isCompact ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${MC.border}`,
          flexShrink: 0,
          background: MC.panelBg,
        }}
      >
        {(['layers', 'legend'] as PanelTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              height: 32,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              background: 'transparent',
              color: tab === t ? MC.accent : MC.textMuted,
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: tab === t ? MC.accent : 'transparent',
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'color 0.12s, border-color 0.12s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Scrollable content ──────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '4px 0' }}>

        {/* ── LAYERS tab ──────────────────────────────────────── */}
        {tab === 'layers' && (
          <>
            <LayerGroupSection title="Datasets" count={datasets.length} defaultOpen>
              {datasets.length === 0 ? (
                <EmptyHint>No datasets — add from Library</EmptyHint>
              ) : (
                datasets.map((d) => <DatasetLayerItem key={d.id} dataset={d} />)
              )}
            </LayerGroupSection>

            <LayerGroupSection
              title="Annotations"
              count={Object.keys(annotationsByLabel).length}
              defaultOpen
            >
              {Object.keys(annotationsByLabel).length === 0 ? (
                <EmptyHint>Draw shapes with Annotate tool</EmptyHint>
              ) : (
                Object.entries(annotationsByLabel).map(([label, items]) => (
                  <AnnotationLayerItem key={label} label={label} count={items.length} />
                ))
              )}
            </LayerGroupSection>

            <LayerGroupSection title="Tracking" count={trackedObjects.length} defaultOpen={false}>
              {trackedObjects.length === 0 ? (
                <EmptyHint>No tracked objects</EmptyHint>
              ) : (
                <LayerItem
                  id="tracking-all"
                  name={`${trackedObjects.length} tracked object${trackedObjects.length !== 1 ? 's' : ''}`}
                  type="tracking"
                />
              )}
            </LayerGroupSection>

            <LayerGroupSection title="Alerts" count={alerts.length} defaultOpen={false}>
              {alerts.length === 0 ? (
                <EmptyHint>No active alerts</EmptyHint>
              ) : (
                <LayerItem
                  id="alerts-all"
                  name={`${alerts.length} alert${alerts.length !== 1 ? 's' : ''}`}
                  type="alert"
                />
              )}
            </LayerGroupSection>
          </>
        )}

        {/* ── LEGEND tab ─────────────────────────────────────── */}
        {tab === 'legend' && (
          <div style={{ padding: '8px 12px' }}>
            {Object.entries(annotationsByLabel).length > 0 && (
              <LegendSection title="Annotations">
                {Object.entries(annotationsByLabel).map(([label, items]) => (
                  <LegendRow key={label} color={MC.accent} label={label} count={items.length} shape="circle" />
                ))}
              </LegendSection>
            )}

            {datasets.length > 0 && (
              <LegendSection title="Datasets">
                {datasets.map((d) => (
                  <LegendRow key={d.id} color={MC.info} label={d.name} count={d.item_count} shape="square" />
                ))}
              </LegendSection>
            )}

            {trackedObjects.length > 0 && (
              <LegendSection title="Tracking">
                <LegendRow color={MC.success} label="Tracked objects" count={trackedObjects.length} shape="circle" />
              </LegendSection>
            )}

            {alerts.length > 0 && (
              <LegendSection title="Alerts">
                <LegendRow color={MC.danger} label="Active alerts" count={alerts.length} shape="circle" />
              </LegendSection>
            )}

            {totalItems === 0 && (
              <div style={{ padding: '20px 0', fontSize: 12, color: MC.textMuted, textAlign: 'center', fontStyle: 'italic' }}>
                Add layers to build a legend.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  // ── Compact: bottom sheet ───────────────────────────────────────────────────
  if (isCompact) {
    return (
      <>
        {/* Backdrop — tapping outside closes the sheet */}
        {open && (
          <div
            onClick={onToggle}
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              zIndex: MAP_Z.panel - 1,
              transition: 'opacity 0.2s',
            }}
          />
        )}

        {/* Bottom sheet panel */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '65vh',
            zIndex: MAP_Z.panel,
            display: 'flex',
            flexDirection: 'column',
            background: MC.panelBg,
            borderTop: `1px solid ${MC.panelBorder}`,
            borderRadius: '12px 12px 0 0',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
            transform: open ? 'translateY(0)' : 'translateY(110%)',
            transition: 'transform 0.25s cubic-bezier(0.2,0,0,1)',
            overflow: 'hidden',
            // Safe-area padding for devices with home indicator
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {panelContent}
        </div>

        {/* FAB trigger — shown when sheet is closed */}
        {!open && (
          <button
            onClick={onToggle}
            aria-label="Show layers panel"
            title="Layers"
            style={{
              position: 'absolute',
              top: panelTop + 8,
              left: 12,
              zIndex: MAP_Z.panel,
              height: 36,
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: MC.navBg,
              border: `1px solid ${MC.navBorder}`,
              borderRadius: 18,
              color: MC.navAccent,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              boxShadow: MC.shadowMd,
              whiteSpace: 'nowrap',
            }}
          >
            <Layers size={13} />
            Layers
            {totalItems > 0 && (
              <span style={{
                background: MC.accent,
                color: MC.panelBg,
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 700,
                padding: '0 5px',
                lineHeight: '16px',
                minWidth: 16,
                textAlign: 'center',
              }}>
                {totalItems}
              </span>
            )}
          </button>
        )}
      </>
    );
  }

  // ── Desktop: slide-in from left ─────────────────────────────────────────────
  return (
    <>
      {/* Floating panel */}
      <div
        style={{
          position: 'absolute',
          top: panelTop,
          left: 8,
          width: 260,
          maxHeight: maxPanelH,
          zIndex: MAP_Z.panel,
          display: 'flex',
          flexDirection: 'column',
          background: MC.panelBg,
          border: `1px solid ${MC.panelBorder}`,
          borderRadius: 8,
          boxShadow: open ? MC.shadowMd : 'none',
          transform: open ? 'translateX(0)' : 'translateX(-276px)',
          transition: 'transform 0.22s cubic-bezier(0.2,0,0,1)',
          overflow: 'hidden',
        }}
      >
        {panelContent}
      </div>

      {/* Pull-tab when panel is collapsed */}
      {!open && (
        <button
          onClick={onToggle}
          title="Show layers"
          aria-label="Show layers panel"
          style={{
            position: 'absolute',
            left: 0,
            top: panelTop + 52,
            zIndex: MAP_Z.panel,
            width: 22,
            height: 52,
            background: MC.navBg,
            border: `1px solid ${MC.navBorder}`,
            borderLeft: 'none',
            borderRadius: '0 8px 8px 0',
            color: MC.navAccent,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: MC.shadowMd,
          }}
        >
          <ChevronRight size={12} />
        </button>
      )}
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '5px 12px 8px 30px', fontSize: 11, color: MC.textMuted, fontStyle: 'italic' }}>
      {children}
    </div>
  );
}

function LegendSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: MC.sectionLabel,
        marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  );
}

function LegendRow({
  color, label, count, shape,
}: {
  color: string; label: string; count: number; shape: 'circle' | 'square';
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 12, height: 12,
        borderRadius: shape === 'circle' ? '50%' : 2,
        background: color,
        flexShrink: 0,
        opacity: 0.85,
      }} />
      <span style={{
        flex: 1, fontSize: 12, color: MC.textSecondary,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} title={label}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: MC.textMuted, flexShrink: 0 }}>
        {count.toLocaleString()}
      </span>
    </div>
  );
}
