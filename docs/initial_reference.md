
---

## Shared Types (`src/types/`)

### `src/types/common.ts`

```ts
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface JobResponse {
  job_id: string
  status: JobStatus
}

export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type JobType = 'ingest' | 'inference' | 'bulk_annotate' | 'bulk_delete' | 'bulk_update' | 'analysis' | 'export' | 'relationship_discovery'

export interface Job {
  id: string
  organization_id: string
  job_type: JobType
  status: JobStatus
  progress: number           // 0.0–1.0
  total_items: number | null
  processed_items: number
  failed_items: number
  input_params: Record<string, unknown>
  output_summary: Record<string, unknown> | null
  celery_task_id: string | null
  parent_job_id: string | null
  priority: number
  error: string | null
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ErrorDetail {
  detail: string
}
```

### `src/types/geo.ts`

```ts
export type GeoJSONGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][] }
  | { type: 'LineString'; coordinates: [number, number][] }

export interface BBox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}
```

### `src/types/api.ts`

```ts
import type { GeoJSONGeometry } from './geo'

// --- Organizations & Users ---
export interface Organization {
  id: string
  clerk_org_id: string
  name: string
  settings: Record<string, unknown>
  created_at: string
}

export interface User {
  id: string
  clerk_user_id: string
  email: string
  name: string
}

// --- Projects ---
export interface Project {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: 'admin' | 'member' | 'viewer'
  user: Pick<User, 'id' | 'email' | 'name'>
}

// --- Datasets ---
export type DatasetStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Dataset {
  id: string
  organization_id: string
  project_id: string
  name: string
  stac_collection_id: string | null
  source_uri: string
  status: DatasetStatus
  item_count: number
  spatial_extent: GeoJSONGeometry | null
  temporal_extent_start: string | null
  temporal_extent_end: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface DatasetItem {
  id: string
  dataset_id: string
  stac_item_id: string
  stac_collection_id: string
  geometry: GeoJSONGeometry
  datetime: string
  properties_cache: Record<string, unknown>
}

export type DatasetRelationshipType =
  | 'derived_from'
  | 'supersedes'
  | 'supplements'
  | 'same_area_different_sensor'
  | 'temporal_continuation'

// --- Annotations ---
export type AnnotationStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived'
export type AnnotationSource = 'manual' | 'model' | 'import'
export type AnnotationChangeType = 'create' | 'update' | 'delete' | 'bulk_update'

export interface Annotation {
  id: string
  organization_id: string
  dataset_item_id: string
  geometry: GeoJSONGeometry
  pixel_coords: Record<string, unknown> | null
  label: string
  confidence: number | null
  source: AnnotationSource
  track_id: string | null
  status: AnnotationStatus
  version: number
  is_current: boolean
  parent_version_id: string | null
  properties: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AnnotationVersion {
  id: string
  annotation_id: string
  version: number
  geometry: GeoJSONGeometry
  label: string
  confidence: number | null
  change_type: AnnotationChangeType
  changed_by: string | null
  created_at: string
}

export interface LabelSchema {
  id: string
  organization_id: string
  project_id: string
  name: string
  labels: { name: string; color: string; description?: string }[]
  created_at: string
}

// --- Tracking ---
export type ObjectType = 'deforestation_front' | 'fire_perimeter' | 'building' | 'water_body' | 'custom'
export type TrackedObjectStatus = 'active' | 'resolved' | 'archived' | 'merged'
export type Priority = 'critical' | 'high' | 'medium' | 'low'

export interface TrackedObject {
  id: string
  organization_id: string
  project_id: string
  object_type: ObjectType
  status: TrackedObjectStatus
  priority: Priority
  severity: 'critical' | 'warning' | 'info'
  confidence_score: number | null
  merged_into_id: string | null
  first_observed_at: string | null
  last_observed_at: string | null
  observation_count: number
  latest_geometry: GeoJSONGeometry | null
  alert_threshold: Record<string, unknown>
  created_at: string
}

export interface TrackedObjectObservation {
  id: string
  tracked_object_id: string
  annotation_id: string | null
  stac_item_id: string | null
  observation_datetime: string
  geometry: GeoJSONGeometry
  properties: Record<string, unknown>
  sensor: string | null
}

// --- ML Models ---
export type ModelType = 'detection' | 'segmentation' | 'classification'

export interface MLModel {
  id: string
  organization_id: string
  name: string
  type: ModelType
  version: string
  artifact_uri: string
  config: Record<string, unknown>
  created_at: string
}

// --- Alerts ---
export type AlertType = 'area_change' | 'ndvi_drop' | 'new_detection' | 'boundary_breach' | 'threshold_exceeded'
export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

export interface Alert {
  id: string
  organization_id: string
  tracked_object_id: string | null
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  geometry: GeoJSONGeometry
  trigger_data: Record<string, unknown>
  status: AlertStatus
  stac_item_id: string | null
  created_at: string
}

export interface AlertSubscription {
  id: string
  organization_id: string
  user_id: string
  aoi_geometry: GeoJSONGeometry
  object_types: ObjectType[]
  min_severity: AlertSeverity
  channels: { email?: string[]; webhook?: string[] }
  cooldown_minutes: number
  last_notified_at: string | null
  created_at: string
}

// --- Basemaps & Bookmarks ---
export type LayerType = 'vector' | 'raster_tile' | 'xyz_tile' | 'wms' | 'geojson'

export interface BasemapLayer {
  id: string
  organization_id: string
  name: string
  layer_type: LayerType
  url: string
  attribution: string | null
  config: Record<string, unknown>
  created_at: string
}

export interface SpatialBookmark {
  id: string
  organization_id: string
  name: string
  center: GeoJSONGeometry   // Point
  zoom: number
  bearing: number
  pitch: number
  visible_layers: string[]
  filters: Record<string, unknown>
  created_at: string
}

// --- API Keys ---
export interface ApiKey {
  id: string
  organization_id: string
  user_id: string
  name: string
  key_prefix: string   // first 8 chars only — never full key
  permissions: Record<string, unknown>
  expires_at: string | null
  created_at: string
}

export interface ApiKeyCreated extends ApiKey {
  plaintext_key: string  // returned ONCE on creation only
}

// --- Audit Log ---
export interface AuditLogEntry {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  payload: Record<string, unknown>
  created_at: string
}
```

