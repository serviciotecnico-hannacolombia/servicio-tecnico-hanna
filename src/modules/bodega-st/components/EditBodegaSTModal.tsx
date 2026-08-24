import React, { useState } from 'react';
import type { RegistroBodegaST, EstadoRestauracion } from '../types';
import { UBICACIONES_BODEGA_ST } from '../types';
import { X, Save } from 'lucide-react';

interface EditBodegaSTModalProps {
  record: RegistroBodegaST | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedRecord: RegistroBodegaST) => void;
}

export const EditBodegaSTModal: React.FC<EditBodegaSTModalProps> = ({ record, isOpen, onClose, onUpdate }) => {
  const [prevRecordId, setPrevRecordId] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoRestauracion>('en_diagnostico');
  const [partesRequeridas, setPartesRequeridas] = useState('');
  const [reparaciones, setReparaciones] = useState('');
  const [ubicacion, setUbicacion] = useState(UBICACIONES_BODEGA_ST[0]);
  const [observaciones, setObservaciones] = useState('');

  if (record && record.numero_serie !== prevRecordId) {
    setPrevRecordId(record.numero_serie);
    setEstado(record.estado);
    setPartesRequeridas(record.partes_requeridas || '');
    setReparaciones(record.reparaciones_realizadas || '');
    setUbicacion(record.ubicacion_estante || UBICACIONES_BODEGA_ST[0]);
    setObservaciones(record.observaciones || '');
  }

  if (!isOpen || !record) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...record,
      estado,
      partes_requeridas: partesRequeridas,
      reparaciones_realizadas: reparaciones,
      ubicacion_estante: ubicacion,
      observaciones
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 550, padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Actualizar Estado de Restauración</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{record.nombre_equipo} ({record.numero_serie})</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Estado Actual</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoRestauracion)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }}>
              <option value="en_diagnostico">🔍 En Diagnóstico</option>
              <option value="en_reparacion">⚙️ En Reparación</option>
              <option value="incompleto_espera_partes">🧩 Incompleto (Espera Accesorios/Partes)</option>
              <option value="restaurado_listo">✅ Restaurado (Listo para Bodega Principal)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Partes / Accesorios Faltantes</label>
            <input type="text" value={partesRequeridas} onChange={(e) => setPartesRequeridas(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Reparaciones Realizadas</label>
            <input type="text" value={reparaciones} onChange={(e) => setReparaciones(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Ubicación en Bodega ST</label>
            <select value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }}>
              {UBICACIONES_BODEGA_ST.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Observaciones</label>
            <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#005eb8', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Save size={16} /> Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
};