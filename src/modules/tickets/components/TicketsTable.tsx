import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket as TicketIcon, CornerDownRight } from 'lucide-react'
import { Table, type Column } from '../../../components/ui/Table'
import { useProfiles } from '../../../hooks/useProfiles'
import { GHOST, EMPTY } from '../../calibraciones/ui'
import { linkOtst, parseOtstCodes } from '../../calibraciones/vistas/CamposCompartidos'
import { ORIGEN_LABEL, ORIGEN_CORTO, ORIGEN_COLOR, ESTADO_LABEL, ESTADO_COLOR, type TicketFabrica } from '../types'
import { formatNombre, fmtFechaCorta, haceCuanto } from '../utils/formato'

interface TicketsTableProps {
  tickets: TicketFabrica[]
  isLoading?: boolean
  /** Firma de los filtros activos: al cambiar, la paginación vuelve a la primera página. */
  resetKey: string
}

const PAGE_SIZE = 30

const ELLIPSIS: React.CSSProperties = { display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const MUTED_DASH = <span style={{ color: 'var(--muted)' }}>—</span>

const badge = (c: { bg: string; text: string; border: string }): React.CSSProperties => ({
  display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  padding: '3px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
  background: c.bg, color: c.text, border: `1px solid ${c.border}`,
})

export function TicketsTable({ tickets, isLoading, resetKey }: TicketsTableProps) {
  const navigate = useNavigate()
  const { data: profiles = [] } = useProfiles()
  // La página se guarda junto a la firma de filtros con la que se eligió:
  // si los filtros cambian, se vuelve a la primera página en vez de quedar
  // en una que ya no existe.
  const [paginaGuardada, setPaginaGuardada] = useState({ key: resetKey, page: 0 })
  const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE))
  const page = paginaGuardada.key === resetKey ? Math.min(paginaGuardada.page, totalPages - 1) : 0
  const setPage = (fn: (p: number) => number) => setPaginaGuardada({ key: resetKey, page: fn(page) })
  const pageItems = tickets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const profileName = (id?: string | null) => {
    if (!id) return null
    const p = profiles.find(p => p.id === id)
    return p?.full_name || p?.email || null
  }

  const columns: Column<TicketFabrica>[] = [
    {
      key: 'ticket', header: 'Ticket', width: '10%',
      render: t => (
        <div style={{ minWidth: 0 }}>
          <span title={t.nombre} style={{ ...ELLIPSIS, fontWeight: 700, fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--text)' }}>{formatNombre(t.nombre)}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)' }}>#{t.numero ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'equipo', header: 'Equipo', width: '19%',
      render: t => (
        <div style={{ minWidth: 0 }}>
          <span title={t.codigo || ''} style={{ ...ELLIPSIS, fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{t.codigo || '—'}</span>
          {t.equipo_nombre && <span title={t.equipo_nombre} style={{ ...ELLIPSIS, fontSize: '0.7rem', color: 'var(--muted)' }}>{t.equipo_nombre}</span>}
          {t.es_equipo_hijo && (
            <span
              title={`Equipo madre: ${[t.equipo_madre_nombre, t.equipo_madre_codigo, t.equipo_madre_serial].filter(Boolean).join(' · ')}`}
              style={{ ...ELLIPSIS, fontSize: '0.7rem', color: 'var(--accent)' }}
            >
              <CornerDownRight size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
              Madre: {[t.equipo_madre_codigo, t.equipo_madre_serial].filter(Boolean).join(' · ') || '—'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'serial', header: 'Serial', width: '10%',
      render: t => <span title={t.serial || ''} style={{ ...ELLIPSIS, fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{t.serial || '—'}</span>,
    },
    {
      key: 'otst', header: 'OTST', width: '9%',
      render: t => {
        const codigos = parseOtstCodes(t.otst)
        if (!codigos.length) return MUTED_DASH
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {codigos.map(codigo => (
              <a
                key={codigo}
                href={linkOtst(codigo)!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                title={`Abrir la OTST ${codigo}`}
                style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline' }}
              >{codigo}</a>
            ))}
          </div>
        )
      },
    },
    {
      key: 'origen', header: 'Origen', width: '7%',
      render: t => t.origen
        ? <span title={ORIGEN_LABEL[t.origen]} style={badge(ORIGEN_COLOR[t.origen])}>{ORIGEN_CORTO[t.origen]}</span>
        : MUTED_DASH,
    },
    {
      key: 'estado', header: 'Estado', width: '13%',
      render: t => t.estado
        ? <span style={badge(ESTADO_COLOR[t.estado])}>{ESTADO_LABEL[t.estado]}</span>
        : MUTED_DASH,
    },
    {
      key: 'ultimo_avance', header: 'Último avance', width: '20%',
      render: t => t.ultimo_avance ? (
        <div style={{ minWidth: 0 }}>
          <span title={t.ultimo_avance} style={{ ...ELLIPSIS, fontSize: '0.76rem', color: 'var(--text)' }}>{t.ultimo_avance}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{haceCuanto(t.ultimo_avance_at)}</span>
        </div>
      ) : MUTED_DASH,
    },
    {
      key: 'creado', header: 'Creado', width: '12%',
      render: t => (
        <div style={{ minWidth: 0 }}>
          <span style={{ ...ELLIPSIS, fontSize: '0.74rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{fmtFechaCorta(t.created_at)}</span>
          <span title={profileName(t.creado_por) || ''} style={{ ...ELLIPSIS, fontSize: '0.72rem' }}>{profileName(t.creado_por) || '—'}</span>
        </div>
      ),
    },
  ]

  if (isLoading) return <div style={EMPTY}><p>Cargando…</p></div>
  if (tickets.length === 0) return <div style={EMPTY}><TicketIcon size={32} strokeWidth={1.5} /><p>No hay tickets para este filtro</p></div>

  return (
    <>
      <Table
        columns={columns}
        data={pageItems}
        keyExtractor={(t, i) => t.id ?? i}
        onRowClick={t => t.id && navigate(`/tickets/${t.id}`)}
        compact
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} — página {page + 1} de {totalPages}
        </span>
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ ...GHOST, opacity: page === 0 ? 0.5 : 1 }}>← Anterior</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ ...GHOST, opacity: page >= totalPages - 1 ? 0.5 : 1 }}>Siguiente →</button>
          </div>
        )}
      </div>
    </>
  )
}
