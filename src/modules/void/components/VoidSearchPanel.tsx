import React, { useState } from 'react';
import type { VoidRecord } from '../types';
import { Search, X } from 'lucide-react';

interface VoidSearchPanelProps {
  records: VoidRecord[];
  onSelectRecord: (record: VoidRecord) => void;
}

export const VoidSearchPanel: React.FC<VoidSearchPanelProps> = ({ records, onSelectRecord }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const searchResults = records.filter((rec) => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase();
    return (
      rec.registro_id?.toLowerCase().includes(term) ||
      rec.numero_serie?.toLowerCase().includes(term) ||
      rec.referencia?.toLowerCase().includes(term) ||
      rec.void_blanco?.toLowerCase().includes(term) ||
      rec.void_gris?.toLowerCase().includes(term) ||
      rec.nombre_equipo?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{
      background: 'var(--surface, #ffffff)',
      borderRadius: 'var(--radius-lg, 12px)',
      border: '1px solid var(--border, #e2e8f0)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))',
      marginBottom: 24
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border, #e2e8f0)',
        background: 'var(--surface2, #f8fafc)'
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text, #0f172a)', margin: '0 0 12px 0' }}>
          🔍 Buscador General de Registros
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)', margin: '0 0 12px 0' }}>
          Busca por ID único, número de serie, VOID blanco, VOID gris o referencia
        </p>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent, #005eb8)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ej: VOID-ABC123, 123456789, CO2813..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border, #cbd5e1)',
              background: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--muted, #94a3b8)',
                padding: 4
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div style={{ padding: '16px 20px' }}>
        {searchTerm.trim() === '' ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted, #94a3b8)' }}>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>Escribe algo para buscar en todos los registros...</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted, #94a3b8)' }}>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>No se encontraron coincidencias</p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)', margin: '0 0 12px 0', fontWeight: 600 }}>
              Se encontraron {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {searchResults.map((rec, index) => (
                <div
                  key={index}
                  onClick={() => onSelectRecord(rec)}
                  style={{
                    padding: '12px',
                    border: '1px solid var(--border, #e2e8f0)',
                    borderRadius: 8,
                    background: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eff6ff';
                    e.currentTarget.style.borderColor = 'var(--accent, #005eb8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)';
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted, #64748b)', fontFamily: 'var(--mono, monospace)', marginBottom: 4 }}>
                    ID: {rec.registro_id || rec.id}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text, #0f172a)', marginBottom: 6 }}>
                    {rec.nombre_equipo || 'Equipo'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
                    <strong>Serie:</strong> {rec.numero_serie}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
                    <strong>Ref:</strong> {rec.referencia}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {rec.void_blanco && (
                      <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#005eb8', padding: '2px 6px', borderRadius: 4 }}>
                        {rec.void_blanco}
                      </span>
                    )}
                    {rec.void_gris && (
                      <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                        {rec.void_gris}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted, #94a3b8)', marginTop: 8 }}>
                    {rec.libro} · {new Date(rec.created_at || '').toLocaleDateString('es-CO')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
