'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { mapsApi } from '@/lib/api/maps';
import { projectsApi } from '@/lib/api/projects';
import { qk } from '@/lib/query-keys';
import type { Project } from '@/types/api';

// ── Topographic preview — reacts to map name ─────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const PALETTES = [
  { bg: '#1c2318', c: '#c4985c', b1: '#2a3424', b2: '#323d2b' },
  { bg: '#1e2520', c: '#a8c4a0', b1: '#283030', b2: '#2e3c38' },
  { bg: '#22201a', c: '#d4b896', b1: '#302c22', b2: '#3a3428' },
  { bg: '#1e1e28', c: '#9098c0', b1: '#282835', b2: '#30303f' },
];

function TopoPreview({ name }: { name: string }) {
  const seed = name
    ? name.split('').reduce((a, c) => a + c.charCodeAt(0), 42)
    : 42;
  const rng = seededRandom(seed);
  const pal = PALETTES[seed % PALETTES.length];

  const W = 320, H = 200;
  const cx = 80 + rng() * 160;
  const cy = 50 + rng() * 100;
  const radii = [90, 70, 52, 36, 22, 11].map((r) => r + rng() * 10 - 5);

  const blobs = Array.from({ length: 5 }, () => ({
    cx: 10 + rng() * (W - 20),
    cy: 10 + rng() * (H - 20),
    rx: 28 + rng() * 50,
    ry: 20 + rng() * 40,
  }));

  const boxX = 30 + rng() * 60;
  const boxY = 20 + rng() * 40;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <rect width={W} height={H} fill={pal.bg} />
      {blobs.map((b, i) => (
        <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry}
          fill={i % 2 === 0 ? pal.b1 : pal.b2} opacity={0.75 + i * 0.05} />
      ))}
      {radii.map((r, i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * 0.66}
          fill="none" stroke={pal.c} strokeWidth="0.65"
          opacity={0.04 + i * 0.065} />
      ))}
      <rect x={boxX} y={boxY} width={24 + rng() * 14} height={16 + rng() * 10}
        fill="none" stroke={pal.c} strokeWidth="0.55"
        strokeDasharray="2.5 1.5" opacity="0.38" />
      {/* Grid overlay — subtle reference lines */}
      {[40, 80, 120, 160].map((x) => (
        <line key={x} x1={x} y1={0} x2={x} y2={H}
          stroke={pal.c} strokeWidth="0.25" opacity="0.06" />
      ))}
      {[50, 100, 150].map((y) => (
        <line key={y} x1={0} y1={y} x2={W} y2={y}
          stroke={pal.c} strokeWidth="0.25" opacity="0.06" />
      ))}
      <circle cx={cx} cy={cy} r="3" fill={pal.c} opacity="0.55" />
      <circle cx={cx} cy={cy} r="1.2" fill={pal.bg} />
      {/* Scale bar */}
      <line x1={W - 48} y1={H - 12} x2={W - 20} y2={H - 12}
        stroke={pal.c} strokeWidth="1" opacity="0.3" />
      <line x1={W - 48} y1={H - 15} x2={W - 48} y2={H - 9}
        stroke={pal.c} strokeWidth="0.8" opacity="0.3" />
      <line x1={W - 20} y1={H - 15} x2={W - 20} y2={H - 9}
        stroke={pal.c} strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

// ── Project picker item ────────────────────────────────────────────────────────

