import { useState } from 'react'
import { Search, Pencil, Trash2, Link2 } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Table, type Column } from '../../../components/ui/Table'
import { useProfiles } from '../../../hooks/useProfiles'
import { ORIGEN_LABEL, ORIGEN_COLOR, ESTADO_LABEL, ESTADO_COLOR, type TicketFabrica } from '../types'

interface TicketsTableProps {
  tickets: TicketFabrica[]
  onEdit: (ticket: TicketFabrica) => void
  onDelete: (ticket: TicketFabrica) => void
}

const fmtFecha = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
}

const truncateText = (text: string | undefined | null, maxLength = 40) => {
  if (!text) return '—'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

export function TicketsTable({ tickets, onEdit, onDelete }: TicketsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: profiles = [] } = useProfiles()

  const profileName = (id?: string | null) => {
    if (!id) return '—'
    const p = profiles.find(p => p.id === id)
    return p?.full_name || p?.email || '—'
  }

  const filteredTickets = tickets.filter(t => {
    const term = searchTerm.toLowerCase()
    return (
      t.nombre?.toLowerCase().includes(term) ||
      t.codigo?.toLowerCase().includes(term) ||
      t.serial?.toLowerCase().includes(term) ||
      t.equipo_madre_codigo?.toLowerCase().includes(term) ||
      t.equipo_madre_serial?.toLowerCase().includes(term) ||
      profileName(t.creado_por).toLowerCase().includes(term)
    )
  })

  const columns: Column<TicketFabrica>[] = [
    { key: 'numero', header: 'ID', width: '60px', render: t => <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--muted)' }}>{t.numero ?? '—'}</span> },
    { key: 'nombre', header: 'Nombre', render: t => <span style={{ fontWeight: 600, fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{t.nombre}</span> },
    { key: 'creado_por', header: 'Creado por', width: '160px', render: t => <span style={{ fontSize: '0.8rem' }}>{profileName(t.creado_por)}</span> },
    {
      key: 'codigo', header: 'Código', width: '150px',
      render: t => (
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{t.codigo || '—'}</div>
          {t.equipo_nombre && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{t.equipo_nombre}</div>}
        </div>
      ),
    },
    { key: 'serial', header: 'Serial', width: '130px', render: t => <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{t.serial || '—'}</span> },
    {
      key: 'equipo_madre', header: 'Equipo Madre', width: '190px',
      render: t => t.es_equipo_hijo ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
          <Link2 size={12} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.75rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{t.equipo_madre_nombre || '—'}</div>
            <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {[t.equipo_madre_codigo, t.equipo_madre_serial].filter(Boolean).join(' · ') || '—'}
            </div>
          </div>
        </div>
      ) : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'origen', header: 'Origen', width: '150px',
      render: t => t.origen ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20,
          fontSize: '0.75rem', fontWeight: 600,
          background: ORIGEN_COLOR[t.origen].bg, color: ORIGEN_COLOR[t.origen].text, border: `1px solid ${ORIGEN_COLOR[t.origen].border}`,
        }}>{ORIGEN_LABEL[t.origen]}</span>
      ) : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'estado', header: 'Estado', width: '160px',
      render: t => t.estado ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20,
          fontSize: '0.75rem', fontWeight: 600,
          background: ESTADO_COLOR[t.estado].bg, color: ESTADO_COLOR[t.estado].text, border: `1px solid ${ESTADO_COLOR[t.estado].border}`,
        }}>{ESTADO_LABEL[t.estado]}</span>
      ) : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    { key: 'nota_estado', header: 'Detalle del Estado', render: t => <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }} title={t.nota_estado || ''}>{truncateText(t.nota_estado)}</span> },
    { key: 'created_at', header: 'Fecha de creación', width: '180px', render: t => <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{fmtFecha(t.created_at)}</span> },
    {
      key: 'acciones', header: 'Acciones', width: '90px', align: 'center',
      render: t => (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          <button title="Editar" onClick={() => onEdit(t)} style={{ border: 'none', background: 'var(--accent-bg)', color: 'var(--accent)', padding: 7, borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}><Pencil size={14} /></button>
          <button title="Eliminar" onClick={() => onDelete(t)} style={{ border: 'none', background: 'var(--red-bg)', color: 'var(--red)', padding: 7, borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <Card bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
          Tickets a Fábrica <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({tickets.length})</span>
        </h3>
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, código, serial, equipo madre o creador..."
            style={{ width: '100%', padding: '7px 12px 7px 34px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      <Table columns={columns} data={filteredTickets} emptyMessage="No hay tickets registrados aún." keyExtractor={(t, i) => t.id ?? i} />
    </Card>
  )
}
