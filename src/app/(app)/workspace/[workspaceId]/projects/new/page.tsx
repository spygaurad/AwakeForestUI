'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { projectsApi } from '@/lib/api/projects';
import { qk } from '@/lib/query-keys';

// ── Seeded topographic background ────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function TopoBackground({ name }: { name: string }) {
  const seed = name
    ? name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    : 42;
  const rng = seededRandom(seed);

  const cx = 60 + rng() * 80;
  const cy = 50 + rng() * 50;
  const radii = [120, 96, 74, 54, 36, 20].map((r) => r + rng() * 12 - 6);

  const blobs = Array.from({ length: 5 }, () => ({
    cx: 10 + rng() * 280,
    cy: 10 + rng() * 130,
    rx: 24 + rng() * 40,
    ry: 18 + rng() * 32,
  }));

  return (
    <svg
      viewBox="0 0 300 150"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="300" height="150" fill="#1c2318" />
      {blobs.map((b, i) => (
        <ellipse
          key={i}
          cx={b.cx} cy={b.cy}
          rx={b.rx} ry={b.ry}
          fill={i % 2 === 0 ? '#2a3424' : '#323d2b'}
          opacity={0.7 + i * 0.06}
        />
      ))}
      {radii.map((r, i) => (
        <ellipse
          key={i}
          cx={cx} cy={cy}
          rx={r} ry={r * 0.65}
          fill="none"
          stroke="#c4985c"
          strokeWidth="0.6"
          opacity={0.05 + i * 0.055}
        />
      ))}
      <circle cx={cx} cy={cy} r="3" fill="#c4985c" opacity="0.5" />
      <circle cx={cx} cy={cy} r="1.2" fill="#1c2318" />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewProjectPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => nameRef.current?.focus(), 80);
  }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      projectsApi.create({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: qk.projects.list() });
      toast.success(`"${project.name}" created`);
      router.push(`/workspace/${workspaceId}/projects/${project.id}`);
    },
    onError: () => toast.error('Failed to create project'),
  });

  const canSubmit = name.trim().length > 0 && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canSubmit) mutate();
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#f5f0e8', fontFamily: 'var(--font-sans, system-ui)' }}
    >
      {/* ── Topographic hero strip ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: '150px' }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: mounted ? 1 : 0 }}
        >
          <TopoBackground name={name} />
        </div>
        {/* Fade to page bg at bottom */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: '60px',
            background: 'linear-gradient(to bottom, transparent, #f5f0e8)',
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-8 pb-16" style={{ maxWidth: '560px' }}>
        {/* Back link */}
        <Link
          href={`/workspace/${workspaceId}/projects`}
          className="inline-flex items-center gap-1.5 mb-8 transition-opacity hover:opacity-60"
          style={{ fontSize: '0.8125rem', color: '#7a6248' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Projects
        </Link>

        <h1
          style={{
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontSize: 'clamp(1.875rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: '#1e2419',
            lineHeight: 1.08,
            marginBottom: '6px',
          }}
        >
          New project
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: '#7a6248',
            marginBottom: '40px',
            lineHeight: 1.5,
          }}
        >
          Projects organise maps, datasets, and team in one place.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label
              htmlFor="project-name"
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
              Name
            </label>
            <input
              ref={nameRef}
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amazon Basin — Canopy Survey 2024"
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
                (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(127,85,57,0.1)';
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = '#d4bfa8';
                (e.target as HTMLInputElement).style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="project-description"
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
              Description
              <span
                style={{
                  marginLeft: '6px',
                  fontSize: '0.6875rem',
                  fontWeight: 400,
                  textTransform: 'none',
                  letterSpacing: 0,
                  color: '#b5a494',
                }}
              >
                optional
              </span>
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are the goals of this project?"
              rows={3}
              maxLength={500}
              className="w-full rounded-lg outline-none transition-all resize-none"
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.9375rem',
                color: '#1e2419',
                backgroundColor: '#fff9f3',
                border: '1.5px solid #d4bfa8',
                lineHeight: 1.55,
              }}
              onFocus={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = '#7f5539';
                (e.target as HTMLTextAreaElement).style.boxShadow = '0 0 0 3px rgba(127,85,57,0.1)';
              }}
              onBlur={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = '#d4bfa8';
                (e.target as HTMLTextAreaElement).style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg font-semibold transition-all"
              style={{
                padding: '0.625rem 1.375rem',
                fontSize: '0.9375rem',
                backgroundColor: canSubmit ? '#7f5539' : '#c4b09c',
                color: '#f5ede0',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.15s, opacity 0.15s',
              }}
              onMouseEnter={(e) => {
                if (canSubmit)
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#6b4730';
              }}
              onMouseLeave={(e) => {
                if (canSubmit)
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#7f5539';
              }}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create project
            </button>

            <Link
              href={`/workspace/${workspaceId}/projects`}
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
          </div>
        </form>
      </div>
    </div>
  );
}
