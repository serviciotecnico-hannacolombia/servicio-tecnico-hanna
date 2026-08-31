import React, { useState } from 'react';
import type { VoidRecord } from '../types';
import { Search, FileText, Shield, Pencil, Trash2 } from 'lucide-react';

interface VoidTableProps {
  records: VoidRecord[];
  onEdit: (record: VoidRecord) => void;
  onDelete: (record: VoidRecord) => void;
}

const truncateText = (text: string | undefined | null, maxLength: number = 30) => {
  if (!text) return '—';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

export const VoidTable: React.FC<VoidTableProps> = ({ records, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter((rec) => {
    const term = searchTerm.toLowerCase();
    return (
      rec.nombre_equipo?.toLowerCase().includes(term) ||
      rec.numero_serie?.toLowerCase().includes(term) ||
      rec.referencia?.toLowerCase().includes(term) ||
      rec.void_blanco?.toLowerCase().includes(term) ||
      rec.void_gris?.toLowerCase().includes(term) ||
      rec.documento_referencia?.toLowerCase().includes(term) ||
      rec.observaciones?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: '#f8fafc' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Registros de Equipos Escaneados ({records.length})
        </h3>
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por serie, VOID u observaciones..."
            style={{ width: '100%', padding: '7px 12px 7px 36px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.8rem', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px' }}>ID</th>
              <th style={{ padding: '12px 16px' }}>Equipo / Ref</th>
              <th style={{ padding: '12px 16px' }}>Serie</th>
              <th style={{ padding: '12px 16px' }}>Factura / OTST</th>
              <th style={{ padding: '12px 16px' }}>VOID Blanco</th>
              <th style={{ padding: '12px 16px' }}>VOID Gris</th>
              <th style={{ padding: '12px 16px' }}>Observaciones</th>
              <th style={{ padding: '12px 16px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No hay registros guardados aún.</td></tr>
            ) : (
              filteredRecords.map((rec, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b' }}>{rec.registro_id || rec.id || '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {rec.nombre_equipo || 'Equipo'}
                    <span style={{ display: 'block', fontSize: '0.725rem', color: '#64748b', fontWeight: 400, fontFamily: 'monospace' }}>{rec.referencia}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{rec.numero_serie}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {rec.documento_referencia ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem' }}>
                        <FileText size={12} /> {rec.documento_referencia}
                      </span>
                    ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem', border: '1px solid #bfdbfe' }}>
                      <Shield size={12} /> {rec.void_blanco}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f8fafc', color: '#475569', padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <Shield size={12} /> {rec.void_gris}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }} title={rec.observaciones || ''}>
                    {truncateText(rec.observaciones)}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <button title="Editar" onClick={() => onEdit(rec)} style={{ border: 'none', background: '#eff6ff', color: '#005eb8', padding: 7, borderRadius: 6, cursor: 'pointer', marginRight: 5 }}><Pencil size={14} /></button>
                    <button title="Eliminar" onClick={() => onDelete(rec)} style={{ border: 'none', background: '#fef2f2', color: '#c0392b', padding: 7, borderRadius: 6, cursor: 'pointer' }}><Trash2 size={14} /></button>
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