---

## TanStack Query — Key Factory (`src/lib/query-keys.ts`)

```ts
export const qk = {
  projects: {
    list: (orgId: string) => ['projects', orgId] as const,
    detail: (id: string) => ['projects', id] as const,
    members: (id: string) => ['projects', id, 'members'] as const,
  },
  datasets: {
    list: (orgId: string, params?: Record<string, unknown>) => ['datasets', orgId, params] as const,
    detail: (id: string) => ['datasets', id] as const,
    items: (id: string, params?: Record<string, unknown>) => ['datasets', id, 'items', params] as const,
  },
  annotations: {
    list: (params: Record<string, unknown>) => ['annotations', params] as const,
    detail: (id: string) => ['annotations', id] as const,
    versions: (id: string) => ['annotations', id, 'versions'] as const,
  },
  labelSchemas: {
    list: (orgId: string) => ['label-schemas', orgId] as const,
    detail: (id: string) => ['label-schemas', id] as const,
  },
  tracking: {
    list: (params: Record<string, unknown>) => ['tracking', params] as const,
    detail: (id: string) => ['tracking', id] as const,
    observations: (id: string) => ['tracking', id, 'observations'] as const,
  },
  alerts: {
    list: (params: Record<string, unknown>) => ['alerts', params] as const,
    detail: (id: string) => ['alerts', id] as const,
    subscriptions: (orgId: string) => ['alert-subscriptions', orgId] as const,
  },
  models: {
    list: (orgId: string) => ['models', orgId] as const,
    detail: (id: string) => ['models', id] as const,
  },
  jobs: {
    list: (orgId: string) => ['jobs', orgId] as const,
    detail: (id: string) => ['jobs', id] as const,
  },
  settings: {
    apiKeys: (orgId: string) => ['api-keys', orgId] as const,
    basemaps: (orgId: string) => ['basemaps', orgId] as const,
    bookmarks: (orgId: string) => ['bookmarks', orgId] as const,
    auditLog: (orgId: string, params?: Record<string, unknown>) => ['audit-log', orgId, params] as const,
  },
  stac: {
    collections: () => ['stac-collections'] as const,
    search: (params: Record<string, unknown>) => ['stac-search', params] as const,
  },
}
```

---

## Zustand Stores

### `src/store/mapStore.ts`

