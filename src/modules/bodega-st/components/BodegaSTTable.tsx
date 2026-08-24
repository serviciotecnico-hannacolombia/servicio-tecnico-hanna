import React, { useState } from 'react';
import type { RegistroBodegaST, EstadoRestauracion } from '../types';
import { Search, Wrench, AlertTriangle, CheckCircle, Clock, Edit, Trash2 } from 'lucide-react';

interface BodegaSTTableProps {
  records: RegistroBodegaST[];
  onEdit: (record: RegistroBodegaST) => void;
  onDelete: (record: RegistroBodegaST) => void;
}

export const BodegaSTTable: React.FC<BodegaSTTableProps> = ({ records, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter((rec) => {
    const term = searchTerm.toLowerCase();
    return (
      rec.nombre_equipo?.toLowerCase().includes(term) ||
      rec.numero_serie?.toLowerCase().includes(term) ||
      rec.referencia?.toLowerCase().includes(term) ||
      rec.partes_requeridas?.toLowerCase().includes(term) ||
      rec.ubicacion_estante?.toLowerCase().includes(term)
    );
  });

  const renderEstadoBadge = (estado: EstadoRestauracion) => {
    switch (estado) {
      case 'en_diagnostico':
        return <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Diagnóstico</span>;
      case 'en_reparacion':
        return <span style={{ background: '#e0f2fe', color: '#075985', padding: '3px 8px', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Wrench size={12} /> Reparación</span>;
      case 'incompleto_espera_partes':
        return <span style={{ background: '#ffedd5', color: '#9a3412', padding: '3px 8px', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> Falta Accesorios</span>;
      case 'restaurado_listo':
        return <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Listo para Venta</span>;
    }
  };

  return (
    <div style={{ background: 'var(--surface, #ffffff)', borderRadius: 'var(--radius-lg, 12px)', border: '1px solid var(--border, #e2e8f0)', overflow: 'hidden', boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'var(--surface2, #f8fafc)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text, #0f172a)', margin: 0 }}>Inventario en Bodega ST ({records.length})</h3>
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted, #94a3b8)' }} />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por serie, modelo o repuesto..." style={{ width: '100%', padding: '7px 12px 7px 36px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface2, #f8fafc)', color: 'var(--muted, #64748b)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px' }}>Equipo / Ref</th>
              <th style={{ padding: '12px 16px' }}>Serie</th>
              <th style={{ padding: '12px 16px' }}>Estado</th>
              <th style={{ padding: '12px 16px' }}>Accesorios Faltantes</th>
              <th style={{ padding: '12px 16px' }}>Reparaciones</th>
              <th style={{ padding: '12px 16px' }}>Ubicación</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Bodega ST sin equipos registrados.</td></tr>
            ) : (
              filteredRecords.map((rec, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{rec.nombre_equipo}<span style={{ display: 'block', fontSize: '0.725rem', color: '#64748b', fontFamily: 'monospace' }}>{rec.referencia}</span></td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{rec.numero_serie}</td>
                  <td style={{ padding: '12px 16px' }}>{renderEstadoBadge(rec.estado)}</td>
                  <td style={{ padding: '12px 16px', color: '#c2410c', fontWeight: 500 }}>{rec.partes_requeridas || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{rec.reparaciones_realizadas || '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{rec.ubicacion_estante || '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button title="Editar" onClick={() => onEdit(rec)} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#005eb8', padding: 7, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                      <Edit size={12} /> Editar
                    </button>
                    <button title="Eliminar" onClick={() => onDelete(rec)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#c0392b', padding: 7, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};