import type { ProjectMap } from '@/types/api';

export const SYNTHETIC_MAPS: ProjectMap[] = [
  // ── Palm Study (proj-001) ──────────────────────────────
  {
    id: 'map-001',
    project_id: 'proj-001',
    organization_id: 'org-001',
    name: 'West Kalimantan Survey',
    description: 'Boundary delineation and change detection across West Kalimantan concessions.',
    created_by: 'user-001',
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-03-10T14:00:00Z',
  },
  {
    id: 'map-002',
    project_id: 'proj-001',
    organization_id: 'org-001',
    name: 'Sumatra Buffer Zone',
    description: 'Encroachment monitoring along protected forest buffer zones in North Sumatra.',
    created_by: 'user-001',
    created_at: '2026-01-20T11:30:00Z',
    updated_at: '2026-03-09T08:45:00Z',
  },
  {
    id: 'map-003',
    project_id: 'proj-001',
    organization_id: 'org-001',
    name: 'Congo Basin Baseline',
    description: 'Initial palm extent baseline for the Congo Basin study area.',
    created_by: 'user-002',
    created_at: '2026-02-05T10:00:00Z',
    updated_at: '2026-03-08T16:20:00Z',
  },

  // ── Gold Mining Observation (proj-002) ─────────────────
  {
    id: 'map-004',
    project_id: 'proj-002',
    organization_id: 'org-001',
    name: 'Pará State Q1',
    description: 'Active mining pit detection and expansion tracking in Pará state, Q1 2026.',
    created_by: 'user-002',
    created_at: '2026-02-10T08:00:00Z',
    updated_at: '2026-03-11T11:00:00Z',
  },
  {
    id: 'map-005',
    project_id: 'proj-002',
    organization_id: 'org-001',
    name: 'Yanomami Territory',
    description: 'Illegal mining activity and mercury plume mapping in the Yanomami Indigenous Territory.',
    created_by: 'user-002',
    created_at: '2026-02-18T13:00:00Z',
    updated_at: '2026-03-10T09:30:00Z',
  },
  {
    id: 'map-006',
    project_id: 'proj-002',
    organization_id: 'org-001',
    name: 'River Turbidity Scan',
    description: 'Satellite-derived turbidity index for rivers affected by upstream mining activity.',
    created_by: 'user-003',
    created_at: '2026-03-01T07:30:00Z',
    updated_at: '2026-03-12T06:00:00Z',
  },
];
