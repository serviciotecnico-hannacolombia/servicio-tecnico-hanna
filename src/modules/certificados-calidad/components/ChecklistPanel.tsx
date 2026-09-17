import { Copy, Plus, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { copyToClipboard } from '../utils/clipboard';
import { CHECKLIST_BASE, type ChecklistState } from '../types';

interface ChecklistPanelProps {
  checklist: ChecklistState;
  onChange: (checklist: ChecklistState) => void;
}

type SectionKey = 'test_funcional' | 'embalaje' | 'control_estetico';
type ExtraKey = 'extra_test_funcional' | 'extra_embalaje' | 'extra_control_estetico';

const SECTIONS: { key: SectionKey; extraKey: ExtraKey; label: string }[] = [
  { key: 'test_funcional', extraKey: 'extra_test_funcional', label: 'Test Funcional' },
  { key: 'embalaje', extraKey: 'extra_embalaje', label: 'Embalaje' },
  { key: 'control_estetico', extraKey: 'extra_control_estetico', label: 'Control Estético' },
];

function summarize(checklist: ChecklistState): string {
  return SECTIONS.map(({ key, extraKey, label }) => {
    const checked = Object.entries(checklist[key]).filter(([, v]) => v).map(([k]) => k);
    const extras = checklist[extraKey];
    const items = [...checked, ...extras];
    return `${label}:\n${items.length ? items.map(i => `- ${i}`).join('\n') : '(sin ítems marcados)'}`;
  }).join('\n\n');
}

export function ChecklistPanel({ checklist, onChange }: ChecklistPanelProps) {
  const toggle = (key: SectionKey, item: string) => {
    onChange({ ...checklist, [key]: { ...checklist[key], [item]: !checklist[key][item] } });
  };

  const addExtra = (extraKey: ExtraKey) => {
    onChange({ ...checklist, [extraKey]: [...checklist[extraKey], ''] });
  };

  const updateExtra = (extraKey: ExtraKey, i: number, value: string) => {
    const next = checklist[extraKey].slice();
    next[i] = value;
    onChange({ ...checklist, [extraKey]: next });
  };

  const removeExtra = (extraKey: ExtraKey, i: number) => {
    onChange({ ...checklist, [extraKey]: checklist[extraKey].filter((_, idx) => idx !== i) });
  };

  return (
    <div>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12 }}>
        Active el checkbox de los ítems revisados. Puede agregar otros ítems escribiéndolos en los cuadros de texto.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(summarize(checklist), 'Resumen de checklist')}>
          <Copy size={13} /> Copiar resumen
        </Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
        {SECTIONS.map(({ key, extraKey, label }) => (
          <div key={key}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{label}</h4>
            {CHECKLIST_BASE[key].map(item => (
              <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', marginBottom: 6, cursor: 'pointer', color: 'var(--text)' }}>
                <input type="checkbox" checked={!!checklist[key][item]} onChange={() => toggle(key, item)} />
                {item}
              </label>
            ))}
            {checklist[extraKey].map((val, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <input
                  value={val}
                  onChange={e => updateExtra(extraKey, i, e.target.value)}
                  placeholder="Otro ítem..."
                  style={{
                    flex: 1, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.78rem',
                  }}
                />
                <button onClick={() => removeExtra(extraKey, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addExtra(extraKey)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600, padding: 0,
              }}
            >
              <Plus size={13} /> Agregar ítem
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
