'use client';

import { toast } from 'sonner';
import { useMapLayersStore } from '@/stores/mapLayersStore';
import { useMapStore } from '@/stores/mapStore';
import { MC } from '../../mapColors';
import { AnnotationGeometryPreview } from './_annotation/AnnotationGeometryPreview';
import { AnnotationStylePicker } from './_annotation/AnnotationStylePicker';
import { AnnotationAttributeEditor } from './_annotation/AnnotationAttributeEditor';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: MC.inputBg,
  border: `1px solid ${MC.inputBorder}`,
  borderRadius: 5,
  color: MC.text,
  fontSize: 12,
  padding: '6px 8px',
  outline: 'none',
  boxSizing: 'border-box',
};

export function NewAnnotationPanel() {
  const pending      = useMapLayersStore((s) => s.pendingAnnotation);
  const setField     = useMapLayersStore((s) => s.setPendingAnnotationField);
  const setStyle     = useMapLayersStore((s) => s.setPendingAnnotationStyle);
  const addAttr      = useMapLayersStore((s) => s.addPendingAnnotationAttribute);
  const updateAttr   = useMapLayersStore((s) => s.updatePendingAnnotationAttribute);
  const removeAttr   = useMapLayersStore((s) => s.removePendingAnnotationAttribute);
  const clearPending = useMapLayersStore((s) => s.clearPendingAnnotation);

  const drawnShapeType    = useMapStore((s) => s.drawnShapeType);
  const drawnGeometry     = useMapStore((s) => s.drawnGeometry);
  const drawnCircleRadius = useMapStore((s) => s.drawnCircleRadius);

  if (!pending) return null;

  const isPoint = drawnShapeType === 'point';

  const handleCancel = () => {
    useMapStore.getState().setDrawnGeometry(null);
    clearPending();
  };

  const handleSave = () => {
    if (!pending.label.trim()) {
      toast.error('Label is required');
      return;
    }
    // TODO: POST to /annotations API
    toast.success('Annotation saved (demo)');
    useMapStore.getState().setDrawnGeometry(null);
    clearPending();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* ── Geometry stats — self-contained, returns null if nothing to show ── */}
      <AnnotationGeometryPreview
        shapeType={drawnShapeType}
        geometry={drawnGeometry}
        circleRadius={drawnCircleRadius}
      />

      {/* ── Style — hidden for point markers ──────────────────────────────── */}
      {!isPoint && (
        <Section title="Style">
          <AnnotationStylePicker
            style={pending.style}
            shapeType={drawnShapeType}
            onChange={setStyle}
          />
        </Section>
      )}

      {/* ── Label & description ───────────────────────────────────────────── */}
      <Section title="Label">
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: MC.sectionLabel, marginBottom: 4 }}>
            Label <span style={{ color: MC.danger }}>*</span>
          </div>
          <input
            type="text"
            placeholder="e.g. Mature Canopy, Burn Area…"
            value={pending.label}
            aria-label="Annotation label"
            aria-required="true"
            onChange={(e) => setField({ label: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: MC.sectionLabel, marginBottom: 4 }}>Description</div>
          <textarea
            placeholder="Optional notes about this annotation"
            value={pending.description}
            aria-label="Annotation description"
            onChange={(e) => setField({ description: e.target.value })}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.4' }}
          />
        </div>
      </Section>

      {/* ── Custom attributes ─────────────────────────────────────────────── */}
      <Section title="Attributes">
        <AnnotationAttributeEditor
          attributes={pending.attributes}
          onAdd={addAttr}
          onUpdate={updateAttr}
          onRemove={removeAttr}
        />
      </Section>

      {/* ── Footer actions ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 8,
        padding: '12px 14px 16px',
        borderTop: `1px solid ${MC.border}`,
        flexShrink: 0, marginTop: 'auto',
      }}>
        <button
          onClick={handleCancel}
          aria-label="Cancel annotation"
          style={{
            flex: 1, height: 34, borderRadius: 5,
            border: `1px solid ${MC.border}`,
            background: 'transparent',
            color: MC.textMuted,
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          aria-label="Save annotation"
          style={{
            flex: 2, height: 34, borderRadius: 5,
            border: `1.5px solid ${MC.accent}`,
            background: MC.accentDim,
            color: MC.accent,
            cursor: 'pointer', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.03em',
          }}
        >
          Save Annotation
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderBottom: `1px solid ${MC.border}`,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: MC.sectionLabel,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}