```ts
interface MapState {
  // Viewport
  center: [number, number]           // [lat, lng]
  zoom: number
  // Layers
  visibleLayers: string[]
  activeBasemapId: string | null
  // Selection
  selectedFeatureId: string | null
  selectedFeatureType: 'dataset_item' | 'annotation' | 'tracked_object' | 'alert' | null
  // Draw
  drawMode: 'off' | 'polygon' | 'rectangle' | 'point'
  drawnGeometry: GeoJSONGeometry | null

  // Actions
  setCenter: (center: [number, number], zoom?: number) => void
  toggleLayer: (layerId: string) => void
  selectFeature: (id: string, type: MapState['selectedFeatureType']) => void
  clearSelection: () => void
  setDrawMode: (mode: MapState['drawMode']) => void
  setDrawnGeometry: (geom: GeoJSONGeometry | null) => void
}
```

### `src/store/jobStore.ts`

```ts
interface JobStoreState {
  activeJobIds: string[]
  addJob: (jobId: string) => void
  removeJob: (jobId: string) => void
}
```

---

## Navbar

The navigation lives in a **collapsible left sidebar** (`src/components/layout/Sidebar.tsx`). It collapses to icon-only mode on narrow viewports.

```
┌─────────────────────────────────┐
│  🌲 AwakeForest          [≡]   │   ← Logo + collapse toggle
│                                 │
│  [Org Switcher ▼]              │   ← Clerk org dropdown
│                                 │
│  ─────── EXPLORE ───────        │
│  🗺  Map                        │   ← Primary view
│  🔍  Collections                │   ← STAC collections browser
│                                 │
│  ─────── DATA ─────────         │
│  📁  Projects                   │
│  🛰  Datasets                   │
│  🏷  Annotations                │
│  📐  Label Schemas              │
│                                 │
│  ─────── ANALYSIS ─────         │
│  📍  Tracking                   │
│  📈  Analysis                   │
│  🤖  ML Models                  │
│  ⚡  Inference                  │
│                                 │
│  ─────── OPERATIONS ────        │
│  🔔  Alerts          [3]        │   ← Badge: unread critical alerts
│  ⚙  Jobs             [1]        │   ← Badge: running jobs count
│                                 │
│  ─────── ──────────────         │
│  ⚙  Settings                   │
│                                 │
│  ─────────────────────────      │
│  [Avatar] Jane Smith      [▸]  │   ← UserMenu at bottom
└─────────────────────────────────┘
```

**Navbar badge logic:**
- **Alerts badge**: count of `status=open` + `severity=critical` alerts — polling every 60s.
- **Jobs badge**: count of `status=running` jobs from `jobStore.activeJobIds`.

**Global floating job status bar** (`JobStatusBar.tsx`) — appears at bottom of screen when any job is running:
```
┌──────────────────────────────────────────────────────┐
│ ⏳ Ingesting dataset "Sentinel-2 Jan 2026"  [████░] 72%  [View ▸]  [✕] │
└──────────────────────────────────────────────────────┘
```

---

## Page-by-Page UI Reference

---

### `/map` — Map Explorer

**Purpose:** Primary map view. Browse all spatial data for the current project/org.

**Layout:** Full-screen Leaflet map + collapsible right panel for feature detail.

**Map controls (top-right floating toolbar):**
| Button | Action |
|---|---|
| `+ / -` zoom | Standard Leaflet zoom |
| `[ ]` Fullscreen | Toggle browser fullscreen |
| `📍 My Location` | Fly to browser geolocation |
| `🔖 Bookmarks` | Dropdown of saved spatial bookmarks |
| `💾 Save Bookmark` | Opens dialog: name input → POST /api/bookmarks |
| `✏ Draw` | Opens draw mode submenu |

**Draw mode submenu:**
| Button | Action |
|---|---|
| `▭ Rectangle` | Draw bbox selection |
| `⬡ Polygon` | Freehand polygon (AOI for analysis/alert subscription) |
| `✕ Clear` | Remove drawn geometry |

**Left map panel (Layer Panel):**
- Toggle switches for: Dataset Footprints / Annotations / Tracked Objects / Alerts / Custom Basemaps
- Basemap selector (street/satellite/terrain)
- Opacity sliders per layer
- `+ Add Basemap Layer` button → opens BasemapForm dialog

