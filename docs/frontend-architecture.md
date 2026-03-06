# AwakeForest — Frontend Architecture

> Reference: `docs/geospatial-platform-architecture-v2.docx`, `docs/initial_reference.md`
> Stack: Next.js 15 · TanStack Query v5 · Zustand v4 · Leaflet · shadcn/ui

---

## Library Stack

Versions reflect what is **actually installed** in `package.json`.

| Category | Library | Installed | Architecture Note |
|---|---|---|---|
| Framework | `next` | 15.x (App Router) | SSR/RSC for public pages; client components for map/interactive UI |
| Auth | `@clerk/nextjs` | **7.x** | Matches backend Clerk JWT auth; org-aware; handles sign-in/org-switching |
| Server state | `@tanstack/react-query` | 5.x | Queries, mutations, polling (job progress), cache invalidation |
| Client state | `zustand` | **4.x** | Map viewport state, active layers, panel toggles — no boilerplate |
| Map | `leaflet` + `react-leaflet` | L 1.9 / RL 4.x | Lightweight; supports tile overlays from titiler; good GeoJSON layer |
| Map draw | `@geoman-io/leaflet-geoman-free` | 2.x | Polygon/rectangle/point AOI drawing on Leaflet maps |
| COG display | `georaster` + `georaster-layer-for-leaflet` + `geotiff` + `plotty` | mixed | Client-side Cloud Optimized GeoTIFF rendering on Leaflet |
| Geospatial utils | `@turf/turf` | 7.x | Client-side bbox validation, area computation, geometry union |
| Forms | `react-hook-form` + `@hookform/resolvers` + `zod` | RHF 7.x / Zod **4.x** | Type-safe forms; Zod schemas mirror backend Pydantic shapes |
| Tables | `@tanstack/react-table` | **MISSING — install** | Headless; handles pagination, sorting, row selection for bulk ops |
| Charts | `recharts` | **MISSING — install** | Timeseries line charts, area change bar charts; small bundle |
| UI primitives | `shadcn/ui` + `tailwindcss` | TW 3.4 (shadcn via CLI) | Radix-based accessible components; matches dark geo-platform aesthetic |
| Component utils | `clsx` + `tailwind-merge` + `class-variance-authority` | latest | Required by shadcn/ui pattern |
| Icons | `lucide-react` | 0.294.x | Clean, consistent icon set |
| Date handling | `date-fns` | **3.x** | Temporal range pickers, relative time display |
| HTTP client | `ky` | 1.x | Thin fetch wrapper; works in RSC + client; interceptors for auth headers |
| File upload | `@uppy/core` + `@uppy/aws-s3` | **MISSING — install** | Direct-to-S3 multipart upload for large rasters; progress events |
| Notifications | `sonner` | **2.x** | Toast for job completion / alert triggers |
| Animations | `tailwindcss-animate` | 1.x | Required by shadcn/ui |

### Libraries to install (missing from package.json)

```bash
npm install @tanstack/react-table recharts @uppy/core @uppy/aws-s3 @uppy/dashboard
```

### Packages in package.json NOT part of the architecture

| Package | Status | Reason |
|---|---|---|
| `minio` | **Remove** | Server-side S3 SDK — never use in a browser app; S3 uploads go through Uppy direct-to-S3 |
| `ol` (OpenLayers) | **Remove** | Redundant with Leaflet; architecture uses Leaflet exclusively |
| `axios` | **Remove** | Redundant with `ky`; use `ky` throughout (already configured with Clerk auth interceptor) |
| `react-dropzone` | **Replace with Uppy** | Uppy provides drop + multipart upload in one; use Uppy for all file upload UI |
| `leaflet.heat` | Keep if needed | Heatmap overlay — not in architecture but potentially useful |
| `leaflet-geotiff-2` | Keep | Used alongside georaster for COG layer rendering |

---

## Version Deltas (doc vs. reality)

