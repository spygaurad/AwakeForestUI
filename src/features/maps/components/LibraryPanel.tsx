'use client';

import { useState } from 'react';
import { X, Search, Database, Link, Upload, CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import type { Dataset } from '@/types/api';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import { MC, MAP_Z } from '../mapColors';

type LibTab = 'datasets' | 'sources' | 'upload';

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle size={12} style={{ color: MC.success }} />,
  pending:   <Clock size={12} style={{ color: MC.warning }} />,
  running:   <Loader size={12} style={{ color: MC.info }} />,
  failed:    <AlertCircle size={12} style={{ color: MC.danger }} />,
};

interface LibraryPanelProps {
  open: boolean;
  topOffset: number;
  bottomOffset: number;
  projectId: string;
  datasets: Dataset[];
  onClose: () => void;
}

export function LibraryPanel({
  open,
  topOffset,
  bottomOffset,
  datasets,
  onClose,
}: LibraryPanelProps) {
  const [tab, setTab] = useState<LibTab>('datasets');
  const [query, setQuery] = useState('');
  const initLayer = useMapLayersStore((s) => s.initLayer);
  const layers = useMapLayersStore((s) => s.layers);

  const filtered = datasets.filter(
    (d) =>
      !query ||
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const addToMap = (d: Dataset) => {
    initLayer(d.id, 'dataset');
    toast.success(`"${d.name}" added to map layers`);
  };

  const isOnMap = (id: string) => !!layers[id];

  const maxPanelH = topOffset > 0
    ? `calc(100vh - ${topOffset + bottomOffset + 32}px)`
    : 'calc(100% - 32px)';

  return (
    <>
      {/* ── Backdrop ────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: MAP_Z.libraryBackdrop,
          background: 'rgba(28,33,25,0.52)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* ── Popup panel ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: topOffset + 16,
          left: '50%',
          zIndex: MAP_Z.library,
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: maxPanelH,
          transform: open
            ? 'translateX(-50%) translateY(0) scale(1)'
            : 'translateX(-50%) translateY(-12px) scale(0.97)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.22s cubic-bezier(0.2,0,0,1), opacity 0.18s ease',
          background: MC.panelBg,
          border: `1px solid ${MC.panelBorder}`,
          borderRadius: 10,
          boxShadow: MC.shadowLg,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 16,
            paddingRight: 10,
            borderBottom: `1px solid ${MC.navBorder}`,
            flexShrink: 0,
            gap: 8,
            background: MC.navBg,
          }}
        >
          <Database size={15} style={{ color: MC.navAccent, flexShrink: 0 }} />
          <span style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 700,
            color: MC.navText,
            letterSpacing: '0.01em',
          }}>
            Library
          </span>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: MC.navTextMuted,
              cursor: 'pointer',
              borderRadius: 5,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${MC.border}`, flexShrink: 0 }}>
          {([
            { id: 'datasets' as LibTab, label: 'Datasets', icon: <Database size={11} /> },
            { id: 'sources' as LibTab,  label: 'Sources',  icon: <Link size={11} /> },
            { id: 'upload' as LibTab,   label: 'Upload',   icon: <Upload size={11} /> },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'transparent',
                color: tab === t.id ? MC.accent : MC.textMuted,
                border: 'none',
                borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                borderBottomColor: tab === t.id ? MC.accent : 'transparent',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.12s',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Datasets tab ─────────────────────────────────────── */}
        {tab === 'datasets' && (
          <>
            {/* Search */}
            <div style={{ padding: '10px 12px', borderBottom: `1px solid ${MC.border}`, flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: MC.inputBg,
                  borderRadius: 6,
                  padding: '6px 10px',
                  border: `1px solid ${MC.inputBorder}`,
                }}
              >
                <Search size={12} style={{ color: MC.textMuted, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search datasets…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: MC.text,
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            {/* List — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {filtered.length === 0 ? (
                <div style={{
                  padding: '32px 20px',
                  fontSize: 13,
                  color: MC.textMuted,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}>
                  {query ? `No datasets matching "${query}"` : 'No datasets in this project yet.'}
                </div>
              ) : (
                filtered.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      padding: '11px 14px',
                      borderBottom: `1px solid ${MC.border}`,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        {STATUS_ICON[d.status] ?? null}
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: MC.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={d.name}
                        >
                          {d.name}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: MC.textMuted }}>
                        {d.item_count.toLocaleString()} items · {d.status}
                      </div>
                      {d.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
                          {d.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 10,
                                color: MC.sectionLabel,
                                background: MC.hoverBg,
                                border: `1px solid ${MC.border}`,
                                borderRadius: 8,
                                padding: '1px 6px',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => (isOnMap(d.id) ? toast.info('Already on map') : addToMap(d))}
                      style={{
                        flexShrink: 0,
                        height: 28,
                        padding: '0 10px',
                        borderRadius: 5,
                        border: `1px solid ${isOnMap(d.id) ? MC.borderLight : MC.accent}`,
                        background: isOnMap(d.id) ? 'transparent' : MC.accentDim,
                        color: isOnMap(d.id) ? MC.textMuted : MC.accent,
                        cursor: isOnMap(d.id) ? 'default' : 'pointer',
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.1s',
                      }}
                    >
                      {isOnMap(d.id) ? 'On map' : 'Add'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 'sources' && (
          <PlaceholderTab
            title="External Sources"
            description="Connect WMS, TMS, ArcGIS, or REST API sources to overlay on your map."
            action="Connect Source"
          />
        )}

        {tab === 'upload' && (
          <PlaceholderTab
            title="Upload Data"
            description="Upload GeoJSON, Shapefile, GeoTIFF, or COG rasters. Files are ingested and linked to this project."
            action="Choose Files"
          />
        )}
      </div>
    </>
  );
}

function PlaceholderTab({ title, description, action }: { title: string; description: string; action: string }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 28px',
      gap: 12,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: MC.textSecondary }}>{title}</div>
      <div style={{ fontSize: 13, color: MC.textMuted, lineHeight: 1.6, maxWidth: 280 }}>{description}</div>
      <button
        onClick={() => toast.info('Coming soon')}
        style={{
          marginTop: 8,
          height: 36,
          padding: '0 20px',
          borderRadius: 6,
          border: `1.5px solid ${MC.accent}`,
          background: MC.accentDim,
          color: MC.accent,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.03em',
        }}
      >
        {action}
      </button>
    </div>
  );
}
