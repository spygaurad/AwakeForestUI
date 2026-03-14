import type { Project } from '@/types/api';

export const SYNTHETIC_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    organization_id: 'org-001',
    name: 'Palm Study',
    description: 'Monitoring oil palm expansion and encroachment into protected forest zones.',
    created_by: 'user-001',
    created_at: '2026-01-08T08:00:00Z',
    updated_at: '2026-03-10T14:22:00Z',
  },
  {
    id: 'proj-002',
    organization_id: 'org-001',
    name: 'Gold Mining Observation',
    description: 'Tracking illegal artisanal gold mining activity, pit expansion, and river contamination.',
    created_by: 'user-001',
    created_at: '2026-02-03T13:00:00Z',
    updated_at: '2026-03-11T11:15:00Z',
  },
];