| Library | Doc Said | Actual | Action |
|---|---|---|---|
| `@clerk/nextjs` | 6.x | **7.x** | Docs updated. Use v7 API (`clerkMiddleware`, `auth()` async, `OrganizationSwitcher`) |
| `zustand` | 5.x | **4.x** | Docs updated. Upgrade to v5 when ready (minor API changes in `create`) |
| `zod` | 3.x | **4.x** | Docs updated. Zod 4 has breaking changes — use v4 `z` API throughout |
| `date-fns` | 4.x | **3.x** | Docs updated. v3 is stable and current; no urgent upgrade |
| `sonner` | 1.x | **2.x** | Docs updated. v2 is a drop-in upgrade |

---

## Clerk v7 API Patterns

```ts
// Middleware (src/middleware.ts)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/select-org(.*)']);
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

// Server component auth check
import { auth } from '@clerk/nextjs/server';
const { userId, orgId } = await auth();

// Clerk components
import { SignIn, SignUp, OrganizationSwitcher, OrganizationList, UserButton } from '@clerk/nextjs';
```

### Clerk Appearance (golden brown theme)
```ts
appearance={{
  variables: { colorPrimary: '#8c6d2c' },
  elements: {
    formButtonPrimary: 'bg-primary-600 hover:bg-primary-700',
    footerActionLink: 'text-primary-600',
  },
}}
```

---

## Folder Structure

