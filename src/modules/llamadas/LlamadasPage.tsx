import { useState, useMemo, useEffect, useRef } from 'react'
import { Upload, PlusCircle, Archive, Trash2, SkipForward, Eraser } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatCard } from '../../components/ui/StatCard'
import { Table, type Column } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { Avatar } from '../../components/ui/Avatar'
import { AddLlamadaModal } from './components/AddLlamadaModal'
import { ImportCSVModal } from './components/ImportCSVModal'
import { HistorialSection } from './components/HistorialSection'
import { useLlamadasDiario } from './hooks/useLlamadasDiario'
import { useUser } from '../../hooks/useUser'
import { useProfiles } from '../../hooks/useProfiles'
import { INTRANET_URL } from '../../lib/constants'
import type { LlamadaDiario, EstadoLlamada } from '../../types'

type Tab = 'hoy' | 'historial'


const PUNTOS: Record<string, number> = { 'CIERRE': 3, 'CONTACTADO': 2, 'SIN CONTACTO': 1 }

const ESTADO_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'CIERRE':       { bg: 'var(--purple-bg)', color: 'var(--purple)', border: 'rgba(124,58,237,.35)' },
  'CONTACTADO':   { bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'var(--green-border)' },
  'SIN CONTACTO': { bg: 'var(--yellow-bg)', color: 'var(--yellow)', border: 'var(--yellow-border)' },
  'NO LLAMADO':   { bg: 'var(--red-bg)',    color: 'var(--red)',    border: 'var(--red-border)' },
  '':             { bg: 'var(--surface2)',  color: 'var(--muted)',  border: 'var(--border)' },
}

function EstadoBadge({ estado, onClick }: { estado: EstadoLlamada; onClick?: (e: React.MouseEvent) => void }) {
  const s = ESTADO_STYLE[estado] ?? ESTADO_STYLE['']
  const labels: Record<string, string> = { 'CIERRE': '✅ Cierre', 'CONTACTADO': '📞 Contactado', 'SIN CONTACTO': '📵 Sin contacto', 'NO LLAMADO': '⏭ No llamado', '': '— Sin marcar' }
  return (
    <span
      onClick={onClick}
      title={onClick ? 'Clic para cambiar' : undefined}
      style={{
        display: 'inline-block', padding: '4px 10px', borderRadius: 20,
        fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--mono)',
        background: s.bg, color: s.color, border: `1.5px solid ${s.border}`,
        cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none',
        transition: 'transform .1s',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
    >
      {labels[estado] ?? estado}
    </span>
  )
}

function GarantiaBadge({ garantia }: { garantia: 'SI' | 'NO' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--mono)',
      background: garantia === 'SI' ? 'var(--purple-bg)' : 'var(--surface2)',
      color: garantia === 'SI' ? 'var(--purple)' : 'var(--muted)',
      border: `1px solid ${garantia === 'SI' ? 'rgba(124,58,237,.3)' : 'var(--border)'}`,
    }}>{garantia === 'SI' ? 'SÍ' : 'NO'}</span>
  )
}

function OtstLink({ otst }: { otst: string }) {
  return (
    <a href={INTRANET_URL + otst} target="_blank" rel="noopener noreferrer" style={{
      color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '0.85rem',
      display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none',
      padding: '3px 8px', borderRadius: 6, background: 'var(--accent-bg)', transition: 'all .15s',
    }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--accent)'; el.style.color = '#fff' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--accent-bg)'; el.style.color = 'var(--accent)' }}
    >
      {otst}
    </a>
  )
}

