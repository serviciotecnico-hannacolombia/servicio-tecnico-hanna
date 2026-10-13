// Pestaña "Seguimiento ejecutivo" (solo admin): para un usuario marcado como
// ejecutivo en Admin → Usuarios, cruza las llamadas que marcó en Control de
// Llamadas con los cambios que hizo en órdenes de Calibraciones.
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Card } from '../../../components/ui/Card'
import { StatCard } from '../../../components/ui/StatCard'
import { Table, type Column } from '../../../components/ui/Table'
import { Spinner } from '../../../components/ui/Spinner'
import { Avatar } from '../../../components/ui/Avatar'
import { useProfiles } from '../../../hooks/useProfiles'
import { useUser } from '../../../hooks/useUser'
import { useSeguimientoLlamadas, useSeguimientoCalibraciones } from '../hooks/useSeguimientoEjecutivo'
import { ESTADO_LABEL, CAMPO_LABEL } from '../../calibraciones/hooks/useCalibraciones'
import type { LlamadaDiario, LlamadaHistorico, SeguimientoCalibracionRow, EstadoCalibracion } from '../../../types'

const C = {
  cierre:       '#7c3aed',
  contactado:   '#16a34a',
  sinContacto:  '#d97706',
  noLlamado:    '#dc2626',
  calibracion:  '#0891b2',
  llamada:      '#005eb8',
}

const PUNTOS: Record<string, number> = { 'CIERRE': 3, 'CONTACTADO': 2, 'SIN CONTACTO': 1 }

const HOY = new Date().toISOString().split('T')[0]

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
function fmtFecha(iso: string) {
  const p = iso.split('-'); return `${p[2]}/${p[1]}`
}
// El historial de calibraciones guarda timestamptz; el día se toma en hora Colombia.
function diaColombia(ts: string) {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}
function fmtFechaHora(ts: string) {
  return new Date(ts).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}
function estadoLabel(v: string | null) {
  if (!v) return '—'
  return ESTADO_LABEL[v as EstadoCalibracion] ?? v
}

function Chip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer',
      fontFamily: 'var(--mono)', fontWeight: active ? 600 : 500, border: '1px solid',
      borderColor: active ? 'var(--accent)' : 'var(--border)',
      background: active ? 'var(--accent)' : 'var(--surface)',
      color: active ? '#fff' : 'var(--muted)',
      transition: 'all .12s',
    }}>{label}</button>
  )
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <span>{icon}</span> {children}
    </div>
  )
}

function Vacio({ icon, titulo, detalle }: { icon: string; titulo: string; detalle?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--muted)' }}>
      <div style={{ fontSize: '2rem', marginBottom: 10, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontWeight: 600 }}>{titulo}</div>
      {detalle && <div style={{ fontSize: '0.85rem', marginTop: 6 }}>{detalle}</div>}
    </div>
  )
}

const axisTick = { fontSize: 10, fontFamily: 'var(--mono)', fill: '#6b7a99' }

