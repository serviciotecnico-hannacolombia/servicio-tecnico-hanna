import { useState } from 'react'
import type { VoidRecord } from '../types'
import { Search, FileText, Shield, Pencil, Trash2 } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Table, type Column } from '../../../components/ui/Table'

interface VoidTableProps {
  records: VoidRecord[]
  onEdit: (record: VoidRecord) => void
  onDelete: (record: VoidRecord) => void
}

const truncateText = (text: string | undefined | null, maxLength = 30) => {
  if (!text) return '—'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

export function VoidTable({ records, onEdit, onDelete }: VoidTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRecords = records.filter(rec => {
    const term = searchTerm.toLowerCase()
    return (
      rec.nombre_equipo?.toLowerCase().includes(term) ||
      rec.numero_serie?.toLowerCase().includes(term) ||
      rec.referencia?.toLowerCase().includes(term) ||
      rec.void_blanco?.toLowerCase().includes(term) ||
      rec.void_gris?.toLowerCase().includes(term) ||
      rec.documento_referencia?.toLowerCase().includes(term) ||
      rec.observaciones?.toLowerCase().includes(term)
    )
  })

  const columns: Column<VoidRecord>[] = [
    { key: 'id', header: 'ID', width: '110px', render: r => <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--muted)' }}>{r.registro_id || r.id || '—'}</span> },
    {
      key: 'equipo', header: 'Equipo / Ref',
      render: r => (
        <>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{r.nombre_equipo || 'Equipo'}</span>
          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{r.referencia}</span>
        </>
      ),
    },
    { key: 'serie', header: 'Serie', render: r => <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{r.numero_serie}</span> },
    {
      key: 'doc', header: 'Factura / OTST',
      render: r => r.documento_referencia
        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', color: 'var(--text)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.75rem' }}><FileText size={12} /> {r.documento_referencia}</span>
        : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'vb', header: 'VOID Blanco',
      render: r => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '0.75rem', border: '1px solid var(--accent)' }}><Shield size={12} /> {r.void_blanco}</span>,
    },
    {
      key: 'vg', header: 'VOID Gris',
      render: r => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', color: 'var(--muted)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '0.75rem', border: '1px solid var(--border)' }}><Shield size={12} /> {r.void_gris}</span>,
    },
    { key: 'obs', header: 'Observaciones', render: r => <span style={{ color: 'var(--muted)' }} title={r.observaciones || ''}>{truncateText(r.observaciones)}</span> },
    {
      key: 'acciones', header: 'Acciones', width: '90px', align: 'center',
      render: r => (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          <button title="Editar" onClick={() => onEdit(r)} style={{ border: 'none', background: 'var(--accent-bg)', color: 'var(--accent)', padding: 7, borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}><Pencil size={14} /></button>
          <button title="Eliminar" onClick={() => onDelete(r)} style={{ border: 'none', background: 'var(--red-bg)', color: 'var(--red)', padding: 7, borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <Card bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
          Registros de Equipos Escaneados <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({records.length})</span>
        </h3>
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por serie, VOID u observaciones..."
            style={{ width: '100%', padding: '7px 12px 7px 34px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      <Table columns={columns} data={filteredRecords} emptyMessage="No hay registros guardados aún." keyExtractor={(r, i) => r.id ?? i} />
    </Card>
  )
}