export function LlamadasPage() {
  const [tab, setTab] = useState<Tab>('hoy')
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [archivarOpen, setArchivarOpen]       = useState(false)
  const [limpiarOpen, setLimpiarOpen]         = useState(false)
  const [confirmLimpiar, setConfirmLimpiar]   = useState('')

  const CONFIRM_PHRASE = 'Borrar el día'
  const [popover, setPopover] = useState<{ id: string; top: number; left: number } | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'all' | 'pending' | 'done'>('all')
  const [filtroGarantia, setFiltroGarantia] = useState(false)
  const [filtroIngeniero, setFiltroIngeniero] = useState<string | null>(null)
  const { displayName, hasCapability } = useUser()
  const canImportarCSV = hasCapability('importar_csv_llamadas')
  const { data: profiles = [] } = useProfiles()
  const { data: llamadas = [], isLoading, importCSV, addLlamada, updateEstado, marcarVaciosNoLlamado, deleteLlamada, archivarDia, limpiarDia } = useLlamadasDiario()

  // Stats
  const cierre      = llamadas.filter(l => l.estado === 'CIERRE').length
  const contactado  = llamadas.filter(l => l.estado === 'CONTACTADO').length
  const sinContacto = llamadas.filter(l => l.estado === 'SIN CONTACTO').length
  const noLlamado   = llamadas.filter(l => l.estado === 'NO LLAMADO').length
  const hechas      = cierre + contactado + sinContacto + noLlamado
  const vacios      = llamadas.filter(l => !l.estado).length
  const pct         = llamadas.length ? Math.round(hechas / llamadas.length * 100) : 0

  // Carrera scores — agrupa dinámicamente por usuario activo en las llamadas
  const scores = useMemo(() => {
    const nombres = [...new Set(llamadas.map(l => l.usuario).filter(Boolean))]
    return nombres.map(nombre => ({
      nombre,
      pts: llamadas.filter(l => l.usuario === nombre).reduce((s, l) => s + (PUNTOS[l.estado] ?? 0), 0),
      cierre:      llamadas.filter(l => l.usuario === nombre && l.estado === 'CIERRE').length,
      contactado:  llamadas.filter(l => l.usuario === nombre && l.estado === 'CONTACTADO').length,
      sinContacto: llamadas.filter(l => l.usuario === nombre && l.estado === 'SIN CONTACTO').length,
    })).sort((a, b) => b.pts - a.pts)
  }, [llamadas])

  // Ingenieros únicos en el diario actual (para chips dinámicos)
  const ingenieros = useMemo(() =>
    [...new Set(llamadas.map(l => l.ingeniero).filter(Boolean) as string[])].sort()
  , [llamadas])

  const garantiaCount = llamadas.filter(l => l.garantia === 'SI').length

  // Clientes con múltiples OTSTs — ordenados por total desc
  const clientesMultiples = useMemo(() => {
    const map: Record<string, { total: number; pendientes: number }> = {}
    llamadas.forEach(l => {
      const k = l.cliente?.trim() || '(Sin cliente)'
      if (!map[k]) map[k] = { total: 0, pendientes: 0 }
      map[k].total++
      if (!l.estado) map[k].pendientes++
    })
    return Object.entries(map)
      .filter(([, v]) => v.total >= 2)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([cliente, v]) => ({ cliente, ...v }))
  }, [llamadas])

  // Filtros combinados
  const filtradas = useMemo(() => {
    return llamadas.filter(l => {
      const tieneEstado = !!l.estado
      if (filtroEstado === 'pending' && tieneEstado)  return false
      if (filtroEstado === 'done'    && !tieneEstado) return false
      if (filtroGarantia && l.garantia !== 'SI')      return false
      if (filtroIngeniero && l.ingeniero !== filtroIngeniero) return false
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase()
        const hay = `${l.otst} ${l.cliente ?? ''} ${l.ingeniero ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [llamadas, busqueda, filtroEstado, filtroGarantia, filtroIngeniero])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null)
      }
    }
    if (popover) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popover])

  const openPopover = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const POP_W = 220, POP_H = 230
    let top  = rect.bottom + 6
    let left = rect.left
    if (left + POP_W > window.innerWidth  - 8) left = window.innerWidth  - POP_W - 8
    if (top  + POP_H > window.innerHeight - 8) top  = rect.top - POP_H - 6
    setPopover({ id, top, left })
  }

  const handleEstadoChange = async (id: string, estado: EstadoLlamada) => {
    setPopover(null)
    try {
      await updateEstado.mutateAsync({ id, estado, usuario: displayName })
    } catch {
      toast.error('Error al actualizar estado')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta llamada?')) return
    try { await deleteLlamada.mutateAsync(id); toast.success('Eliminada') }
    catch { toast.error('Error al eliminar') }
  }

  const handleArchivar = async () => {
    try { await archivarDia.mutateAsync(llamadas); toast.success('Día archivado'); setArchivarOpen(false) }
    catch { toast.error('Error al archivar') }
  }

  const handleLimpiar = async () => {
    try { await limpiarDia.mutateAsync(); toast.success('Diario limpiado'); setLimpiarOpen(false); setConfirmLimpiar('') }
    catch { toast.error('Error al limpiar') }
  }

  const closeLimpiar = () => { setLimpiarOpen(false); setConfirmLimpiar('') }

  const handleMarcarVacios = async () => {
    if (!confirm(`¿Marcar ${vacios} OTSTs vacíos como NO LLAMADO?`)) return
    try { await marcarVaciosNoLlamado.mutateAsync(displayName); toast.success(`${vacios} marcados como NO LLAMADO`) }
    catch { toast.error('Error en marcado masivo') }
  }

  const handleImport = async (rows: { otst: string; cliente: string; ingeniero: string; garantia: 'SI' | 'NO' }[], replace: boolean) => {
    try {
      await importCSV.mutateAsync({ rows, replace })
      toast.success(`${rows.length} OTSTs cargados`)
    } catch { toast.error('Error al importar CSV') }
  }

  const diarioColumns: Column<LlamadaDiario>[] = [
    { key: 'otst',    header: 'OTST',     width: '120px', render: r => <OtstLink otst={r.otst} /> },
    { key: 'cliente', header: 'Cliente',  render: r => r.cliente
        ? <span onClick={() => navigator.clipboard.writeText(r.cliente!).then(() => toast.success(`"${r.cliente}" copiado`))} title="Clic para copiar" style={{ fontWeight: 500, cursor: 'copy' }}>{r.cliente}</span>
        : <span style={{ color: 'var(--muted)' }}>—</span> },
    { key: 'ing',     header: 'Ingeniero', render: r => <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{r.ingeniero || '—'}</span> },
    { key: 'gar',     header: 'Garantía', width: '85px',  align: 'center', render: r => <GarantiaBadge garantia={r.garantia} /> },
    {
      key: 'estado', header: 'Estado', width: '175px',
      render: row => <EstadoBadge estado={row.estado} onClick={e => openPopover(e, row.id)} />,
    },
    { key: 'hora',    header: 'Hora',    width: '65px', align: 'center', render: r => <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--muted)' }}>{r.hora || '—'}</span> },
    { key: 'usuario', header: 'Registró', width: '80px', render: r => <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{r.usuario ? r.usuario.split(' ')[0] : '—'}</span> },
    {
      key: 'del', header: '', width: '40px', align: 'center',
      render: r => (
        <button onClick={() => handleDelete(r.id)} title="Eliminar"
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'inline-flex', transition: 'color .1s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
        >
          <Trash2 size={13} />
        </button>
      ),
    },
  ]

  return (
    <div>
      <Header title="Control de Llamadas" subtitle="Seguimiento diario de llamadas al cliente" />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }} />
        {tab === 'hoy' && (
          <>
            {vacios > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarcarVacios} disabled={marcarVaciosNoLlamado.isPending}>
                <SkipForward size={14} /> Marcar vacíos
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setArchivarOpen(true)} disabled={llamadas.length === 0}>
              <Archive size={14} /> Archivar día
            </Button>
            <Button variant="danger" size="sm" onClick={() => setLimpiarOpen(true)} disabled={llamadas.length === 0}>
              <Eraser size={14} /> Limpiar día
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
              <PlusCircle size={14} /> Manual
            </Button>
            {canImportarCSV && (
              <Button size="sm" onClick={() => setImportOpen(true)}>
                <Upload size={14} /> Cargar CSV
              </Button>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 4, width: 'fit-content', boxShadow: 'var(--shadow)' }}>
        {(['hoy', 'historial'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 22px', borderRadius: 'calc(var(--radius-sm) - 2px)', border: 'none',
            background: tab === t ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'transparent',
            color: tab === t ? '#fff' : 'var(--muted)',
            fontWeight: tab === t ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer',
            boxShadow: tab === t ? '0 2px 8px rgba(0,94,184,.25)' : 'none',
            transition: 'all .15s', fontFamily: 'var(--sans)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t === 'hoy' ? <>📞 Diario <span style={{ background: tab === t ? 'rgba(255,255,255,.25)' : 'var(--surface2)', color: tab === t ? '#fff' : 'var(--muted)', padding: '1px 7px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>{llamadas.length}</span></>
              : <>📊 Histórico</>}
          </button>
        ))}
      </div>

      {tab === 'hoy' && (
        <>
          {/* Hero barra de progreso */}
          {llamadas.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 18, color: '#fff', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', position: 'relative' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85, marginBottom: 6 }}>Avance del día</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: 700, lineHeight: 1 }}>{pct}%</div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', opacity: 0.9, marginTop: 4 }}>{hechas} de {llamadas.length} · {vacios} pendientes</div>
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ height: 12, background: 'rgba(255,255,255,.2)', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 20, transition: 'width .6s cubic-bezier(.4,0,.2,1)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontFamily: 'var(--mono)', marginTop: 6, opacity: 0.9 }}>
                    <span>0%</span><span>{hechas} / {llamadas.length}</span><span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <StatCard value={cierre}      label="Cierre"       sublabel="venta lograda"   color="purple" />
            <StatCard value={contactado}  label="Contactado"   sublabel="cliente contestó" color="green"  />
            <StatCard value={sinContacto} label="Sin contacto" sublabel="no se logró hablar" color="yellow" />
            <StatCard value={noLlamado}   label="No llamado"   sublabel="no se intentó hoy" color="red"   />
          </div>

          {/* Carrera + Multi-OTST */}
          {(scores.some(s => s.pts > 0) || clientesMultiples.length > 0) && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
              {/* Clientes con varias OTSTs */}
              {clientesMultiples.length > 0 && (
                <Card style={{ flex: 1, minWidth: 220 }} bodyStyle={{ padding: '14px 18px' }}>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📦</span> Oportunidades — cliente con varias OTSTs
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {clientesMultiples.map(({ cliente, total, pendientes }) => (
                      <button
                        key={cliente}
                        onClick={() => { setBusqueda(busqueda === cliente ? '' : cliente); setFiltroEstado('all') }}
                        title={`Filtrar tabla por "${cliente}"`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '7px 10px', borderRadius: 8, border: '1.5px solid',
                          borderColor: busqueda === cliente ? 'var(--accent)' : 'var(--border)',
                          background: busqueda === cliente ? 'var(--accent-bg)' : 'var(--surface2)',
                          cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
                        }}
                        onMouseEnter={e => { if (busqueda !== cliente) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
                        onMouseLeave={e => { if (busqueda !== cliente) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                      >
                        {/* Badge total */}
                        <span style={{
                          minWidth: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--mono)',
                          background: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: '#fff',
                        }}>{total}</span>

                        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cliente}
                        </span>

                        {/* Pendientes */}
                        {pendientes > 0 && (
                          <span style={{
                            fontSize: '0.68rem', fontFamily: 'var(--mono)', fontWeight: 700,
                            padding: '2px 7px', borderRadius: 10,
                            background: 'var(--yellow-bg)', color: 'var(--yellow)',
                            border: '1px solid var(--yellow-border)', flexShrink: 0,
                          }}>{pendientes} pend.</span>
                        )}
                        {pendientes === 0 && (
                          <span style={{
                            fontSize: '0.68rem', fontFamily: 'var(--mono)', fontWeight: 700,
                            padding: '2px 7px', borderRadius: 10,
                            background: 'var(--green-bg)', color: 'var(--green)',
                            border: '1px solid var(--green-border)', flexShrink: 0,
                          }}>✓ listas</span>
                        )}
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Carrera del día */}
              {scores.some(s => s.pts > 0) && (
                <Card style={{ flex: 1 }} bodyStyle={{ padding: '14px 18px' }}>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🏆</span> Carrera del día
                  </div>
                  {scores.map((u, i) => {
                    const maxPts = Math.max(1, scores[0].pts)
                    const esLider = i === 0 && u.pts > 0
                    const perfil = profiles.find(p => p.full_name === u.nombre)
                    return (
                      <div key={u.nombre} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < scores.length - 1 ? 12 : 0 }}>
                        <Avatar
                          name={u.nombre}
                          emoji={perfil?.avatar_emoji}
                          color={perfil?.avatar_color ?? (esLider ? '#d97706' : undefined)}
                          size={30}
                          ring={esLider}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {u.nombre}{esLider && ' 👑'}
                          </div>
                          <div style={{ fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--muted)', margin: '2px 0 4px' }}>
                            {u.cierre}✅ · {u.contactado}📞 · {u.sinContacto}📵
                          </div>
                          <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${u.pts / maxPts * 100}%`, borderRadius: 4, background: esLider ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,var(--accent),var(--accent2))', transition: 'width .6s' }} />
                          </div>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--mono)', color: esLider ? '#d97706' : 'var(--accent)', minWidth: 28, textAlign: 'right' }}>{u.pts}</div>
                      </div>
                    )
                  })}
                </Card>
              )}
            </div>
          )}

          {/* Filtros + tabla */}
          <Card bodyStyle={{ padding: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              {/* Búsqueda */}
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar OTST, cliente o ingeniero…"
                  style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.85rem' }}
                />
              </div>

              {/* Chips de estado + garantía */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {([
                  { key: 'all',     label: 'Todos' },
                  { key: 'pending', label: 'Pendientes' },
                  { key: 'done',    label: 'Llamadas hechas' },
                ] as const).map(opt => (
                  <button key={opt.key} onClick={() => setFiltroEstado(opt.key)} style={{
                    padding: '5px 13px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontWeight: filtroEstado === opt.key ? 600 : 500,
                    border: `1px solid ${filtroEstado === opt.key ? 'var(--accent)' : 'var(--border)'}`,
                    background: filtroEstado === opt.key ? 'var(--accent)' : 'var(--surface)',
                    color: filtroEstado === opt.key ? '#fff' : 'var(--muted)',
                    transition: 'all .12s',
                  }}>
                    {opt.label}
                  </button>
                ))}

                <button onClick={() => setFiltroGarantia(g => !g)} style={{
                  padding: '5px 13px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontWeight: filtroGarantia ? 600 : 500,
                  border: `1px solid ${filtroGarantia ? 'var(--purple)' : 'rgba(124,58,237,.3)'}`,
                  background: filtroGarantia ? 'var(--purple)' : 'var(--surface)',
                  color: filtroGarantia ? '#fff' : 'var(--purple)',
                  transition: 'all .12s',
                }}>
                  En garantía{garantiaCount > 0 && <span style={{ opacity: 0.75, marginLeft: 5 }}>{garantiaCount}</span>}
                </button>

                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>
                  {filtradas.length} / {llamadas.length}
                </span>
              </div>

              {/* Chips de ingeniero (dinámicos) */}
              {ingenieros.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {ingenieros.map(ing => {
                    const count = llamadas.filter(l => l.ingeniero === ing).length
                    const active = filtroIngeniero === ing
                    return (
                      <button key={ing} onClick={() => setFiltroIngeniero(active ? null : ing)} style={{
                        padding: '4px 11px', borderRadius: 20, fontSize: '0.73rem', cursor: 'pointer',
                        fontFamily: 'var(--mono)', fontWeight: active ? 600 : 500,
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                        background: active ? 'var(--accent-bg)' : 'var(--surface)',
                        color: active ? 'var(--accent)' : 'var(--muted)',
                        transition: 'all .12s',
                      }}>
                        {ing} <span style={{ opacity: 0.65 }}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 20px' }}><Spinner size={28} /></div>
            ) : llamadas.length === 0 ? (
              <div style={{ padding: '56px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: 12, opacity: 0.5 }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Sin OTSTs cargados</div>
                <div style={{ fontSize: '0.85rem' }}>Usa <strong>"Cargar CSV"</strong> para importar los OTSTs del día</div>
              </div>
            ) : (
              <Table columns={diarioColumns} data={filtradas} emptyMessage="Sin resultados para esa búsqueda" keyExtractor={r => r.id} />
            )}
          </Card>
        </>
      )}

      {tab === 'historial' && <HistorialSection />}

      {/* Modals */}
      <ImportCSVModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existing={llamadas.length}
        onImport={handleImport}
      />

      <AddLlamadaModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        carrera={displayName}
        onAdd={data => addLlamada.mutateAsync(data)}
      />

      <Modal open={limpiarOpen} onClose={closeLimpiar} title="Limpiar diario">
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 10, lineHeight: 1.6 }}>
          Se eliminarán los <strong style={{ color: 'var(--text)' }}>{llamadas.length} registros</strong> del diario de hoy.
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--red)', marginBottom: 20, lineHeight: 1.6 }}>
          ⚠️ Esta acción <strong>no archiva ni guarda</strong> los datos. Se perderán permanentemente.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            Para confirmar, escribe <code style={{ background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mono)', color: 'var(--text)', fontSize: '0.8rem' }}>{CONFIRM_PHRASE}</code>
          </label>
          <input
            autoFocus
            value={confirmLimpiar}
            onChange={e => setConfirmLimpiar(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && confirmLimpiar === CONFIRM_PHRASE) handleLimpiar() }}
            placeholder={CONFIRM_PHRASE}
            style={{
              width: '100%', padding: '8px 12px', boxSizing: 'border-box',
              border: `1.5px solid ${confirmLimpiar && confirmLimpiar !== CONFIRM_PHRASE ? 'var(--red)' : confirmLimpiar === CONFIRM_PHRASE ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
              color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '0.875rem',
              outline: 'none', transition: 'border-color .15s',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={closeLimpiar} style={{ flex: 1 }}>Cancelar</Button>
          <Button
            variant="danger"
            onClick={handleLimpiar}
            disabled={confirmLimpiar !== CONFIRM_PHRASE || limpiarDia.isPending}
            style={{ flex: 1 }}
          >
            {limpiarDia.isPending ? 'Limpiando…' : 'Sí, borrar todo'}
          </Button>
        </div>
      </Modal>

      <Modal open={archivarOpen} onClose={() => setArchivarOpen(false)} title="Cerrar día y archivar">
        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 18 }}>
          {[
            ['Total a archivar', llamadas.length],
            ['Cierre', cierre],
            ['Contactado', contactado],
            ['Sin contacto', sinContacto],
            ['No llamado', noLlamado],
            ['Sin marcar', vacios],
          ].map(([label, val]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--mono)', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--muted)' }}>{label}</span>
              <strong style={{ color: 'var(--accent)' }}>{val}</strong>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 18, lineHeight: 1.6 }}>
          Los registros se moverán al histórico y <strong>DIARIO quedará vacío</strong> para mañana.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => setArchivarOpen(false)} style={{ flex: 1 }}>Cancelar</Button>
          <Button variant="danger" onClick={handleArchivar} disabled={archivarDia.isPending} style={{ flex: 1 }}>
            {archivarDia.isPending ? 'Archivando…' : 'Sí, cerrar día'}
          </Button>
        </div>
      </Modal>

      {/* Popover de estado */}
      {popover && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed', top: popover.top, left: popover.left, zIndex: 600,
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius)', boxShadow: '0 12px 40px rgba(0,0,0,.18)',
            padding: 6, minWidth: 210,
            animation: 'fadeIn .1s ease',
          }}
          onClick={e => e.stopPropagation()}
        >
          {([
            { value: 'CIERRE',       label: 'Cierre',       icon: '✅', color: 'var(--purple)', bg: 'var(--purple-bg)' },
            { value: 'CONTACTADO',   label: 'Contactado',   icon: '📞', color: 'var(--green)',  bg: 'var(--green-bg)' },
            { value: 'SIN CONTACTO', label: 'Sin contacto', icon: '📵', color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
            { value: 'NO LLAMADO',   label: 'No llamado',   icon: '⏭', color: 'var(--red)',    bg: 'var(--red-bg)' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => handleEstadoChange(popover.id, opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent',
                fontSize: '0.875rem', fontWeight: 600, color: opt.color, cursor: 'pointer',
                textAlign: 'left', transition: 'background .1s', fontFamily: 'var(--sans)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = opt.bg }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: '1rem', width: 22, textAlign: 'center' }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
          <button
            onClick={() => handleEstadoChange(popover.id, '')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent',
              fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
              textAlign: 'left', transition: 'background .1s', fontFamily: 'var(--sans)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <span style={{ fontSize: '1rem', width: 22, textAlign: 'center' }}>✖</span>
            Limpiar estado
          </button>
        </div>
      )}
    </div>
  )
}