export function SeguimientoEjecutivoSection({ llamadasHoy }: { llamadasHoy: LlamadaDiario[] }) {
  type QuickRange = 7 | 30 | 90 | 'mes' | null

  const { hasModule } = useUser()
  const { data: profiles = [], isLoading: loadingProfiles } = useProfiles()
  const ejecutivos = useMemo(() =>
    profiles.filter(p => p.es_ejecutivo && p.activo)
      .sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email))
  , [profiles])

  const [seleccionId, setEjecutivoId] = useState<string | null>(null)
  const [desde, setDesde]             = useState(daysAgo(30))
  const [hasta, setHasta]             = useState(HOY)
  const [activeRange, setActiveRange] = useState<QuickRange>(30)

  // Por defecto el primero; si el elegido deja de ser ejecutivo, vuelve al primero.
  const ejecutivo = ejecutivos.find(e => e.id === seleccionId) ?? ejecutivos[0] ?? null
  const ejecutivoId = ejecutivo?.id ?? null
  const nombre = ejecutivo?.full_name ?? null

  const { data: historico = [], isLoading: loadingLlamadas } = useSeguimientoLlamadas(nombre, desde, hasta)
  const { data: cambios = [], isLoading: loadingCalib, error: errorCalib } = useSeguimientoCalibraciones(ejecutivoId, desde, hasta)

  // Igual que HistorialSection: las de hoy aún no están archivadas, viven en el diario.
  const llamadas = useMemo<LlamadaHistorico[]>(() => {
    if (!nombre || hasta < HOY || desde > HOY) return historico
    const hoy = llamadasHoy.filter(d => d.usuario === nombre && d.estado).map(d => ({
      id: d.id, otst: d.otst, cliente: d.cliente, ingeniero: d.ingeniero, garantia: d.garantia,
      estado: d.estado, hora: d.hora, usuario: d.usuario, fecha_dia: d.fecha_dia, archivado_at: '',
    }))
    return [...historico, ...hoy]
  }, [historico, llamadasHoy, nombre, desde, hasta])

  // ── KPIs llamadas ──────────────────────────────────────────────────────────
  const kLl = useMemo(() => {
    const cierre     = llamadas.filter(r => r.estado === 'CIERRE').length
    const contactado = llamadas.filter(r => r.estado === 'CONTACTADO').length
    const sinC       = llamadas.filter(r => r.estado === 'SIN CONTACTO').length
    const noL        = llamadas.filter(r => r.estado === 'NO LLAMADO').length
    const total      = cierre + contactado + sinC + noL
    const tasa       = total ? Math.round((cierre + contactado) / total * 100) : 0
    const pts        = llamadas.reduce((s, r) => s + (PUNTOS[r.estado] ?? 0), 0)
    const dias       = new Set(llamadas.map(r => r.fecha_dia)).size
    return { cierre, contactado, sinC, noL, total, tasa, pts, dias }
  }, [llamadas])

  const llamadasPorDia = useMemo(() => {
    const map: Record<string, { cierre: number; contactado: number; sinContacto: number; noLlamado: number }> = {}
    llamadas.forEach(r => {
      if (!r.fecha_dia) return
      map[r.fecha_dia] ??= { cierre: 0, contactado: 0, sinContacto: 0, noLlamado: 0 }
      if (r.estado === 'CIERRE')       map[r.fecha_dia].cierre++
      if (r.estado === 'CONTACTADO')   map[r.fecha_dia].contactado++
      if (r.estado === 'SIN CONTACTO') map[r.fecha_dia].sinContacto++
      if (r.estado === 'NO LLAMADO')   map[r.fecha_dia].noLlamado++
    })
    return Object.keys(map).sort().map(f => ({ fecha: fmtFecha(f), ...map[f] }))
  }, [llamadas])

  const topClientes = useMemo(() => {
    const map: Record<string, { total: number; cierre: number }> = {}
    llamadas.forEach(r => {
      const k = r.cliente?.trim() || '(Sin cliente)'
      map[k] ??= { total: 0, cierre: 0 }
      map[k].total++
      if (r.estado === 'CIERRE') map[k].cierre++
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 8)
  }, [llamadas])

  // ── KPIs calibraciones ─────────────────────────────────────────────────────
  const cambiosEstado = useMemo(() => cambios.filter(c => c.campo === 'estado'), [cambios])

  const kCal = useMemo(() => ({
    total:      cambios.length,
    estados:    cambiosEstado.length,
    ordenes:    new Set(cambios.map(c => c.orden_id)).size,
    terminadas: new Set(cambiosEstado.filter(c => c.valor_nuevo === 'terminado').map(c => c.orden_id)).size,
    creadas:    cambios.filter(c => c.campo === 'creacion').length,
  }), [cambios, cambiosEstado])

  const porCampo = useMemo(() => {
    const map: Record<string, number> = {}
    cambios.forEach(c => { map[c.campo] = (map[c.campo] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([campo, value]) => ({ name: CAMPO_LABEL[campo] ?? campo, value }))
  }, [cambios])

  // ── Actividad combinada por día ────────────────────────────────────────────
  const actividad = useMemo(() => {
    const map: Record<string, { llamadas: number; calibraciones: number }> = {}
    llamadas.forEach(r => { if (!r.fecha_dia) return; map[r.fecha_dia] ??= { llamadas: 0, calibraciones: 0 }; map[r.fecha_dia].llamadas++ })
    cambios.forEach(c => { const d = diaColombia(c.created_at); map[d] ??= { llamadas: 0, calibraciones: 0 }; map[d].calibraciones++ })
    return Object.keys(map).sort().map(f => ({ fecha: fmtFecha(f), Llamadas: map[f].llamadas, Calibraciones: map[f].calibraciones }))
  }, [llamadas, cambios])

  const quickRange = (q: 7 | 30 | 90 | 'mes') => {
    setActiveRange(q)
    setHasta(HOY)
    if (q === 'mes') { const h = new Date(); setDesde(new Date(h.getFullYear(), h.getMonth(), 1).toISOString().split('T')[0]); return }
    setDesde(daysAgo(q))
  }

  const ordenRef = (r: SeguimientoCalibracionRow) => {
    const texto = r.numero_oc ? `OC ${r.numero_oc}` : 'Sin OC'
    const style = { fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', background: 'var(--accent-bg)', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' as const }
    return hasModule('calibraciones')
      ? <Link to={`/calibraciones/${r.orden_id}`} style={style}>{texto}</Link>
      : <span style={style}>{texto}</span>
  }

  const estadoColumns: Column<SeguimientoCalibracionRow>[] = [
    { key: 'fecha',   header: 'Fecha',   width: '120px', render: r => <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtFechaHora(r.created_at)}</span> },
    { key: 'orden',   header: 'Orden',   width: '110px', render: ordenRef },
    { key: 'cliente', header: 'Cliente', render: r => <span style={{ fontWeight: 500 }}>{r.cliente}{r.anulada && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: 'var(--red)', fontFamily: 'var(--mono)' }}>ANULADA</span>}</span> },
    {
      key: 'cambio', header: 'Cambio de estado',
      render: r => (
        <span style={{ fontSize: '0.8rem', display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--muted)' }}>{estadoLabel(r.valor_anterior)}</span>
          <span style={{ color: 'var(--muted)' }}>→</span>
          <strong style={{ color: r.valor_nuevo === 'terminado' ? 'var(--green)' : 'var(--text)' }}>{estadoLabel(r.valor_nuevo)}</strong>
        </span>
      ),
    },
  ]

  const actividadColumns: Column<SeguimientoCalibracionRow>[] = [
    { key: 'fecha', header: 'Fecha', width: '120px', render: r => <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtFechaHora(r.created_at)}</span> },
    { key: 'orden', header: 'Orden', width: '110px', render: ordenRef },
    { key: 'campo', header: 'Campo', width: '180px', render: r => <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{CAMPO_LABEL[r.campo] ?? r.campo}</span> },
    {
      key: 'valor', header: 'Valor',
      render: r => {
        const v = r.campo === 'estado' ? `${estadoLabel(r.valor_anterior)} → ${estadoLabel(r.valor_nuevo)}` : (r.valor_nuevo ?? '—')
        return <span title={v} style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'inline-block', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>{v}</span>
      },
    },
  ]

  const inputStyle = {
    padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 8,
    background: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem',
    fontFamily: 'var(--sans)', cursor: 'pointer',
  }
  const labelStyle = { fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase' as const, fontFamily: 'var(--mono)', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 3 }

  if (loadingProfiles) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}><Spinner size={32} /></div>
  }

  if (!ejecutivos.length) {
    return (
      <Card>
        <Vacio icon="🧭" titulo="No hay ejecutivos asignados"
          detalle={<>Marca uno o más usuarios como ejecutivo en <Link to="/admin" style={{ color: 'var(--accent)' }}>Administración → Usuarios</Link>.</>} />
      </Card>
    )
  }

  const cargando = loadingLlamadas || loadingCalib

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Ejecutivo + rango */}
      <Card bodyStyle={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Ejecutivo</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ejecutivos.map(e => {
                const active = e.id === ejecutivoId
                const n = e.full_name ?? e.email
                return (
                  <button key={e.id} onClick={() => setEjecutivoId(e.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 6px',
                    borderRadius: 20, cursor: 'pointer', fontSize: '0.82rem', fontWeight: active ? 700 : 500,
                    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-bg)' : 'var(--surface)',
                    color: active ? 'var(--accent)' : 'var(--text)', transition: 'all .12s',
                  }}>
                    <Avatar name={n} emoji={e.avatar_emoji} color={e.avatar_color} size={24} />
                    {n}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Desde</label>
              <input type="date" value={desde} style={inputStyle} onChange={e => { setDesde(e.target.value); setActiveRange(null) }} />
            </div>
            <div>
              <label style={labelStyle}>Hasta</label>
              <input type="date" value={hasta} style={inputStyle} onChange={e => { setHasta(e.target.value); setActiveRange(null) }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {([7, 30, 90] as const).map(n => (
                <Chip key={n} label={`Últimos ${n} días`} active={activeRange === n} onClick={() => quickRange(n)} />
              ))}
              <Chip label="Este mes" active={activeRange === 'mes'} onClick={() => quickRange('mes')} />
            </div>
          </div>
        </div>
      </Card>

      {cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}><Spinner size={32} /></div>
      ) : (
        <>
          {/* Hero resumen */}
          <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: 'var(--radius-lg)', padding: '20px 24px', color: '#fff', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={nombre ?? ''} emoji={ejecutivo?.avatar_emoji} color={ejecutivo?.avatar_color} size={44} ring />
                <div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>Seguimiento del ejecutivo</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{nombre}</div>
                  <div style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', opacity: 0.85 }}>{fmtFecha(desde)} — {fmtFecha(hasta)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginLeft: 'auto' }}>
                {[
                  ['Llamadas', kLl.total],
                  ['Efectividad', `${kLl.tasa}%`],
                  ['Puntos', kLl.pts],
                  ['Cambios calibr.', kCal.total],
                  ['Órdenes tocadas', kCal.ordenes],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', opacity: 0.85, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actividad combinada */}
          {actividad.length > 0 && (
            <Card title="Actividad por día">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={actividad} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf1f7" vertical={false} />
                  <XAxis dataKey="fecha" tick={axisTick} tickLine={false} axisLine={false} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                  <Tooltip />
                  <Bar dataKey="Llamadas"      fill={C.llamada}     radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Calibraciones" fill={C.calibracion} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* ══ LLAMADAS ══ */}
          <SectionTitle icon="📞">Control de Llamadas</SectionTitle>
          {kLl.total === 0 ? (
            <Card><Vacio icon="📭" titulo="Sin llamadas marcadas en este rango" detalle="Se cuentan las llamadas en las que este usuario registró el estado." /></Card>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <StatCard value={kLl.cierre}     label="Cierre"       sublabel="venta lograda"      color="purple" />
                <StatCard value={kLl.contactado} label="Contactado"   sublabel="cliente contestó"   color="green"  />
                <StatCard value={kLl.sinC}       label="Sin contacto" sublabel="no se logró hablar" color="yellow" />
                <StatCard value={kLl.noL}        label="No llamado"   sublabel="no se intentó"      color="red"    />
                <StatCard value={kLl.dias}       label="Días activos" sublabel="con llamadas"       color="accent" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                <Card title="Llamadas por día">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={llamadasPorDia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#edf1f7" vertical={false} />
                      <XAxis dataKey="fecha" tick={axisTick} tickLine={false} axisLine={false} />
                      <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                      <Tooltip />
                      <Bar dataKey="cierre"      name="Cierre"       stackId="a" fill={C.cierre} />
                      <Bar dataKey="contactado"  name="Contactado"   stackId="a" fill={C.contactado} />
                      <Bar dataKey="sinContacto" name="Sin contacto" stackId="a" fill={C.sinContacto} />
                      <Bar dataKey="noLlamado"   name="No llamado"   stackId="a" fill={C.noLlamado} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="Clientes más llamados">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {topClientes.map(([cliente, v]) => (
                      <div key={cliente} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente}</span>
                        {v.cierre > 0 && <span style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', fontWeight: 700, color: C.cierre }}>{v.cierre}✅</span>}
                        <span style={{ minWidth: 28, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{v.total}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* ══ CALIBRACIONES ══ */}
          <SectionTitle icon="🧪">Calibraciones</SectionTitle>
          {errorCalib ? (
            <Card><Vacio icon="⚠️" titulo="No se pudo cargar la actividad de Calibraciones" detalle={(errorCalib as Error).message} /></Card>
          ) : kCal.total === 0 ? (
            <Card><Vacio icon="📭" titulo="Sin cambios en órdenes de calibración en este rango" /></Card>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <StatCard value={kCal.total}      label="Cambios"            sublabel="registrados en historial" color="accent" />
                <StatCard value={kCal.estados}    label="Cambios de estado"  sublabel="avances en el flujo"      color="purple" />
                <StatCard value={kCal.ordenes}    label="Órdenes tocadas"    sublabel="distintas"                color="yellow" />
                <StatCard value={kCal.creadas}    label="Órdenes creadas"    sublabel="nuevas OC"                color="green"  />
                <StatCard value={kCal.terminadas} label="Llevadas a terminado" sublabel="cerradas por el ejecutivo"   color="green"  />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                <Card title="Cambios de estado" bodyStyle={{ padding: 0 }}>
                  <Table columns={estadoColumns} data={cambiosEstado.slice(0, 50)} keyExtractor={r => r.id} emptyMessage="Sin cambios de estado en este rango" />
                </Card>
                <Card title="Qué modificó">
                  <ResponsiveContainer width="100%" height={Math.max(160, porCampo.length * 30)}>
                    <BarChart data={porCampo} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={axisTick} tickLine={false} axisLine={false} width={150} />
                      <Tooltip />
                      <Bar dataKey="value" name="Cambios" fill={C.calibracion} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
              <Card title="Actividad reciente en Calibraciones" bodyStyle={{ padding: 0 }}>
                <Table columns={actividadColumns} data={cambios.slice(0, 100)} keyExtractor={r => r.id} emptyMessage="Sin actividad" />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
