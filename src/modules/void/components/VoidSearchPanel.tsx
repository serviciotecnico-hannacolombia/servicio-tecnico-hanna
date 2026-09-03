import { useState } from 'react'
import type { VoidRecord } from '../types'
import { Search, X } from 'lucide-react'
import { Card } from '../../../components/ui/Card'

interface VoidSearchPanelProps {
  records: VoidRecord[]
  onSelectRecord: (record: VoidRecord) => void
}

export function VoidSearchPanel({ records, onSelectRecord }: VoidSearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const searchResults = records.filter(rec => {
    if (!searchTerm.trim()) return false
    const term = searchTerm.toLowerCase()
    return (
      rec.registro_id?.toLowerCase().includes(term) ||
      rec.numero_serie?.toLowerCase().includes(term) ||
      rec.referencia?.toLowerCase().includes(term) ||
      rec.void_blanco?.toLowerCase().includes(term) ||
      rec.void_gris?.toLowerCase().includes(term) ||
      rec.nombre_equipo?.toLowerCase().includes(term)
    )
  })

  return (
    <Card style={{ marginBottom: 18 }} bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          🔍 Buscador general de registros
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12 }}>
          Busca por ID único, número de serie, VOID blanco, VOID gris o referencia
        </p>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Ej: VOID-ABC123, 123456789, CO2813..."
            style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.85rem' }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, display: 'flex' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {searchTerm.trim() === '' ? (
          <div style={{ textAlign: 'center', padding: '20px 16px', color: 'var(--muted)' }}>
            <p style={{ fontSize: '0.85rem' }}>Escribe algo para buscar en todos los registros...</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 16px', color: 'var(--muted)' }}>
            <p style={{ fontSize: '0.85rem' }}>No se encontraron coincidencias</p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 12 }}>
              Se encontraron {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {searchResults.map((rec, index) => (
                <div
                  key={index}
                  onClick={() => onSelectRecord(rec)}
                  style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-bg)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 4 }}>
                    ID: {rec.registro_id || rec.id}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    {rec.nombre_equipo || 'Equipo'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>
                    <strong>Serie:</strong> {rec.numero_serie}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>
                    <strong>Ref:</strong> {rec.referencia}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {rec.void_blanco && (
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--mono)', background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4 }}>{rec.void_blanco}</span>
                    )}
                    {rec.void_gris && (
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--mono)', background: 'var(--surface2)', color: 'var(--muted)', padding: '2px 6px', borderRadius: 4 }}>{rec.void_gris}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 8, fontFamily: 'var(--mono)' }}>
                    {rec.libro} · {new Date(rec.created_at || '').toLocaleDateString('es-CO')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
