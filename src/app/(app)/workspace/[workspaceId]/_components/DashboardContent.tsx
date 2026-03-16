'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  X,
  ArrowRight,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Map,
  Database,
  Upload,
  Plus,
} from 'lucide-react';

// ── Topographic thumbnail generator ──────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const PALETTES = [
  { bg: '#2e3428', contour: '#c4985c', blob1: '#414833', blob2: '#4a5240', accent: '#7f5539' },
  { bg: '#3a2c1e', contour: '#d4b896', blob1: '#5a3e2a', blob2: '#6b4c33', accent: '#a68a64' },
  { bg: '#1e2e28', contour: '#a8c4a0', blob1: '#2a4030', blob2: '#365040', accent: '#656d4a' },
  { bg: '#28241c', contour: '#c4b480', blob1: '#3a3420', blob2: '#48422a', accent: '#7a6d4a' },
];

function TopoThumbnail({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRandom(seed);
  const pal = PALETTES[seed % PALETTES.length];

  const cx = 50 + rng() * 60 - 30;
  const cy = 50 + rng() * 40 - 20;
  const radii = [60, 47, 35, 24, 14].map((r) => r + rng() * 8 - 4);

  // Generate 3 organic blobs
  const blobs = Array.from({ length: 3 }, (_, i) => ({
    cx: 30 + rng() * 80,
    cy: 25 + rng() * 60,
    rx: 12 + rng() * 20,
    ry: 10 + rng() * 18,
  }));

  // Detection box
  const boxX = 25 + rng() * 50;
  const boxY = 20 + rng() * 40;

  return (
    <svg
      viewBox="0 0 160 110"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <rect width="160" height="110" fill={pal.bg} />

      {/* Canopy blobs */}
      {blobs.map((b, i) => (
        <ellipse
          key={i}
          cx={b.cx} cy={b.cy}
          rx={b.rx} ry={b.ry}
          fill={i % 2 === 0 ? pal.blob1 : pal.blob2}
          opacity={0.85 + i * 0.05}
        />
      ))}

      {/* Topographic contour rings */}
      {radii.map((r, i) => (
        <ellipse
          key={i}
          cx={cx} cy={cy}
          rx={r} ry={r * 0.7}
          fill="none"
          stroke={pal.contour}
          strokeWidth="0.5"
          opacity={0.12 + i * 0.06}
        />
      ))}

      {/* Change detection box */}
      <rect
        x={boxX} y={boxY}
        width={22 + rng() * 15} height={16 + rng() * 10}
        fill="none"
        stroke={pal.contour}
        strokeWidth="0.6"
        strokeDasharray="2.5 1.5"
        opacity={0.45}
      />

      {/* Scale bar */}
      <line x1="10" y1="100" x2="30" y2="100" stroke={pal.contour} strokeWidth="1" opacity="0.3" />
      <line x1="10" y1="97" x2="10" y2="103" stroke={pal.contour} strokeWidth="0.8" opacity="0.3" />
      <line x1="30" y1="97" x2="30" y2="103" stroke={pal.contour} strokeWidth="0.8" opacity="0.3" />

      {/* Center marker */}
      <circle cx={cx} cy={cy} r="2.5" fill={pal.contour} opacity="0.6" />
      <circle cx={cx} cy={cy} r="1" fill={pal.bg} />
    </svg>
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const RECENT_MAPS = [
  {
    id: '1',
    name: 'Amazon Basin — Canopy Density',
    project: 'Deforestation Watch',
    updatedAt: '2 hours ago',
    author: 'Field Team Alpha',
  },
  {
    id: '2',
    name: 'Borneo LIDAR Survey Q1',
    project: 'Borneo Conservation',
    updatedAt: '5 hours ago',
    author: 'Remote Sensing Lab',
  },
  {
    id: '3',
    name: 'Congo Biomass Estimation',
    project: 'Africa Initiative',
    updatedAt: '1 day ago',
    author: 'AI Models Team',
  },
  {
    id: '4',
    name: 'Sumatran Tiger Corridor',
    project: 'Wildlife Corridors',
    updatedAt: '2 days ago',
    author: 'Field Team Beta',
  },
  {
    id: '5',
    name: 'Atlantic Forest NDVI 2024',
    project: 'Brazil Recovery',
    updatedAt: '3 days ago',
    author: 'Analysis Team',
  },
];

type JobStatus = 'running' | 'completed' | 'failed';

const RECENT_ACTIVITY: { id: string; label: string; time: string; status: JobStatus }[] = [
  { id: 'j1', label: 'Detection inference on Amazon Basin dataset', time: '14 min ago', status: 'completed' },
  { id: 'j2', label: 'Bulk annotation export — Congo Set A', time: '1 hour ago', status: 'completed' },
  { id: 'j3', label: 'STAC ingestion — Sentinel-2 Jan 2024', time: '2 hours ago', status: 'running' },
  { id: 'j4', label: 'Change detection — Borneo vs. 2023 baseline', time: '5 hours ago', status: 'failed' },
  { id: 'j5', label: 'Annotation schema sync from CSV', time: '1 day ago', status: 'completed' },
];

const QUICK_ACTIONS = [
  { icon: Map, label: 'New map', href: 'map/new' },
  { icon: Database, label: 'Add dataset', href: 'datasets/new' },
  { icon: Upload, label: 'Upload raster', href: 'datasets/new?upload=1' },
];

function StatusIcon({ status, className, style }: { status: JobStatus; className?: string; style?: React.CSSProperties }) {
  if (status === 'running') return <Loader2 className={`${className ?? ''} animate-spin`} style={style} />;
  if (status === 'failed') return <AlertCircle className={className} style={style} />;
  return <CheckCircle2 className={className} style={style} />;
}

const STATUS_COLOR: Record<JobStatus, string> = {
  running: '#a68a64',
  completed: '#656d4a',
  failed: '#b35e4c',
};

// ── Dashboard ────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

interface DashboardContentProps {
  workspaceId: string;
  firstName: string;
}

export function DashboardContent({ workspaceId, firstName }: DashboardContentProps) {
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const base = `/workspace/${workspaceId}`;

  return (
    <div
      className="max-w-5xl mx-auto py-10 px-10"
      style={{ fontFamily: 'var(--font-sans, system-ui)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#9a8878',
              marginBottom: '4px',
            }}
          >
            {getGreeting()}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display, Georgia, serif)',
              fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
              fontWeight: 700,
              color: '#2e3428',
              lineHeight: 1.1,
            }}
          >
            {firstName}.
          </h1>
        </div>

        {/* <div className="flex items-center gap-2 mt-1">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={`${base}/${action.href}`}
              className="inline-flex items-center gap-1.5 rounded-lg transition-all"
              style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                padding: '0.4375rem 0.875rem',
                backgroundColor: '#7f5539',
                color: '#f5ede0',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor = '#6b4730')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor = '#7f5539')
              }
            >
              <action.icon className="w-3.5 h-3.5" aria-hidden="true" />
              {action.label}
            </Link>
          ))}
        </div> */}
      </div>

      {/* ── Welcome strip (dismissable) ── */}
      {!welcomeDismissed && (
        <div
          className="flex items-start justify-between gap-4 rounded-xl mb-10 px-5 py-4"
          style={{ backgroundColor: '#ede0d4', border: '1px solid #d4c0a8' }}
        >
          <div className="flex-1">
            <p
              style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2e3428', marginBottom: '6px' }}
            >
              Welcome to AwakeForest
            </p>
            <div className="flex items-center gap-6">
              {[
                { step: '01', label: 'Create a project', href: `${base}/projects/new` },
                { step: '02', label: 'Upload a dataset', href: `${base}/datasets/new` },
                { step: '03', label: 'Run AI inference', href: `${base}/inference` },
              ].map((item) => (
                <Link
                  key={item.step}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-70"
                  style={{ fontSize: '0.8125rem', color: '#7f5539' }}
                >
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontFamily: 'monospace',
                      color: '#9a8878',
                      minWidth: '18px',
                    }}
                  >
                    {item.step}
                  </span>
                  {item.label}
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
          <button
            onClick={() => setWelcomeDismissed(true)}
            aria-label="Dismiss welcome"
            className="shrink-0 transition-opacity hover:opacity-60"
            style={{ color: '#9a8878', marginTop: '1px' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Recent maps ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#9a8878',
            }}
          >
            Recent maps
          </h2>
          <Link
            href={`${base}/map`}
            style={{ fontSize: '0.8125rem', color: '#7f5539' }}
            className="transition-opacity hover:opacity-70"
          >
            View all
          </Link>
        </div>

        {/* Horizontal scroll list */}
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          {RECENT_MAPS.map((map) => (
            <Link
              key={map.id}
              href={`${base}/map/${map.id}`}
              className="group shrink-0 flex flex-col rounded-xl overflow-hidden transition-all hover:shadow-md"
              style={{
                width: '200px',
                border: '1px solid #d4c0a8',
                backgroundColor: '#fff9f4',
              }}
            >
              {/* Topo thumbnail */}
              <div className="relative overflow-hidden" style={{ height: '120px' }}>
                <TopoThumbnail
                  name={map.name}
                  
                  className="w-full h-full transition-transform group-hover:scale-105"
                  style={{ transition: 'transform 0.35s cubic-bezier(0.2,0,0,1)' }}
                />
                {/* Hover overlay */}
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'rgba(46,52,40,0.35)' }}
                >
                  <span
                    className="rounded-lg px-3 py-1"
                    style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f5ede0', color: '#2e3428' }}
                  >
                    Open
                  </span>
                </div>
              </div>

              {/* Meta */}
              <div className="px-3 py-2.5">
                <p
                  className="truncate"
                  style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#2e3428', marginBottom: '2px' }}
                >
                  {map.name}
                </p>
                <p
                  className="truncate"
                  style={{ fontSize: '0.75rem', color: '#9a8878' }}
                >
                  {map.project}
                </p>
                <div
                  className="flex items-center gap-1 mt-1.5"
                  style={{ fontSize: '0.6875rem', color: '#b0a090' }}
                >
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {map.updatedAt}
                </div>
              </div>
            </Link>
          ))}

          {/* New map card */}
          <Link
            href={`${base}/map/new`}
            className="shrink-0 flex flex-col items-center justify-center rounded-xl transition-all hover:shadow-md"
            style={{
              width: '200px',
              height: '183px',
              border: '1.5px dashed #d4c0a8',
              color: '#9a8878',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#7f5539';
              (e.currentTarget as HTMLElement).style.color = '#7f5539';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#d4c0a8';
              (e.currentTarget as HTMLElement).style.color = '#9a8878';
            }}
          >
            <Plus className="w-5 h-5 mb-2" aria-hidden="true" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>New map</span>
          </Link>
        </div>
      </section>

      {/* ── Activity ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#9a8878',
            }}
          >
            Recent activity
          </h2>
          <Link
            href={`${base}/jobs`}
            style={{ fontSize: '0.8125rem', color: '#7f5539' }}
            className="transition-opacity hover:opacity-70"
          >
            All jobs
          </Link>
        </div>

        <div className="space-y-px">
          {RECENT_ACTIVITY.map((job, i) => (
              <div
                key={job.id}
                className="flex items-center gap-3 py-3"
                style={{
                  borderTop: i === 0 ? '1px solid #e8d8c4' : 'none',
                  borderBottom: '1px solid #e8d8c4',
                }}
              >
                <StatusIcon
                  status={job.status}
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: STATUS_COLOR[job.status] }}
                />
                <p
                  className="flex-1 truncate"
                  style={{ fontSize: '0.8125rem', color: '#4a3d30' }}
                >
                  {job.label}
                </p>
                <span
                  style={{ fontSize: '0.6875rem', color: '#9a8878', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {job.time}
                </span>
              </div>
          ))}
        </div>

        <Link
          href={`${base}/jobs`}
          className="inline-flex items-center gap-1.5 mt-5 transition-opacity hover:opacity-70"
          style={{ fontSize: '0.8125rem', color: '#7f5539' }}
        >
          View all jobs
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