function ProjectOption({
  project,
  selected,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  onSelect: () => void;
}) {
  const seed = project.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pal = PALETTES[seed % PALETTES.length];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 rounded-lg transition-all text-left"
      style={{
        padding: '0.625rem 0.875rem',
        backgroundColor: selected ? '#f0e5d8' : 'transparent',
        border: `1.5px solid ${selected ? '#c4985c' : '#ddd0bc'}`,
      }}
      onMouseEnter={(e) => {
        if (!selected)
          (e.currentTarget as HTMLElement).style.backgroundColor = '#faf5ee';
      }}
      onMouseLeave={(e) => {
        if (!selected)
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {/* Mini topo */}
      <div
        className="shrink-0 rounded overflow-hidden"
        style={{ width: '36px', height: '26px', backgroundColor: pal.bg }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 36 26" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect width="36" height="26" fill={pal.bg} />
          {[14, 9, 5].map((r, i) => (
            <ellipse key={i} cx="16" cy="13" rx={r} ry={r * 0.65}
              fill="none" stroke={pal.c} strokeWidth="0.5"
              opacity={0.08 + i * 0.1} />
          ))}
          <circle cx="16" cy="13" r="1.5" fill={pal.c} opacity="0.6" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{
            fontSize: '0.875rem',
            fontWeight: selected ? 600 : 400,
            color: selected ? '#2e3428' : '#4a3d30',
          }}
        >
          {project.name}
        </p>
        {project.description && (
          <p
            className="truncate"
            style={{ fontSize: '0.75rem', color: '#9a8878', marginTop: '1px' }}
          >
            {project.description}
          </p>
        )}
      </div>

      {selected && (
        <Check
          className="w-4 h-4 shrink-0"
          style={{ color: '#7f5539' }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === step ? '18px' : '6px',
            height: '6px',
            backgroundColor: i === step ? '#7f5539' : i < step ? '#c4985c' : '#d4bfa8',
            transition: 'all 0.3s cubic-bezier(0.2,0,0,1)',
          }}
        />
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewMapPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const presetProjectId = searchParams.get('project') ?? '';

  // If a project was pre-selected via query param → skip to step 1
  const [step, setStep] = useState<0 | 1>(presetProjectId ? 1 : 0);
  const [selectedProjectId, setSelectedProjectId] = useState(presetProjectId);
  const [mapName, setMapName] = useState('');
  const [previewMounted, setPreviewMounted] = useState(false);

  // Fetch projects for picker
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: qk.projects.list(),
    queryFn: () => projectsApi.list(),
    enabled: !presetProjectId, // only fetch if we need the picker
  });

  const projects = projectsData?.items ?? [];

  // Also fetch the preset project for display in step 1 header
  const { data: presetProject } = useQuery({
    queryKey: qk.projects.detail(selectedProjectId),
    queryFn: () => projectsApi.get(selectedProjectId),
    enabled: !!selectedProjectId,
  });

  useEffect(() => {
    if (step === 1) {
      setPreviewMounted(false);
      setTimeout(() => {
        setPreviewMounted(true);
        nameRef.current?.focus();
      }, 60);
    }
  }, [step]);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      mapsApi.create(selectedProjectId, { name: mapName.trim() }),
    onSuccess: (map) => {
      queryClient.invalidateQueries({ queryKey: qk.maps.list(selectedProjectId) });
      toast.success(`"${map.name}" created`);
      router.push(
        `/workspace/${workspaceId}/projects/${selectedProjectId}/maps/${map.id}`,
      );
    },
    onError: () => toast.error('Failed to create map'),
  });

  const canCreate = mapName.trim().length > 0 && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canCreate) mutate();
  }

  const totalSteps = presetProjectId ? 1 : 2;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#f5f0e8',
        fontFamily: 'var(--font-sans, system-ui)',
        display: 'grid',
        gridTemplateColumns: presetProjectId ? '1fr' : '1fr 1fr',
      }}
    >
      {/* ── Left: Form ── */}
      <div
        className="flex flex-col justify-center py-16 px-10"
        style={{ maxWidth: '520px' }}
      >
        {/* Back */}
        <Link
          href={
            presetProjectId
              ? `/workspace/${workspaceId}/projects/${presetProjectId}`
              : `/workspace/${workspaceId}/projects`
          }
          className="inline-flex items-center gap-1.5 mb-10 transition-opacity hover:opacity-60"
          style={{ fontSize: '0.8125rem', color: '#7a6248' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {presetProjectId ? 'Back to project' : 'Projects'}
        </Link>

        {/* Step dots */}
        {totalSteps > 1 && (
          <div className="mb-8">
            <StepDots step={step} total={totalSteps} />
          </div>
        )}

        {/* ── Step 0: Pick project ── */}
        {step === 0 && (
          <div
            style={{
              opacity: step === 0 ? 1 : 0,
              transform: step === 0 ? 'translateY(0)' : 'translateY(-8px)',
              transition: 'opacity 0.25s, transform 0.25s',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-display, Georgia, serif)',
                fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
                fontWeight: 700,
                color: '#1e2419',
                lineHeight: 1.08,
                marginBottom: '6px',
              }}
            >
              New map
            </h1>
            <p
              style={{
                fontSize: '0.9375rem',
                color: '#7a6248',
                marginBottom: '32px',
                lineHeight: 1.5,
              }}
            >
              Choose a project to add this map to.
            </p>

            {projectsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg"
                    style={{
                      height: '56px',
                      backgroundColor: '#ede4d8',
                    }}
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div
                className="rounded-xl py-10 text-center"
                style={{ border: '1.5px dashed #d4bfa8', backgroundColor: '#faf5ee' }}
              >
                <p style={{ fontSize: '0.875rem', color: '#9a8878', marginBottom: '16px' }}>
                  No projects yet. Create one first.
                </p>
                <Link
                  href={`/workspace/${workspaceId}/projects/new`}
                  className="inline-flex items-center gap-1.5 rounded-lg font-semibold"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#7f5539',
                    color: '#f5ede0',
                  }}
                >
                  Create a project
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <ProjectOption
                    key={p.id}
                    project={p}
                    selected={selectedProjectId === p.id}
                    onSelect={() => setSelectedProjectId(p.id)}
                  />
                ))}
              </div>
            )}

            <div className="mt-8">
              <button
                type="button"
                disabled={!selectedProjectId}
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-lg font-semibold transition-all"
                style={{
                  padding: '0.625rem 1.375rem',
                  fontSize: '0.9375rem',
                  backgroundColor: selectedProjectId ? '#7f5539' : '#c4b09c',
                  color: '#f5ede0',
                  cursor: selectedProjectId ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={(e) => {
                  if (selectedProjectId)
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#6b4730';
                }}
                onMouseLeave={(e) => {
                  if (selectedProjectId)
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#7f5539';
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Name the map ── */}
        {step === 1 && (
          <form onSubmit={handleSubmit}>
            {presetProject && (
              <p
                className="inline-flex items-center gap-1.5 rounded-full mb-6"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  padding: '3px 10px',
                  backgroundColor: '#ede4d8',
                  color: '#7f5539',
                }}
              >
                {presetProject.name}
              </p>
            )}

            <h1
              style={{
                fontFamily: 'var(--font-display, Georgia, serif)',
                fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
                fontWeight: 700,
                color: '#1e2419',
                lineHeight: 1.08,
                marginBottom: '6px',
              }}
            >
              Name your map
            </h1>
            <p
              style={{
                fontSize: '0.9375rem',
                color: '#7a6248',
                marginBottom: '32px',
                lineHeight: 1.5,
              }}
            >
              Each map has its own layers, annotations, and AI runs.
            </p>

            <div className="mb-6">
              <label
                htmlFor="map-name"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: '#9a8878',
                  marginBottom: '8px',
                }}
              >
                Map name
              </label>
              <input
                ref={nameRef}
                id="map-name"
                type="text"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder="e.g. Canopy Density — Sector 4"
                maxLength={120}
                autoComplete="off"
                className="w-full rounded-lg outline-none transition-all"
                style={{
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  color: '#1e2419',
                  backgroundColor: '#fff9f3',
                  border: '1.5px solid #d4bfa8',
                  caretColor: '#7f5539',
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#7f5539';
                  (e.target as HTMLInputElement).style.boxShadow =
                    '0 0 0 3px rgba(127,85,57,0.1)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#d4bfa8';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              {!presetProjectId && (
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="inline-flex items-center gap-1.5 rounded-lg transition-all"
                  style={{
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.9375rem',
                    color: '#7a6248',
                    background: 'none',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = '#4a3828')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = '#7a6248')
                  }
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}

              <button
                type="submit"
                disabled={!canCreate}
                className="inline-flex items-center gap-2 rounded-lg font-semibold transition-all"
                style={{
                  padding: '0.625rem 1.375rem',
                  fontSize: '0.9375rem',
                  backgroundColor: canCreate ? '#7f5539' : '#c4b09c',
                  color: '#f5ede0',
                  cursor: canCreate ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={(e) => {
                  if (canCreate)
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#6b4730';
                }}
                onMouseLeave={(e) => {
                  if (canCreate)
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#7f5539';
                }}
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Open in map editor
              </button>

              {presetProjectId && (
                <Link
                  href={`/workspace/${workspaceId}/projects/${presetProjectId}`}
                  className="inline-flex items-center rounded-lg transition-all"
                  style={{
                    padding: '0.625rem 1rem',
                    fontSize: '0.9375rem',
                    color: '#7a6248',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = '#4a3828')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = '#7a6248')
                  }
                >
                  Cancel
                </Link>
              )}
            </div>
          </form>
        )}
      </div>

      {/* ── Right: Topo preview (only when not presetProjectId, or always show on step 1) ── */}
      {!presetProjectId && (
        <div
          className="relative overflow-hidden"
          style={{ backgroundColor: '#1c2318', minHeight: '100vh' }}
        >
          {/* Faint grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(196,152,92,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(196,152,92,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
            aria-hidden="true"
          />

          {/* Map preview */}
          <div
            className="absolute inset-8 rounded-2xl overflow-hidden"
            style={{
              border: '1px solid rgba(196,152,92,0.12)',
              opacity: previewMounted ? 1 : 0,
              transform: previewMounted ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(12px)',
              transition: 'opacity 0.5s cubic-bezier(0.2,0,0,1), transform 0.5s cubic-bezier(0.2,0,0,1)',
            }}
            aria-hidden="true"
          >
            <TopoPreview name={mapName || 'preview'} />

            {/* Map name overlay */}
            {mapName && (
              <div
                className="absolute bottom-0 inset-x-0 px-5 py-4"
                style={{
                  background:
                    'linear-gradient(to top, rgba(28,35,24,0.9) 0%, transparent 100%)',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-display, Georgia, serif)',
                    fontSize: '1.0625rem',
                    fontWeight: 600,
                    color: '#f5ede0',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {mapName}
                </p>
                {presetProject && (
                  <p style={{ fontSize: '0.75rem', color: 'rgba(245,237,224,0.55)', marginTop: '2px' }}>
                    {presetProject.name}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Corner coordinates decoration */}
          <div
            className="absolute top-4 left-4"
            style={{ fontSize: '0.625rem', color: 'rgba(196,152,92,0.3)', fontFamily: 'monospace' }}
            aria-hidden="true"
          >
            {['0°00′N', '0°00′E'].join('  ')}
          </div>
          <div
            className="absolute bottom-4 right-4"
            style={{ fontSize: '0.625rem', color: 'rgba(196,152,92,0.3)', fontFamily: 'monospace' }}
            aria-hidden="true"
          >
            {['z=3', '1:10M'].join('  ')}
          </div>
        </div>
      )}
    </div>
  );
}