```
src/
│
├── app/                            # Next.js App Router
│   ├── globals.css                 # Tailwind base + golden brown CSS vars
│   ├── layout.tsx                  # Root layout: ClerkProvider, QueryProvider, Toaster
│   ├── page.tsx                    # Public landing page → redirects auth users to /dashboard
│   ├── middleware.ts               # Clerk route protection (at src/ level)
│   │
│   ├── (auth)/                     # Public auth pages (no sidebar)
│   │   ├── layout.tsx              # Centered layout with AwakeForest branding
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   └── select-org/page.tsx     # Clerk OrganizationList — after sign-up
│   │
│   └── (app)/                      # Authenticated layout group
│       ├── layout.tsx              # Auth guard (userId + orgId) + TopNav + Sidebar
│       ├── dashboard/page.tsx      # Post-login landing: stats, quick links, recent jobs
│       │
│       ├── map/page.tsx            # Map Explorer (primary view — full-screen Leaflet)
│       │
│       ├── projects/
│       │   ├── page.tsx            # Project list (DataTable)
│       │   └── [id]/
│       │       ├── page.tsx        # Project overview (tabs: Overview · Datasets · Members)
│       │       └── members/page.tsx
│       │
│       ├── datasets/
│       │   ├── page.tsx
│       │   ├── new/page.tsx        # Dataset creation form + S3 upload (Uppy)
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── items/page.tsx
│       │
│       ├── annotations/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   ├── [id]/
│       │   │   ├── page.tsx
│       │   │   └── versions/page.tsx
│       │   └── bulk/
│       │       ├── import/page.tsx
│       │       ├── update/page.tsx
│       │       └── export/page.tsx
│       │
│       ├── label-schemas/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       │
│       ├── tracking/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── observations/page.tsx
│       │
│       ├── analysis/
│       │   ├── page.tsx
│       │   ├── timeseries/page.tsx
│       │   └── change-detection/page.tsx
│       │
│       ├── alerts/
│       │   ├── page.tsx
│       │   └── subscriptions/
│       │       ├── page.tsx
│       │       └── new/page.tsx
│       │
│       ├── models/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/page.tsx
│       │
│       ├── inference/new/page.tsx
│       │
│       ├── jobs/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       │
│       └── settings/
│           ├── page.tsx            # Redirect → /settings/api-keys
│           ├── api-keys/page.tsx
│           ├── basemaps/page.tsx
│           ├── bookmarks/page.tsx
│           ├── members/page.tsx    # Uses Clerk <OrganizationProfile />
│           └── audit-log/page.tsx
│
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx              # Fixed top bar: logo + OrganizationSwitcher + UserButton
│   │   ├── Sidebar.tsx             # Hover-expand dark sidebar (64px → 240px); exports SidebarContext
│   │   ├── SidebarNavItem.tsx      # Animated icon+label nav button
│   │   └── JobStatusBar.tsx        # Floating bottom bar: active job progress
│   │
│   ├── map/
│   │   ├── MapContainer.tsx        # Leaflet map init; dynamic import (no SSR)
│   │   ├── BasemapLayer.tsx        # XYZ/WMS/GeoJSON layer switcher
│   │   ├── DatasetItemLayer.tsx    # Renders dataset item footprints as polygons
│   │   ├── AnnotationLayer.tsx     # Renders annotations by label/status
│   │   ├── TrackedObjectLayer.tsx  # Renders tracked object latest_geometry
│   │   ├── AlertLayer.tsx          # Alert geometry overlays with severity color
│   │   ├── DrawControl.tsx         # Leaflet-Geoman AOI polygon/rectangle drawing
│   │   ├── BookmarkControl.tsx     # Save/load spatial bookmark buttons on map
│   │   ├── LayerPanel.tsx          # Toggleable left panel: layer visibility + opacity
│   │   ├── MapSearch.tsx           # Nominatim place name geocoder input
│   │   └── TitilerLayer.tsx        # Dynamic COG tile overlay via titiler URL template
│   │
│   ├── jobs/
│   │   ├── JobProgressBar.tsx      # progress (0–1) → animated bar + percentage
│   │   ├── JobStatusBadge.tsx      # pending/queued/running/completed/failed/cancelled
│   │   └── JobPoller.tsx           # Polls GET /api/jobs/{id}; fires onComplete
│   │
│   ├── annotations/
│   │   ├── AnnotationStatusBadge.tsx
│   │   ├── AnnotationSourceBadge.tsx
│   │   ├── VersionTimeline.tsx
│   │   └── GeometryPreview.tsx     # Mini Leaflet map for single geometry preview
│   │
│   ├── data-table/
│   │   ├── DataTable.tsx           # Generic TanStack Table wrapper with pagination
│   │   ├── DataTablePagination.tsx
│   │   ├── DataTableToolbar.tsx
│   │   └── BulkActionBar.tsx
│   │
│   └── ui/                         # shadcn/ui generated components (do not hand-edit)
│
├── features/                       # Feature-specific code, co-located by domain
│   ├── projects/components/ hooks/ types.ts
│   ├── datasets/components/ hooks/ types.ts
│   ├── annotations/components/ hooks/ types.ts
│   ├── label-schemas/components/ hooks/ types.ts
│   ├── tracking/components/ hooks/ types.ts
│   ├── analysis/components/ hooks/ types.ts
│   ├── alerts/components/ hooks/ types.ts
│   ├── models/components/ hooks/ types.ts
│   ├── inference/components/ hooks/ types.ts
│   ├── jobs/components/ hooks/ types.ts
│   └── settings/components/ hooks/ types.ts
│
├── lib/
│   ├── api/
│   │   ├── client.ts               # ky instance with Clerk auth header injection
│   │   ├── projects.ts / datasets.ts / annotations.ts / ...
│   │   └── (all domain API modules)
│   ├── query-client.tsx            # QueryClient singleton + QueryProvider
│   ├── query-keys.ts               # Centralized TanStack Query key factory (qk.*)
│   └── geo.ts                      # Turf helpers: bboxToPolygon, areaM2, wktToGeoJSON
│
├── store/
│   ├── mapStore.ts                 # Zustand: viewport, active layers, draw mode, selected feature
│   ├── jobStore.ts                 # Zustand: active job IDs, auto-dismiss on complete
│   └── filterStore.ts              # Zustand: persisted filter state per feature
│
├── hooks/
│   └── use-hoverable-sidebar.ts    # Sidebar expand/collapse with leave delay
│
└── types/
    ├── api.ts                      # Shared API types (all domains)
    ├── geo.ts                      # GeoJSONGeometry, BBox
    └── common.ts                   # PaginatedResponse<T>, Job, JobStatus, ErrorDetail
```

