'use client';

import dynamic from 'next/dynamic';
import { MC } from '../mapColors';

// ─── Loading shell ─────────────────────────────────────────────────────────────
function MapLoadingShell() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: MC.loadBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      <style>{`
        @keyframes af-ring-pulse {
          from { opacity: 0.2; transform: scale(0.92); }
          to   { opacity: 0.8; transform: scale(1);    }
        }
      `}</style>

      {/* Tree-ring pulse */}
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        {([48, 36, 24] as const).map((size, i) => (
          <div
            key={size}
            style={{
              position: 'absolute',
              inset: (48 - size) / 2,
              borderRadius: '50%',
              border: '1.5px solid',
              borderColor: MC.loadRings[i],
              animation: `af-ring-pulse ${1.2 + i * 0.3}s ease-in-out ${i * 0.15}s infinite alternate`,
            }}
          />
        ))}
      </div>

      <span
        style={{
          color: MC.loadText,
          fontSize: 12,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Initialising map
      </span>
    </div>
  );
}

// ─── Dynamic import — ssr: false valid here (client component) ─────────────────
const MapEditorShell = dynamic(
  () =>
    import('@/features/maps/components/MapEditorShell').then((m) => ({
      default: m.MapEditorShell,
    })),
  { ssr: false, loading: () => <MapLoadingShell /> }
);

interface MapLoaderProps {
  workspaceId: string;
  projectId: string;
  mapId: string;
}

export function MapLoader({ workspaceId, projectId, mapId }: MapLoaderProps) {
  return <MapEditorShell workspaceId={workspaceId} projectId={projectId} mapId={mapId} />;
}
