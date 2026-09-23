import { useState } from 'react'
import { Search, Pencil, Trash2, Link2 } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Table, type Column } from '../../../components/ui/Table'
import { useProfiles } from '../../../hooks/useProfiles'
import { ORIGEN_LABEL, ORIGEN_COLOR, ESTADO_LABEL, ESTADO_COLOR, type TicketFabrica, type TicketOrigen, type TicketEstado } from '../types'

interface TicketsTableProps {
  tickets: TicketFabrica[]
  onEdit: (ticket: TicketFabrica) => void
  onDelete: (ticket: TicketFabrica) => void
}

const fmtFecha = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
}

const truncateText = (text: string | undefined | null, maxLength = 40) => {
  if (!text) return '—'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// Los tickets importados de Notion guardan el prefijo largo "Ticket ID: ";
// se acorta solo para mostrar, sin tocar el dato guardado en la base.
const formatNombre = (nombre: string) => nombre.replace(/^Ticket ID:\s*/i, 'TID: ')

export function TicketsTable({ tickets, onEdit, onDelete }: TicketsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [origenFilter, setOrigenFilter] = useState<TicketOrigen | ''>('')
  const [estadoFilter, setEstadoFilter] = useState<TicketEstado | ''>('')
  const { data: profiles = [] } = useProfiles()

  const profileName = (id?: string | null) => {
    if (!id) return '—'
    const p = profiles.find(p => p.id === id)
    return p?.full_name || p?.email || '—'
  }

  const filteredTickets = tickets.filter(t => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = (
      t.nombre?.toLowerCase().includes(term) ||
      t.codigo?.toLowerCase().includes(term) ||
      t.serial?.toLowerCase().includes(term) ||
      t.equipo_madre_codigo?.toLowerCase().includes(term) ||
      t.equipo_madre_serial?.toLowerCase().includes(term) ||
      profileName(t.creado_por).toLowerCase().includes(term)
    )
    const matchesOrigen = !origenFilter || t.origen === origenFilter
    const matchesEstado = !estadoFilter || t.estado === estadoFilter
    return matchesSearch && matchesOrigen && matchesEstado
  })

  // Anchos en porcentaje (suman 100%): con tableLayout "fixed" el navegador
  // los respeta de forma proporcional al ancho disponible, así la tabla
  // siempre cabe en pantalla sin scroll horizontal, sin importar el tamaño.
  const columns: Column<TicketFabrica>[] = [
    { key: 'numero', header: 'ID', width: '4%', render: t => <span style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{t.numero ?? '—'}</span> },
    {
      key: 'nombre', header: 'Nombre', width: '8%',
      render: t => (
        <span
          title={t.nombre}
          style={{ fontWeight: 600, fontFamily: 'var(--mono)', fontSize: '0.78rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {formatNombre(t.nombre)}
        </span>
      ),
    },
    {
      key: 'creado_por', header: 'Creador', width: '13%',
      render: t => (
        <span
          title={profileName(t.creado_por)}
          style={{ fontSize: '0.78rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {profileName(t.creado_por)}
        </span>
      ),
    },
    {
      key: 'codigo', header: 'Código', width: '9%',
      render: t => (
        <div style={{ overflow: 'hidden' }}>
          <div title={t.codigo || ''} style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.codigo || '—'}</div>
          {t.equipo_nombre && <div title={t.equipo_nombre} style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.equipo_nombre}</div>}
        </div>
      ),
    },
    {
      key: 'serial', header: 'Serial', width: '7%',
      render: t => (
        <span title={t.serial || ''} style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t.serial || '—'}
        </span>
      ),
    },
    {
      key: 'equipo_madre', header: 'Eq. Madre', width: '10%',
      render: t => t.es_equipo_hijo ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, overflow: 'hidden' }}>
          <Link2 size={12} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.72rem', minWidth: 0 }}>
            <div title={t.equipo_madre_nombre || ''} style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.equipo_madre_nombre || '—'}</div>
            <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {[t.equipo_madre_codigo, t.equipo_madre_serial].filter(Boolean).join(' · ') || '—'}
            </div>
          </div>
        </div>
      ) : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'origen', header: 'Origen', width: '8%',
      render: t => t.origen ? (
        <span style={{
          display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
          padding: '3px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
          background: ORIGEN_COLOR[t.origen].bg, color: ORIGEN_COLOR[t.origen].text, border: `1px solid ${ORIGEN_COLOR[t.origen].border}`,
        }}>{ORIGEN_LABEL[t.origen]}</span>
      ) : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'estado', header: 'Estado', width: '12%',
      render: t => t.estado ? (
        <span style={{
          display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
          padding: '3px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
          background: ESTADO_COLOR[t.estado].bg, color: ESTADO_COLOR[t.estado].text, border: `1px solid ${ESTADO_COLOR[t.estado].border}`,
        }}>{ESTADO_LABEL[t.estado]}</span>
      ) : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'nota_estado', header: 'Detalle', width: '14%',
      render: t => (
        <span title={t.nota_estado || ''} style={{ color: 'var(--muted)', fontSize: '0.76rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {truncateText(t.nota_estado)}
        </span>
      ),
    },
    {
      key: 'created_at', header: 'Fecha', width: '8%',
      render: t => <span style={{ fontSize: '0.74rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtFecha(t.created_at)}</span>,
    },
    {
      key: 'acciones', header: 'Acciones', width: '7%', align: 'center',
      render: t => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <button title="Editar" onClick={() => onEdit(t)} style={{ border: 'none', background: 'var(--accent-bg)', color: 'var(--accent)', padding: 6, borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}><Pencil size={13} /></button>
          <button title="Eliminar" onClick={() => onDelete(t)} style={{ border: 'none', background: 'var(--red-bg)', color: 'var(--red)', padding: 6, borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  return (
    <Card bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
          Tickets a Fábrica <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({filteredTickets.length}/{tickets.length})</span>
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={origenFilter}
            onChange={e => setOrigenFilter(e.target.value as TicketOrigen | '')}
            style={{ padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.8rem' }}
          >
            <option value="">Todos los orígenes</option>
            {(Object.keys(ORIGEN_LABEL) as TicketOrigen[]).map(o => (
              <option key={o} value={o}>{ORIGEN_LABEL[o]}</option>
            ))}
          </select>
          <select
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value as TicketEstado | '')}
            style={{ padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.8rem' }}
          >
            <option value="">Todos los estados</option>
            {(Object.keys(ESTADO_LABEL) as TicketEstado[]).map(e => (
              <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
            ))}
          </select>
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
      </div>

      <Table columns={columns} data={filteredTickets} emptyMessage="No hay tickets registrados aún." keyExtractor={(t, i) => t.id ?? i} compact />
    </Card>
  )
}