---

## Sidebar Navigation Groups

```
┌─────────────────────────────────┐
│  🌲 AwakeForest                 │  ← Logo (TopNav — fixed top bar)
│  [Org Switcher ▼]  [Avatar]    │
├─────────────────────────────────┤
│  ─── EXPLORE ───                │
│  🏠  Dashboard                  │
│  🗺  Map Explorer               │  ← Primary view
│                                 │
│  ─── DATA ─────                 │
│  📁  Projects                   │
│  🛰  Datasets                   │
│  🏷  Annotations                │
│  📐  Label Schemas              │
│                                 │
│  ─── ANALYSIS ──                │
│  📍  Tracking                   │
│  📈  Analysis                   │
│  🤖  Models                     │
│  ⚡  Inference                  │
│                                 │
│  ─── OPERATIONS ─               │
│  🔔  Alerts            [3]      │  ← Badge: open critical count
│  ⚙  Jobs               [1]     │  ← Badge: running jobs
│                                 │
│  ⚙  Settings                   │
└─────────────────────────────────┘
```

**Badge logic:**
- Alerts badge: `status=open` + `severity=critical` — poll every 60s
- Jobs badge: `jobStore.activeJobIds.length`

---

## Key Patterns

### HTTP Client (`src/lib/api/client.ts`)

```ts
import ky from 'ky';
import { auth } from '@clerk/nextjs/server'; // server-side only

// Client-side: inject Clerk token via beforeRequest hook
const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  hooks: {
    beforeRequest: [
      async (request) => {
        const token = await window.Clerk?.session?.getToken();
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
  },
});
```

### Job Polling Pattern

All long-running operations return `202 { job_id }`. Pattern:
```ts
// Mutation fires → addJob → toast polling
const mutation = useMutation({
  mutationFn: api.annotations.bulkImport,
  onSuccess: ({ job_id }) => {
    jobStore.addJob(job_id);
    toast.loading('Import started...', { id: job_id });
  },
});

// useJobPolling — refetchInterval while running
useQuery({
  queryKey: qk.jobs.detail(jobId),
  queryFn: () => api.jobs.getJob(jobId),
  refetchInterval: (data) =>
    ['running', 'queued', 'pending'].includes(data?.status ?? '') ? 3000 : false,
});
```

### Leaflet Map — Dynamic Import (no SSR)
```ts
const MapContainer = dynamic(() => import('@/components/map/MapContainer'), { ssr: false });
```

### Zod v4 Note
Zod 4 (`^4.3.6`) has breaking changes from v3. Key differences:
- `z.object({}).parse()` unchanged, but some inference types differ
- `z.string().email()` still works, but error messages changed
- Always use `import { z } from 'zod'` — no named type imports needed

---

## Environment Variables

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/select-org
CLERK_WEBHOOK_SECRET=whsec_...

# Backend
NEXT_PUBLIC_API_URL=http://localhost:8011/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TITILER_TILE_FORMAT=webp
NEXT_PUBLIC_TITILER_RESAMPLING=bilinear

# Map defaults
NEXT_PUBLIC_MAP_DEFAULT_CENTER_LAT=-3.4653
NEXT_PUBLIC_MAP_DEFAULT_CENTER_LNG=-62.2159
NEXT_PUBLIC_MAP_DEFAULT_ZOOM=5
```

---

## Color Theme

Golden brown premium palette (`tailwind.config.ts`):

| Token | Hex | Usage |
|---|---|---|
| `primary-50` | `#faf8f4` | Page backgrounds, card fills |
| `primary-100` | `#f5f0e8` | Borders, subtle fills |
| `primary-300` | `#dbc4a2` | Scrollbar thumb, dividers |
| `primary-500` | `#8c6d2c` | Primary text accents, range thumbs |
| `primary-600` | `#7e6228` | Buttons (default state) |
| `primary-700` | `#695221` | Buttons (hover), active sidebar items |

Clerk primary color: `#8c6d2c` (set in `ClerkProvider` appearance variables).
