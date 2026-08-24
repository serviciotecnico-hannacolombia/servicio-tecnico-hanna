import { useEffect, useState } from 'react';
import type { VoidRecord } from '../types';
import { X, Save } from 'lucide-react';

export function EditVoidModal({ record, onClose, onSave }: { record: VoidRecord | null; onClose: () => void; onSave: (record: VoidRecord) => void }) {
  const [form, setForm] = useState<VoidRecord | null>(record);
  useEffect(() => setForm(record), [record]);
  if (!form) return null;
  const set = (key: keyof VoidRecord, value: string) => setForm(prev => prev ? { ...prev, [key]: value } : prev);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ background: '#fff', borderRadius: 12, width: 'min(600px, calc(100% - 32px))', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>Editar registro VOID</h3><button type="button" onClick={onClose} style={{ border: 0, background: 'none', cursor: 'pointer' }}><X size={20} /></button></div>
        {([['referencia', 'Referencia'], ['numero_serie', 'Número de serie'], ['nombre_equipo', 'Equipo'], ['void_blanco', 'VOID Blanco'], ['void_gris', 'VOID Gris'], ['documento_referencia', 'Factura / Remisión / OTST'], ['observaciones', 'Observaciones']] as [keyof VoidRecord, string][]).map(([key, label]) => (
          <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>{label}<input value={String(form[key] ?? '')} onChange={e => set(key, e.target.value)} style={{ padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 7, fontWeight: 400 }} /></label>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}><button type="button" onClick={onClose} style={{ padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#f8fafc' }}>Cancelar</button><button type="submit" style={{ padding: '9px 14px', border: 0, borderRadius: 7, background: '#005eb8', color: '#fff', display: 'flex', gap: 6, alignItems: 'center' }}><Save size={15} /> Guardar</button></div>
      </form>
    </div>
  );
}