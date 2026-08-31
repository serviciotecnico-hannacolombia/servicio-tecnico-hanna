import { useEffect, useState } from 'react';
import type { VoidRecord } from '../types';
import { X, Save } from 'lucide-react';

export function EditVoidModal({ record, onClose, onSave }: { record: VoidRecord | null; onClose: () => void; onSave: (record: VoidRecord) => void }) {
  const [form, setForm] = useState<VoidRecord | null>(record);
  const [activeTab, setActiveTab] = useState<'info' | 'advanced'>('info');

  useEffect(() => {
    setForm(record);
    setActiveTab('info');
  }, [record]);

  if (!form) return null;

  const set = (key: keyof VoidRecord, value: string) => setForm(prev => prev ? { ...prev, [key]: value } : prev);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ background: '#fff', borderRadius: 16, width: 'min(580px, calc(100% - 32px))', padding: 28, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>Editar Registro VOID</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {form.registro_id || form.id}</span>
          </div>
          <button type="button" onClick={onClose} style={{ border: 0, background: '#f1f5f9', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><X size={18} /></button>
        </div>

        {/* Sistema de Pestañas Limpias */}
        <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            style={{ background: 'none', border: 'none', padding: '8px 4px', borderBottom: activeTab === 'info' ? '2px solid #005eb8' : '2px solid transparent', color: activeTab === 'info' ? '#005eb8' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Datos Base y Sellos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            style={{ background: 'none', border: 'none', padding: '8px 4px', borderBottom: activeTab === 'advanced' ? '2px solid #005eb8' : '2px solid transparent', color: activeTab === 'advanced' ? '#005eb8' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Observaciones y Referencia
          </button>
        </div>

        {activeTab === 'info' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#475569', gridColumn: 'span 2' }}>
              Referencia
              <input value={String(form.referencia ?? '')} onChange={e => set('referencia', e.target.value)} style={{ padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 400, fontSize: '0.875rem' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              Número de Serie
              <input value={String(form.numero_serie ?? '')} onChange={e => set('numero_serie', e.target.value)} style={{ padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 400, fontSize: '0.875rem' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              Nombre del Equipo
              <input value={String(form.nombre_equipo ?? '')} onChange={e => set('nombre_equipo', e.target.value)} style={{ padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 400, fontSize: '0.875rem' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              VOID Blanco
              <input value={String(form.void_blanco ?? '')} onChange={e => set('void_blanco', e.target.value)} style={{ padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 400, fontFamily: 'monospace', fontSize: '0.875rem' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              VOID Gris
              <input value={String(form.void_gris ?? '')} onChange={e => set('void_gris', e.target.value)} style={{ padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 400, fontFamily: 'monospace', fontSize: '0.875rem' }} />
            </label>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              Factura / Remisión / OTST
              <input value={String(form.documento_referencia ?? '')} onChange={e => set('documento_referencia', e.target.value)} style={{ padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 400, fontSize: '0.875rem' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              Observaciones
              <textarea rows={3} value={String(form.observaciones ?? '')} onChange={e => set('observaciones', e.target.value)} style={{ padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 400, fontSize: '0.875rem', resize: 'vertical' }} />
            </label>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button type="submit" style={{ padding: '10px 18px', borderRadius: 8, border: 0, background: '#005eb8', color: '#fff', display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600, cursor: 'pointer' }}><Save size={16} /> Guardar Cambios</button>
        </div>
      </form>
    </div>
  );
}