**Feature click popup (right slide-in panel):**
When clicking a map feature, a panel slides in from the right showing:
- Dataset Item: name, datetime, sensor, `[Open Dataset]`, `[View STAC Item]`, `[Run Inference]`
- Annotation: label, confidence, status badge, `[Edit]`, `[Approve]`, `[Reject]`, `[View History]`
- Tracked Object: object_type, status, observation_count, `[View Tracking Page]`, `[Create Alert Subscription]`
- Alert: severity, alert_type, title, `[Acknowledge]`, `[Resolve]`, `[View Details]`

**Top search bar:**
- Place name geocoder (Nominatim) → fly to result
- Dataset/collection filter chips

---

### `/projects` — Projects List

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `+ New Project` | Top right | Opens ProjectForm dialog |

**Per-row actions (in DataTable):**
| Button | Action |
|---|---|
| `Open` | Navigate to `/projects/{id}` |
| `⋮ More` (dropdown) | `Edit Name`, `Manage Members`, `Delete` |

---

### `/projects/[id]` — Project Detail

**Tabs:** Overview · Datasets · Members

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `Edit` | Header | Opens inline name/description edit |
| `+ Add Member` | Members tab | Opens user email input + role selector dialog |
| `↗ Open on Map` | Header | Flies map to project's spatial_extent |

**Per-member row:**
| Button | Action |
|---|---|
| `Change Role ▼` | Dropdown: admin/member/viewer |
| `Remove` | DELETE /api/projects/{id}/members/{user_id} |

---

### `/datasets` — Dataset List

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `+ New Dataset` | Top right | Navigate to `/datasets/new` |

**Filters (toolbar):**
- Project selector dropdown
- Status filter chips: All / Pending / Running / Completed / Failed

**Per-row actions:**
| Button | Action |
|---|---|
| `View` | Navigate to `/datasets/{id}` |
| `Open on Map` | Sets mapStore.center to dataset spatial_extent centroid |
| `⋮` dropdown | `Edit Tags`, `Delete` (disabled if status=running) |

---

### `/datasets/new` — Create Dataset

**Form fields:**
- Name (text)
- Project (select)
- Source URI (text — S3 prefix e.g. `s3://org-abc/datasets/my-data/`)
- Tags (multi-tag input)

**S3 Upload Panel** (`S3UploadPanel.tsx`):
- Drag & drop zone for raster files (.tif, .jp2, .nc)
- Uppy direct-to-S3 multipart upload with per-file progress bars
- File list with remove buttons

**Buttons:**
| Button | Action |
|---|---|
| `Upload Files` | Triggers Uppy multipart upload to S3 |
| `Create Dataset` | POST /api/datasets → creates job → shows JobPoller toast |
| `Cancel` | Navigate back |

---

### `/datasets/[id]` — Dataset Detail

**Header info:** status badge, item_count, temporal_extent dates, tags.

**Tabs:** Overview · Items · Relationships

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `View on Map` | Header | Fly map to spatial_extent |
| `Re-ingest` | Overview tab | POST /api/datasets (re-trigger ingest job) — confirm dialog |
| `Delete` | Header | Opens confirm dialog — only enabled if status≠running |
| `Edit` | Header | Inline edit: name, project, tags |

**Items tab** shows DataTable of DatasetItems:
- Columns: datetime, sensor (from properties_cache), geometry type, annotation count
- Row click → previews geometry on mini GeometryPreview map
- `View STAC Item` link per row

**Relationships tab:**
- List of related datasets with relationship type badge
- `View Related Dataset` button per row

---

### `/annotations` — Annotation List

**Filters (toolbar):**
- Dataset item search
- Label dropdown (from label schemas)
- Status chips: All / Draft / Submitted / Approved / Rejected / Archived
- Source chips: All / Manual / Model / Import
- `Draw BBox on Map` button → sets bbox filter from drawn rectangle

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `+ New Annotation` | Top right | Navigate to `/annotations/new` |
| `Bulk Import` | Top right | Navigate to `/annotations/bulk/import` |
| `Bulk Export` | Top right | Navigate to `/annotations/bulk/export` |
| `Bulk Update` | Appears when rows selected | Navigate to `/annotations/bulk/update` with selected IDs |
| `Bulk Delete` | Appears when rows selected | POST /api/annotations/bulk-delete → confirm dialog first |

