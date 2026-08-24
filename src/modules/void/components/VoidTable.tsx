import React, { useState } from 'react';
import type { VoidRecord } from '../types';
import { Search, FileText, Shield } from 'lucide-react';

interface VoidTableProps {
  records: VoidRecord[];
}

export const VoidTable: React.FC<VoidTableProps> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter((rec) => {
    const term = searchTerm.toLowerCase();
    return (
      rec.nombre_equipo?.toLowerCase().includes(term) ||
      rec.numero_serie?.toLowerCase().includes(term) ||
      rec.referencia?.toLowerCase().includes(term) ||
      rec.void_blanco?.toLowerCase().includes(term) ||
      rec.void_gris?.toLowerCase().includes(term) ||
      rec.documento_referencia?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{
      background: 'var(--surface, #ffffff)',
      borderRadius: 'var(--radius-lg, 12px)',
      border: '1px solid var(--border, #e2e8f0)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))'
    }}>
      {/* Barra superior con Buscador */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        background: 'var(--surface2, #f8fafc)'
      }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text, #0f172a)', margin: 0 }}>
            Registros de Equipos Escaneados ({records.length})
          </h3>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted, #94a3b8)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por serie, VOID o documento..."
            style={{
              width: '100%',
              padding: '7px 12px 7px 36px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border, #cbd5e1)',
              background: '#ffffff',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{
              background: 'var(--surface2, #f8fafc)',
              color: 'var(--muted, #64748b)',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: '1px solid var(--border, #e2e8f0)'
            }}>
              <th style={{ padding: '12px 16px' }}>Equipo / Ref</th>
              <th style={{ padding: '12px 16px' }}>Serie</th>
              <th style={{ padding: '12px 16px' }}>Factura / OTST</th>
              <th style={{ padding: '12px 16px' }}>VOID Blanco</th>
              <th style={{ padding: '12px 16px' }}>VOID Gris</th>
              <th style={{ padding: '12px 16px' }}>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                  {searchTerm ? 'No hay registros que coincidan con la búsqueda.' : 'No hay registros guardados aún.'}
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec, index) => (
                <tr key={index} style={{ borderBottom: '1px solid var(--border, #f1f5f9)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text, #0f172a)' }}>
                    {rec.nombre_equipo || 'Equipo'}
                    <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--muted, #64748b)', fontWeight: 400, fontFamily: 'var(--mono, monospace)' }}>
                      {rec.referencia}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--mono, monospace)', fontWeight: 600 }}>
                    {rec.numero_serie}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {rec.documento_referencia ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem' }}>
                        <FileText size={12} /> {rec.documento_referencia}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted, #cbd5e1)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent-bg, #eff6ff)', color: 'var(--accent, #1d4ed8)', padding: '3px 8px', borderRadius: 6, fontFamily: 'var(--mono, monospace)', fontWeight: 600, fontSize: '0.75rem', border: '1px solid #bfdbfe' }}>
                      <Shield size={12} /> {rec.void_blanco}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f8fafc', color: '#475569', padding: '3px 8px', borderRadius: 6, fontFamily: 'var(--mono, monospace)', fontWeight: 600, fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <Shield size={12} /> {rec.void_gris}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted, #64748b)' }}>
                    {rec.observaciones || '—'}
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