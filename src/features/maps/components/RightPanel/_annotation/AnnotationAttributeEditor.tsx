'use client';

import { Plus, Trash2 } from 'lucide-react';
import { MC } from '../../../mapColors';

export interface AnnotationAttribute {
  key: string;
  value: string;
}

export interface AnnotationAttributeEditorProps {
  attributes: AnnotationAttribute[];
  onAdd: () => void;
  onUpdate: (idx: number, key: string, value: string) => void;
  onRemove: (idx: number) => void;
}

const inputStyle: React.CSSProperties = {
  background: MC.inputBg,
  border: `1px solid ${MC.inputBorder}`,
  borderRadius: 5,
  color: MC.text,
  fontSize: 12,
  padding: '6px 8px',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
};

/**
 * Key → value attribute CRUD editor for annotations.
 * Stateless — all reads/writes flow through props.
 */
export function AnnotationAttributeEditor({
  attributes,
  onAdd,
  onUpdate,
  onRemove,
}: AnnotationAttributeEditorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {attributes.length === 0 && (
        <div style={{ fontSize: 11, color: MC.textMuted, fontStyle: 'italic' }}>
          Add key → value pairs for field data.
        </div>
      )}

      {attributes.map((attr, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Key"
            value={attr.key}
            aria-label={`Attribute ${idx + 1} key`}
            onChange={(e) => onUpdate(idx, e.target.value, attr.value)}
            style={{ ...inputStyle, flex: '0 0 38%' }}
          />
          <input
            type="text"
            placeholder="Value"
            value={attr.value}
            aria-label={`Attribute ${idx + 1} value`}
            onChange={(e) => onUpdate(idx, attr.key, e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => onRemove(idx)}
            aria-label={`Remove attribute ${idx + 1}`}
            style={{
              width: 24, height: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              color: MC.textMuted,
              cursor: 'pointer', flexShrink: 0, borderRadius: 3,
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <button
        onClick={onAdd}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          height: 28, padding: '0 10px', width: '100%',
          borderRadius: 5,
          border: `1px dashed ${MC.inputBorder}`,
          background: 'transparent',
          color: MC.textMuted,
          cursor: 'pointer',
          fontSize: 11, fontWeight: 500,
          marginTop: 2,
        }}
      >
        <Plus size={12} />
        Add attribute
      </button>
    </div>
  );
}
