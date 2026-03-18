'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Map, Layers, FileImage, ChevronRight } from 'lucide-react';
import { datasetsApi } from '@/lib/api/datasets';
import { qk } from '@/lib/query-keys';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import { getMapInstance } from '@/stores/mapStore';
import { MC } from '../../mapColors';

interface DatasetInfoPanelProps {
  datasetId: string;
  mapId?: string;
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${MC.border}` }}>
      <span style={{ fontSize: 11, color: MC.textMuted, flexShrink: 0, marginRight: 8 }}>{label}</span>
      <span style={{ fontSize: 11, color: MC.text, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  ready:     MC.success,
  ingesting: MC.warning,
  pending:   MC.textMuted,
  failed:    MC.danger,
};

export function DatasetInfoPanel({ datasetId, mapId }: DatasetInfoPanelProps) {
  const queryClient = useQueryClient();
  const initLayer = useMapLayersStore((s) => s.initLayer);
  const setBackendLayerId = useMapLayersStore((s) => s.setBackendLayerId);
  const setLayerTileConfig = useMapLayersStore((s) => s.setLayerTileConfig);
  const layers = useMapLayersStore((s) => s.layers);
  const openItemsPanel = useMapLayersStore((s) => s.openItemsPanel);
  const isOnMap = !!layers[datasetId];

  const { data: dataset, isLoading } = useQuery({
    queryKey: qk.datasets.detail(datasetId),
    queryFn: () => datasetsApi.get(datasetId),
  });

  const addToMapMutation = useMutation({
    mutationFn: async () => {
      if (!dataset) return;

      // Initialize the layer immediately (optimistic)
      initLayer(datasetId, 'dataset', { sourceType: 'dataset' });

      // For raster datasets with a STAC collection, fetch TileJSON to get tile URL
      if (dataset.status === 'ready' && dataset.stac_collection_id) {
        try {
          const tileJson = await datasetsApi.getTileJson(datasetId);
          if (tileJson.tiles[0]) {
            setLayerTileConfig(datasetId, {
              tileUrl: tileJson.tiles[0],
              tileBounds: tileJson.bounds,
              tileMinZoom: tileJson.minzoom,
              tileMaxZoom: tileJson.maxzoom,
            });

            // Fly to dataset spatial extent
            const map = getMapInstance();
            if (map && tileJson.bounds) {
              const [west, south, east, north] = tileJson.bounds;
              map.fitBounds([[south, west], [north, east]], { padding: [40, 40], maxZoom: 16 });
            }
          }
        } catch {
          // TileJSON not available — footprint polygon will be used instead
        }
      }

      // Persist layer to the backend map record
      if (mapId) {
        try {
          const bl = await datasetsApi.addMapLayer(mapId, {
            name: dataset.name,
            layer_type: dataset.dataset_type,
            source_type: 'dataset',
            dataset_id: datasetId,
            opacity: 1.0,
            visible: true,
          });
          setBackendLayerId(datasetId, bl.id);
          queryClient.invalidateQueries({ queryKey: ['map-layers', mapId] });
        } catch {
          // non-critical — layer is already in client store
        }
      }
    },
    onSuccess: () => toast.success(`"${dataset?.name}" added to map`),
    onError: () => toast.error('Failed to add to map'),
  });

  if (isLoading) {
    return (
      <div style={{ padding: 14 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            height: 20,
            borderRadius: 4,
            background: MC.hoverBg,
            marginBottom: 8,
            width: `${60 + i * 8}%`,
          }} />
        ))}
      </div>
    );
  }

  if (!dataset) return null;

  const statusColor = STATUS_COLORS[dataset.status] ?? MC.textMuted;
  const hasItems = (dataset.metadata?.file_count ?? 0) > 1;

  const temporal = dataset.temporal_extent?.lower
    ? `${new Date(dataset.temporal_extent.lower).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}${dataset.temporal_extent.upper ? ` – ${new Date(dataset.temporal_extent.upper).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : ''}`
    : null;

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${MC.border}` }}>
        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            color: statusColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <span style={{
              width: 5, height: 5,
              borderRadius: '50%',
              background: statusColor,
              flexShrink: 0,
            }} />
            {dataset.status === 'ready' ? 'Ready' : dataset.status}
          </span>
          {(dataset.metadata?.file_count ?? 0) > 0 && (
            <span style={{ fontSize: 10, color: MC.textMuted }}>
              · {dataset.metadata!.file_count!.toLocaleString()} files
            </span>
          )}
        </div>

        {/* Name */}
        <div style={{ fontSize: 14, fontWeight: 700, color: MC.text, lineHeight: 1.3, marginBottom: 4 }}>
          {dataset.name}
        </div>

        {temporal && (
          <div style={{ fontSize: 11, color: MC.textMuted }}>{temporal}</div>
        )}
      </div>

      {/* Browse individual items — shown for multi-file datasets */}
      {hasItems && dataset.status === 'ready' && (
        <button
          onClick={() => openItemsPanel(datasetId)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderBottom: `1px solid ${MC.border}`,
            background: MC.accentDim,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            border: 'none',
            textAlign: 'left',
            transition: 'background 0.1s',
          }}
        >
          <FileImage size={14} style={{ color: MC.accent, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: MC.accent }}>
              Browse individual items
            </div>
            <div style={{ fontSize: 10, color: MC.textMuted }}>
              View and add single files by date
            </div>
          </div>
          <ChevronRight size={14} style={{ color: MC.textMuted, flexShrink: 0 }} />
        </button>
      )}

      {/* Metadata */}
      <div style={{ padding: '8px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MC.sectionLabel, marginBottom: 6 }}>
          Metadata
        </div>
        {dataset.stac_collection_id && (
          <MetaRow label="Collection" value={
            <span style={{ fontFamily: 'monospace', fontSize: 10 }} title={dataset.stac_collection_id}>
              {dataset.stac_collection_id.length > 28
                ? `…${dataset.stac_collection_id.slice(-24)}`
                : dataset.stac_collection_id}
            </span>
          } />
        )}
        <MetaRow label="Type" value={dataset.dataset_type} />
        <MetaRow label="Created" value={new Date(dataset.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
        <MetaRow label="Updated" value={new Date(dataset.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${MC.border}`, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {!isOnMap && dataset.status === 'ready' && (
          <button
            onClick={() => addToMapMutation.mutate()}
            disabled={addToMapMutation.isPending}
            style={{
              height: 32,
              borderRadius: 5,
              border: 'none',
              background: MC.accent,
              color: '#1c2119',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: addToMapMutation.isPending ? 0.6 : 1,
            }}
          >
            <Map size={12} />
            {addToMapMutation.isPending ? 'Adding…' : 'Add full mosaic to map'}
          </button>
        )}

        {isOnMap && (
          <div style={{
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
            color: MC.success,
          }}>
            <Layers size={12} />
            On this map
          </div>
        )}

        <a
          href={`../datasets/${datasetId}`}
          target="_blank"
          rel="noreferrer"
          style={{
            height: 28,
            borderRadius: 5,
            border: `1px solid ${MC.border}`,
            background: 'transparent',
            color: MC.textSecondary,
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            textDecoration: 'none',
          }}
        >
          View full details
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
