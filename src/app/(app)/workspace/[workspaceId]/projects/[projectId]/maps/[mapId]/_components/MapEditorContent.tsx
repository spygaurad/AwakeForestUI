'use client';

import { MapEditorShell } from '@/features/maps/components/MapEditorShell';

interface Props {
  workspaceId: string;
  projectId: string;
  mapId: string;
}

export function MapEditorContent({ workspaceId, projectId, mapId }: Props) {
  return <MapEditorShell workspaceId={workspaceId} projectId={projectId} mapId={mapId} />;
}