**Per-row actions:**
| Button | Action |
|---|---|
| `Edit` | Navigate to `/annotations/{id}` |
| `Approve` | PATCH /api/annotations/{id}/status {status: 'approved'} — only for submitted |
| `Reject` | PATCH /api/annotations/{id}/status {status: 'rejected'} |
| `History` | Navigate to `/annotations/{id}/versions` |

---

### `/annotations/new` — Create Annotation

**Form fields:**
- Dataset Item (searchable select)
- Label (LabelPicker using selected project's schemas)
- Confidence (0–1 slider)
- Status (radio: draft / submitted)
- Geometry (draw on embedded mini-map or paste GeoJSON)

**Buttons:**
| Button | Action |
|---|---|
| `Draw on Map` | Activates polygon draw on embedded mini-map |
| `Clear Geometry` | Removes drawn geometry |
| `Create` | POST /api/annotations |
| `Cancel` | Navigate back |

---

### `/annotations/[id]` — Annotation Detail

**Header:** Label, status badge, source badge, version number, confidence.

**Tabs:** Detail · Versions

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `Edit` | Header | Toggle edit mode: label, confidence, geometry draw |
| `Save` | Edit mode | PATCH /api/annotations/{id} |
| `Submit for Review` | Header | PATCH status=submitted — draft only |
| `Approve` | Header | PATCH status=approved — submitted + admin only |
| `Reject` | Header | PATCH status=rejected — submitted + admin only |
| `Archive` | Header | PATCH status=archived |
| `Soft Delete` | Header (danger zone) | DELETE /api/annotations/{id} — confirm dialog |

**Versions tab** shows `VersionTimeline.tsx` — each version shows: change_type badge, changed_by, date, diff of label/confidence.

---

### `/annotations/bulk/import` — Bulk Import Wizard

**Step 1 — Source:**
- Format selector (GeoJSON / CSV / Shapefile)
- S3 URI input or Upload File (Uppy)
- Dataset selector (which dataset_items to link to)

**Step 2 — Field Mapping (CSV only):**
- Map CSV columns → annotation fields (label, confidence, geometry_wkt)

**Step 3 — Confirm:**
- Preview first 5 rows
- `Start Import` button → POST /api/annotations/bulk-import → shows JobPoller

**Buttons:**
| Button | Action |
|---|---|
| `Next →` | Advance wizard step |
| `← Back` | Previous step |
| `Start Import` | POST → 202 → opens job polling toast |
| `Cancel` | Navigate back |

---

### `/annotations/bulk/export` — Export

**Form fields:**
- Format: GeoJSON / CSV / COCO / Shapefile
- Filters: label, status, date range, bbox
- Dataset selector

**Buttons:**
| Button | Action |
|---|---|
| `Start Export` | POST /api/annotations/bulk-export → JobPoller |
| `Cancel` | Navigate back |

**After job completes:**
- `Download from S3` link appears (from job.output_summary.s3_uri)

---

### `/label-schemas` — Label Schema List

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `+ New Schema` | Top right | Opens LabelSchemaForm dialog |

**Per-row:**
| Button | Action |
|---|---|
| `Edit` | Navigate to `/label-schemas/{id}` |
| `Delete` | DELETE — confirm dialog |

---

### `/label-schemas/[id]` — Schema Editor

**Inline label editor:**
- Table of labels: name / color swatch / description
- `+ Add Label` row button
- Drag handle to reorder

**Buttons:**
| Button | Action |
|---|---|
| `Save` | PATCH /api/label-schemas/{id} |
| `Delete Schema` | DELETE (danger zone) |

---

### `/tracking` — Tracked Objects List

**Filters:**
- Object type chips: All / Deforestation Front / Fire Perimeter / Building / Water Body / Custom
- Status chips: Active / Resolved / Archived / Merged
- Priority: All / Critical / High / Medium / Low
- `Draw BBox` filter by spatial extent

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `+ New Tracked Object` | Top right | Opens TrackedObjectForm dialog |

**Per-row:**
| Button | Action |
|---|---|
| `View` | Navigate to `/tracking/{id}` |
| `Open on Map` | Fly to latest_geometry in mapStore |
| `⋮` dropdown | `Merge`, `Resolve`, `Archive` |

---

### `/tracking/[id]` — Tracked Object Detail

**Header:** object_type, status, priority badge, observation_count, first/last_observed_at.

**Tabs:** Overview · Observations · Analysis

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `Edit Priority / Severity` | Header | Inline select pickers |
| `Resolve` | Header | PATCH status=resolved |
| `Archive` | Header | PATCH status=archived |
| `Merge into...` | Header | Opens MergeDialog — select target tracked object |
| `Create Alert Subscription` | Overview | Navigate to `/alerts/subscriptions/new?tracked_object={id}` |
| `Run Timeseries` | Analysis tab | Navigate to `/analysis/timeseries?tracked_object={id}` |
| `+ Add Observation` | Observations tab | Opens form: datetime, geometry draw, sensor, properties |

---

### `/analysis` — Analysis Dashboard

**Cards:**
- Timeseries Query — `[New Timeseries ▸]`
- Change Detection — `[New Change Detection ▸]`
- Active Analysis Jobs — mini job list

---

### `/analysis/timeseries` — Timeseries Builder

**Form:**
- Tracked Object (searchable select)
- Date range picker
- Metric: Area / Count / NDVI
- `Run Analysis` → POST /api/analysis/timeseries → JobPoller

**After job completes:**
- TimeseriesChart renders from S3 JSON result
- `Download Data (JSON)` button

---

### `/analysis/change-detection` — Change Detection

**Form:**
- Dataset selector
- Reference date (date picker)
- Target date (date picker)
- AOI Geometry (draw on mini-map, optional)
- `Run Change Detection` → POST /api/analysis/change-detection → JobPoller

**After job completes:**
- Summary cards: Changed Areas / New Detections / Removed Detections
- `View Resulting Alerts` button (if alerts were generated)

---

### `/alerts` — Alert Feed

**Filters:**
- Severity chips: All / Critical / Warning / Info
- Status chips: Open / Acknowledged / Resolved
- Alert type chips
- `Draw BBox` spatial filter

**Alert feed (card list, newest first):**

**Per-card buttons:**
| Button | Action |
|---|---|
| `Acknowledge` | PATCH /api/alerts/{id}/status {status: 'acknowledged'} |
| `Resolve` | PATCH /api/alerts/{id}/status {status: 'resolved'} |
| `View on Map` | Fly to alert.geometry in mapStore |
| `View Tracked Object` | Navigate to `/tracking/{tracked_object_id}` |

**Top right:**
| Button | Action |
|---|---|
| `Manage Subscriptions` | Navigate to `/alerts/subscriptions` |

---

### `/alerts/subscriptions` — Subscription Manager

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `+ New Subscription` | Top right | Navigate to `/alerts/subscriptions/new` |

**Per-row:**
| Button | Action |
|---|---|
| `Edit` | Opens SubscriptionForm dialog for update |
| `Delete` | DELETE /api/alerts/subscriptions/{id} |
| `View AOI on Map` | Fly map to aoi_geometry |

---

### `/alerts/subscriptions/new` — Create Subscription

**Form:**
- AOI Geometry (draw polygon on embedded map — required)
- Object types (multi-select checkboxes)
- Min severity (radio: critical / warning / info)
- Cooldown (minutes number input)
- Channels:
  - Email: add/remove email addresses
  - Webhook: add/remove URLs

**Buttons:**
| Button | Action |
|---|---|
| `Draw AOI on Map` | Activates polygon draw |
| `Create Subscription` | POST /api/alerts/subscriptions |
| `Cancel` | Navigate back |

---

### `/models` — ML Model Registry

**Filters:** Type chips: All / Detection / Segmentation / Classification

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `+ Register Model` | Top right | Navigate to `/models/new` |

**Per-card:**
| Button | Action |
|---|---|
| `View` | Navigate to `/models/{id}` |
| `Run Inference` | Navigate to `/inference/new?model_id={id}` |
| `Delete` | DELETE — confirm dialog — disabled if running inference jobs |

---

### `/models/new` — Register Model

**Form:**
- Name
- Type (select: detection / segmentation / classification)
- Version (text)
- Artifact URI (S3 path to model weights)
- Config (JSON editor: input_size, classes, threshold)

**Buttons:**
| Button | Action |
|---|---|
| `Register` | POST /api/models |
| `Cancel` | Navigate back |

---

### `/inference/new` — Run Inference Wizard

**Step 1 — Select Model + Dataset:**
- Model (searchable select, pre-filled if coming from models page)
- Dataset (searchable select)
- Confidence Threshold (0–1 slider)

**Step 2 — Item Selection:**
- All items (default) or hand-pick from DatasetItem list with checkboxes

**Step 3 — Confirm:**
- Summary: model name, dataset name, items count, threshold
- `Start Inference` → POST /api/inference → JobPoller

---

### `/jobs` — Job Queue Monitor

**Filters:** Type / Status / Date range

**Auto-refresh:** TanStack Query `refetchInterval: 5000` while any job is running.

**DataTable columns:** type, status, progress bar, processed/total, started_at, elapsed.

**Per-row:**
| Button | Action |
|---|---|
| `View` | Navigate to `/jobs/{id}` |
| `Cancel` | PATCH status=cancelled — only for pending/queued |

---

### `/jobs/[id]` — Job Detail

**Header:** type badge, status badge, priority, scheduled_at.

**Progress section:**
- `JobProgressBar` (animated)
- `processed_items / total_items` counter
- `failed_items` with warning color
- Elapsed time (live update while running)

**Output summary section** (after completion):
- Key-value pairs from `job.output_summary`
- `Download Output` button (if S3 URI in output_summary)
- `View Annotations` / `View Dataset` contextual link depending on job_type

**Error section** (if failed):
- `job.error` displayed in red code block
- `Retry` button (for supported job types)

---

### `/settings/api-keys` — API Key Management

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `+ Create API Key` | Top right | Opens ApiKeyCreateDialog |

**ApiKeyCreateDialog fields:**
- Name
- Expiry date (optional)
- Permissions (checkboxes: read/write per resource)

After creation: modal shows plaintext key with copy button + warning "This key will not be shown again."

**Per-row:**
| Button | Action |
|---|---|
| `Revoke` | DELETE /api/api-keys/{id} — confirm dialog |

---

### `/settings/basemaps` — Basemap Layer Manager

**Buttons:**
| Button | Location | Action |
|---|---|---|
| `+ Add Basemap` | Top right | Opens BasemapForm dialog |

**BasemapForm fields:** Name / Layer type / URL / Attribution / Config (min/max zoom, opacity).

**Per-row:**
| Button | Action |
|---|---|
| `Edit` | Opens BasemapForm prefilled |
| `Delete` | DELETE |
| `Preview on Map` | Opens mini-map modal showing the layer |

---

### `/settings/bookmarks` — Spatial Bookmarks

**Per-row:**
| Button | Action |
|---|---|
| `Load` | Updates mapStore.center + zoom + visibleLayers; navigates to `/map` |
| `Delete` | DELETE /api/bookmarks/{id} |

---

### `/settings/members` — Org Member Management

Managed via Clerk's built-in `<OrganizationProfile />` component — no custom API needed.

---

### `/settings/audit-log` — Audit Log

Read-only. DataTable with: action / entity_type / entity_id / user / timestamp.

**Filters:** Action type / Entity type / User / Date range.

No write actions (audit log is immutable).

---

## Job Polling Pattern

All 202 responses from the API follow the same pattern in the frontend:

```ts
// In useAnnotationMutations.ts (example)
const bulkImport = useMutation({
  mutationFn: (req: BulkImportRequest) => api.annotations.bulkImport(req),
  onSuccess: ({ job_id }) => {
    jobStore.addJob(job_id)
    toast.loading('Bulk import started...', { id: job_id })
  },
})

// JobPoller.tsx polls GET /api/jobs/{id} every 3s
// On completion: invalidates relevant queries, shows success toast, removes from jobStore
```

`useJobPolling.ts`:
```ts
export function useJobPolling(jobId: string, onComplete?: (job: Job) => void) {
  return useQuery({
    queryKey: qk.jobs.detail(jobId),
    queryFn: () => api.jobs.getJob(jobId),
    refetchInterval: (data) =>
      data?.status === 'running' || data?.status === 'queued' || data?.status === 'pending'
        ? 3000
        : false,
    enabled: !!jobId,
  })
}
```

---

## Environment Variables (`.env.local`)

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_TITILER_URL=http://localhost:8001
NEXT_PUBLIC_MAP_DEFAULT_CENTER_LAT=-3.4653
NEXT_PUBLIC_MAP_DEFAULT_CENTER_LNG=-62.2159
NEXT_PUBLIC_MAP_DEFAULT_ZOOM=5
```
