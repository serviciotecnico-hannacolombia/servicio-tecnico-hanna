import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts'
import { Download } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { StatCard } from '../../../components/ui/StatCard'
import { Button } from '../../../components/ui/Button'
import { Table, type Column } from '../../../components/ui/Table'
import { Spinner } from '../../../components/ui/Spinner'
import { useHistorial } from '../hooks/useHistorial'
import { INTRANET_URL } from '../../../lib/constants'
import type { LlamadaHistorico } from '../../../types'

// ─── Colores (hex para SVG de Recharts) ───────────────────────────────────────
const C = {
  cierre:      '#7c3aed',
  contactado:  '#16a34a',
  sinContacto: '#d97706',
  noLlamado:   '#dc2626',
  sinMarcar:   '#9ca3af',
}

const ESTADO_STYLE: Record<string, { bg: string; color: string }> = {
  'CIERRE':       { bg: '#f2ecff', color: '#7c3aed' },
  'CONTACTADO':   { bg: '#f0fdf4', color: '#16a34a' },
  'SIN CONTACTO': { bg: '#fffbeb', color: '#d97706' },
  'NO LLAMADO':   { bg: '#fef2f2', color: '#dc2626' },
  '':             { bg: '#edf1f7', color: '#6b7a99' },
}

type SubTab = 'resumen' | 'tabla' | 'ingenieros'

const HOY = new Date().toISOString().split('T')[0]

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
function fmtFecha(iso: string) {
  const p = iso.split('-'); return `${p[2]}/${p[1]}`
}
function estadoKey(e: string) {
  if (e === 'CIERRE')       return 'cierre'
  if (e === 'CONTACTADO')   return 'contactado'
  if (e === 'SIN CONTACTO') return 'sinContacto'
  if (e === 'NO LLAMADO')   return 'noLlamado'
  return 'sinMarcar'
}

// ─── Tooltip personalizado para barras ────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0)
  return (
    <div style={{ background: '#fff', border: '1px solid #dde3ed', borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem', boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.fill }}>
          <span>{p.name}</span><strong>{p.value}</strong>
        </div>
      ))}
      <div style={{ borderTop: '1px solid #dde3ed', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', color: '#0a0f1a', fontWeight: 700 }}>
        <span>Total</span><span>{total}</span>
      </div>
    </div>
  )
}

// ─── Chip de filtro rápido ─────────────────────────────────────────────────────
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

// ─── Componente principal ──────────────────────────────────────────────────────
export function HistorialSection() {
  type QuickRange = 7 | 30 | 90 | 'mes' | 'todo' | null

  const [subTab, setSubTab]           = useState<SubTab>('resumen')
  const [desde, setDesde]             = useState(daysAgo(30))
  const [hasta, setHasta]             = useState(HOY)
  const [activeRange, setActiveRange] = useState<QuickRange>(30)
  const [filtroIng, setFiltroIng]     = useState('')
  const [filtroEst, setFiltroEst]     = useState('')
  const [filtroUsr, setFiltroUsr]     = useState('')
  const [busqueda, setBusqueda]       = useState('')
  const [page, setPage]               = useState(1)
  const PAGE = 50

  const { data: todos = [], isLoading } = useHistorial(desde, hasta)

  // Selects dinámicos
  const ingenieros = useMemo(() => [...new Set(todos.map(r => r.ingeniero).filter(Boolean) as string[])].sort(), [todos])
  const usuarios   = useMemo(() => [...new Set(todos.map(r => r.usuario).filter(Boolean) as string[])].sort(), [todos])

  // KPIs globales
  const kpis = useMemo(() => {
    const cierre     = todos.filter(r => r.estado === 'CIERRE').length
    const contactado = todos.filter(r => r.estado === 'CONTACTADO').length
    const sinC       = todos.filter(r => r.estado === 'SIN CONTACTO').length
    const noL        = todos.filter(r => r.estado === 'NO LLAMADO').length
    const total      = todos.length
    const productivas = cierre + contactado
    const tasa       = total ? Math.round(productivas / total * 100) : 0
    const dias       = new Set(todos.map(r => r.fecha_dia).filter(Boolean)).size
    return { cierre, contactado, sinC, noL, total, productivas, tasa, dias }
  }, [todos])

  // Timeline (últimos 30 días del rango)
  const timeline = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    todos.forEach(r => {
      if (!r.fecha_dia) return
      if (!map[r.fecha_dia]) map[r.fecha_dia] = { cierre: 0, contactado: 0, sinContacto: 0, noLlamado: 0, sinMarcar: 0 }
      map[r.fecha_dia][estadoKey(r.estado ?? '')]++
    })
    return Object.keys(map).sort().slice(-30).map(f => ({ fecha: fmtFecha(f), iso: f, ...map[f] }))
  }, [todos])

  // Pie: distribución estados
  const pieData = useMemo(() => [
    { name: 'Cierre',       value: kpis.cierre,     color: C.cierre },
    { name: 'Contactado',   value: kpis.contactado, color: C.contactado },
    { name: 'Sin contacto', value: kpis.sinC,       color: C.sinContacto },
    { name: 'No llamado',   value: kpis.noL,        color: C.noLlamado },
    { name: 'Sin marcar',   value: kpis.total - kpis.cierre - kpis.contactado - kpis.sinC - kpis.noL, color: C.sinMarcar },
  ].filter(d => d.value > 0), [kpis])

  // Top clientes
  const topClientes = useMemo(() => {
    const map: Record<string, number> = {}
    todos.forEach(r => { const k = r.cliente || '(Sin cliente)'; map[k] = (map[k] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name: name.length > 22 ? name.slice(0, 22) + '…' : name, value }))
  }, [todos])

  // Stats por ingeniero
  const ingStats = useMemo(() => {
    const map: Record<string, { total: number; cierre: number; contactado: number; sinC: number; noL: number }> = {}
    todos.forEach(r => {
      const k = r.ingeniero || '(Sin asignar)'
      if (!map[k]) map[k] = { total: 0, cierre: 0, contactado: 0, sinC: 0, noL: 0 }
      map[k].total++
      if (r.estado === 'CIERRE')       map[k].cierre++
      if (r.estado === 'CONTACTADO')   map[k].contactado++
      if (r.estado === 'SIN CONTACTO') map[k].sinC++
      if (r.estado === 'NO LLAMADO')   map[k].noL++
    })
    return Object.entries(map)
      .map(([ing, s]) => ({ ing, ...s, tasa: s.total ? Math.round((s.cierre + s.contactado) / s.total * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
  }, [todos])

  const ingChart = ingStats.slice(0, 8).map(s => ({
    name: s.ing.split(' ')[0],
    fullName: s.ing,
    Cierre: s.cierre,
    Contactado: s.contactado,
    'Sin contacto': s.sinC,
    'No llamado': s.noL,
  }))

  // Filtros para tabla
  const filtrados = useMemo(() => {
    return todos.filter(r => {
      if (filtroIng && r.ingeniero !== filtroIng)        return false
      if (filtroEst && (r.estado ?? '') !== filtroEst)  return false
      if (filtroUsr && r.usuario !== filtroUsr)         return false
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase()
        if (!`${r.otst} ${r.cliente ?? ''} ${r.ingeniero ?? ''}`.toLowerCase().includes(q)) return false
      }
      return true
    }).sort((a, b) => (b.fecha_dia ?? '').localeCompare(a.fecha_dia ?? ''))
  }, [todos, filtroIng, filtroEst, filtroUsr, busqueda])

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE))
  const paginated  = filtrados.slice((page - 1) * PAGE, page * PAGE)

  const quickRange = (q: number | 'mes' | 'todo') => {
    setPage(1)
    setActiveRange(q as QuickRange)
    const hoy = new Date()
    setHasta(HOY)
    if (q === 'todo') { setDesde('2020-01-01'); return }
    if (q === 'mes')  { setDesde(new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]); return }
    setDesde(daysAgo(q as number))
  }

  const exportCSV = () => {
    const headers = ['Fecha', 'OTST', 'Cliente', 'Ingeniero', 'Garantía', 'Estado', 'Hora', 'Usuario']
    const rows = filtrados.map(r => [r.fecha_dia ?? '', r.otst, r.cliente ?? '', r.ingeniero ?? '', r.garantia, r.estado ?? '', r.hora ?? '', r.usuario ?? ''])
    const esc  = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const csv  = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const parts = [`historico`, desde, hasta]
    if (filtroIng) parts.push(filtroIng.split(' ')[0])
    if (filtroEst) parts.push(filtroEst.replace(' ', '-'))
    if (filtroUsr) parts.push(filtroUsr.split(' ')[0])
    const a = document.createElement('a'); a.href = url; a.download = `${parts.join('_')}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const inputStyle = {
    padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 8,
    background: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem',
    fontFamily: 'var(--sans)', cursor: 'pointer',
  }
  const labelStyle = { fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase' as const, fontFamily: 'var(--mono)', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 3 }

  // ── Columnas tabla histórico ──────────────────────────────────────────────
  const tablaColumns: Column<LlamadaHistorico>[] = [
    {
      key: 'fecha', header: 'Fecha', width: '90px',
      render: r => <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.78rem', background: '#edf1f7', padding: '2px 8px', borderRadius: 8, color: '#6b7a99' }}>{r.fecha_dia ? fmtFecha(r.fecha_dia) : '—'}</span>,
    },
    {
      key: 'otst', header: 'OTST', width: '100px',
      render: r => (
        <a href={INTRANET_URL + r.otst} target="_blank" rel="noopener noreferrer"
          style={{ color: '#005eb8', fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', background: '#eaf1fb', padding: '3px 8px', borderRadius: 6, display: 'inline-block', transition: 'all .1s' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#005eb8'; el.style.color = '#fff' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#eaf1fb'; el.style.color = '#005eb8' }}
        >{r.otst}</a>
      ),
    },
    { key: 'cliente',   header: 'Cliente',   render: r => <span style={{ fontWeight: 500 }}>{r.cliente || '—'}</span> },
    { key: 'ingeniero', header: 'Ingeniero', render: r => <span style={{ fontSize: '0.82rem', color: '#6b7a99' }}>{r.ingeniero || '—'}</span> },
    {
      key: 'estado', header: 'Estado', width: '160px',
      render: r => {
        const s = ESTADO_STYLE[r.estado ?? ''] ?? ESTADO_STYLE['']
        const labels: Record<string, string> = { 'CIERRE': '✅ Cierre', 'CONTACTADO': '📞 Contactado', 'SIN CONTACTO': '📵 Sin contacto', 'NO LLAMADO': '⏭ No llamado', '': '— Sin marcar' }
        return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, fontFamily: 'DM Mono, monospace', background: s.bg, color: s.color }}>{labels[r.estado ?? ''] ?? r.estado}</span>
      },
    },
    { key: 'hora',    header: 'Hora',    width: '60px',  align: 'center', render: r => <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.78rem', color: '#6b7a99' }}>{r.hora || '—'}</span> },
    { key: 'usuario', header: 'Registró', width: '100px', render: r => <span style={{ fontSize: '0.78rem', color: '#6b7a99' }}>{r.usuario || '—'}</span> },
  ]

  // ── Columnas tabla ingenieros ──────────────────────────────────────────────
  type IngRow = typeof ingStats[number]
  const ingColumns: Column<IngRow>[] = [
    { key: 'ing',        header: 'Ingeniero',    render: r => <span style={{ fontWeight: 600 }}>{r.ing}</span> },
    { key: 'total',      header: 'Total',        width: '70px',  align: 'center', render: r => <strong style={{ fontFamily: 'DM Mono, monospace' }}>{r.total}</strong> },
    { key: 'cierre',     header: 'Cierre',       width: '70px',  align: 'center', render: r => <span style={{ color: '#7c3aed', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{r.cierre}</span> },
    { key: 'contactado', header: 'Contactado',   width: '90px',  align: 'center', render: r => <span style={{ color: '#16a34a', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{r.contactado}</span> },
    { key: 'sinC',       header: 'Sin contacto', width: '100px', align: 'center', render: r => <span style={{ color: '#d97706', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{r.sinC}</span> },
    { key: 'noL',        header: 'No llamado',   width: '90px',  align: 'center', render: r => <span style={{ color: '#dc2626', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{r.noL}</span> },
    {
      key: 'tasa', header: 'Efectividad', width: '110px', align: 'center',
      render: r => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 6, background: '#edf1f7', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${r.tasa}%`, background: r.tasa >= 70 ? '#16a34a' : r.tasa >= 40 ? '#d97706' : '#dc2626', borderRadius: 4, transition: 'width .4s' }} />
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'DM Mono, monospace', color: r.tasa >= 70 ? '#16a34a' : r.tasa >= 40 ? '#d97706' : '#dc2626', minWidth: 36 }}>{r.tasa}%</span>
        </div>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Filtro de fecha */}
      <Card bodyStyle={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Desde</label>
            <input type="date" value={desde} style={inputStyle} onChange={e => { setDesde(e.target.value); setPage(1); setActiveRange(null) }} />
          </div>
          <div>
            <label style={labelStyle}>Hasta</label>
            <input type="date" value={hasta} style={inputStyle} onChange={e => { setHasta(e.target.value); setPage(1); setActiveRange(null) }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {([7, 30, 90] as const).map(n => (
              <Chip key={n} label={`Últimos ${n} días`} active={activeRange === n} onClick={() => quickRange(n)} />
            ))}
            <Chip label="Este mes"        active={activeRange === 'mes'}  onClick={() => quickRange('mes')} />
            <Chip label="Todo el historial" active={activeRange === 'todo'} onClick={() => quickRange('todo')} />
          </div>
          {todos.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--mono)', alignSelf: 'center' }}>
              {todos.length} registro{todos.length !== 1 ? 's' : ''} · {kpis.dias} día{kpis.dias !== 1 ? 's' : ''}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={exportCSV}
            disabled={filtrados.length === 0}
            style={{ marginLeft: 'auto', flexShrink: 0 }}
            title={filtrados.length !== todos.length ? `Exportando ${filtrados.length} de ${todos.length} (con filtros activos)` : `Exportar ${filtrados.length} registros`}
          >
            <Download size={14} />
            CSV{filtrados.length !== todos.length
              ? ` · ${filtrados.length} filtrados`
              : filtrados.length > 0 ? ` · ${filtrados.length}` : ''}
          </Button>
        </div>
      </Card>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#fff', border: '1px solid #dde3ed', borderRadius: 8, padding: 4, width: 'fit-content', boxShadow: '0 2px 12px rgba(0,94,184,.08)' }}>
        {([['resumen', '📊 Resumen'], ['tabla', '📋 Tabla'], ['ingenieros', '👤 Por ingeniero']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)} style={{
            padding: '6px 18px', borderRadius: 6, border: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif',
            background: subTab === key ? 'linear-gradient(135deg, #005eb8, #1a7de8)' : 'transparent',
            color: subTab === key ? '#fff' : '#6b7a99',
            fontWeight: subTab === key ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer',
            boxShadow: subTab === key ? '0 2px 8px rgba(0,94,184,.25)' : 'none', transition: 'all .15s',
          }}>{label}</button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}><Spinner size={32} /></div>
      ) : todos.length === 0 ? (
        <Card><div style={{ textAlign: 'center', padding: '56px 20px', color: '#6b7a99' }}><div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.5 }}>📭</div><div style={{ fontWeight: 600 }}>Sin registros en este rango</div><div style={{ fontSize: '0.85rem', marginTop: 6 }}>Ajusta las fechas o archiva el día primero</div></div></Card>
      ) : (
        <>
          {/* ══ RESUMEN ══════════════════════════════════════════════════════ */}
          {subTab === 'resumen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Hero */}
              <div style={{ background: 'linear-gradient(135deg, #005eb8, #1a7de8)', borderRadius: 16, padding: '22px 28px', color: '#fff', boxShadow: '0 8px 32px rgba(0,94,184,.14)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', position: 'relative' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85, marginBottom: 6 }}>Tasa de efectividad</div>
                    <div style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>{kpis.tasa}%</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'DM Mono, monospace', opacity: 0.9, marginTop: 6 }}>
                      {kpis.productivas} productivas de {kpis.total} llamadas · {kpis.dias} días activos
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ height: 12, background: 'rgba(255,255,255,.2)', borderRadius: 20, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${kpis.tasa}%`, background: '#fff', borderRadius: 20, transition: 'width .6s cubic-bezier(.4,0,.2,1)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'DM Mono, monospace', marginTop: 6, opacity: 0.85 }}>
                      <span>0%</span><span>{kpis.productivas} / {kpis.total}</span><span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <StatCard value={kpis.cierre}     label="Cierre"       sublabel="venta lograda"    color="purple" />
                <StatCard value={kpis.contactado} label="Contactado"   sublabel="cliente contestó"  color="green"  />
                <StatCard value={kpis.sinC}       label="Sin contacto" sublabel="no se logró hablar" color="yellow" />
                <StatCard value={kpis.noL}        label="No llamado"   sublabel="no se intentó"     color="red"    />
              </div>

              {/* Gráficas fila 1: Timeline + Pie */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(260px, 340px)', gap: 16 }}>
                <Card title="Llamadas por día">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#edf1f7" vertical={false} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#6b7a99' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#6b7a99' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<BarTooltip />} />
                      <Bar dataKey="cierre"      name="Cierre"       stackId="a" fill={C.cierre}      radius={[0,0,0,0]} />
                      <Bar dataKey="contactado"  name="Contactado"   stackId="a" fill={C.contactado}  />
                      <Bar dataKey="sinContacto" name="Sin contacto" stackId="a" fill={C.sinContacto} />
                      <Bar dataKey="noLlamado"   name="No llamado"   stackId="a" fill={C.noLlamado}   />
                      <Bar dataKey="sinMarcar"   name="Sin marcar"   stackId="a" fill={C.sinMarcar}   radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Distribución de estados">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [`${v} (${kpis.total ? Math.round(v / kpis.total * 100) : 0}%)`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 4, justifyContent: 'center' }}>
                    {pieData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: '#6b7a99' }}>
                        <div style={{ width: 9, height: 9, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        {d.name}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Gráficas fila 2: Top clientes + Por ingeniero */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card title="Top clientes por volumen">
                  {topClientes.length === 0 ? <div style={{ color: '#6b7a99', fontSize: '0.85rem' }}>Sin datos</div> : (
                    topClientes.map(({ name, value }) => {
                      const max = topClientes[0].value
                      return (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ flex: '0 0 38%', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</div>
                          <div style={{ flex: 1, height: 7, background: '#edf1f7', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${value / max * 100}%`, background: 'linear-gradient(90deg, #005eb8, #1a7de8)', borderRadius: 4 }} />
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7a99', fontFamily: 'DM Mono, monospace', minWidth: 22, textAlign: 'right' }}>{value}</div>
                        </div>
                      )
                    })
                  )}
                </Card>

                <Card title="Avance por ingeniero">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={ingChart} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#6b7a99' }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#6b7a99' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<BarTooltip />} />
                      <Bar dataKey="Cierre"       stackId="a" fill={C.cierre}      />
                      <Bar dataKey="Contactado"   stackId="a" fill={C.contactado}  />
                      <Bar dataKey="Sin contacto" stackId="a" fill={C.sinContacto} />
                      <Bar dataKey="No llamado"   stackId="a" fill={C.noLlamado}   radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </div>
          )}

          {/* ══ TABLA ════════════════════════════════════════════════════════ */}
          {subTab === 'tabla' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card bodyStyle={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>🔍</span>
                    <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1) }} placeholder="Buscar OTST, cliente o ingeniero…"
                      style={{ ...inputStyle, width: '100%', paddingLeft: 32 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ingeniero</label>
                    <select value={filtroIng} onChange={e => { setFiltroIng(e.target.value); setPage(1) }} style={inputStyle}>
                      <option value="">Todos</option>
                      {ingenieros.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Estado</label>
                    <select value={filtroEst} onChange={e => { setFiltroEst(e.target.value); setPage(1) }} style={inputStyle}>
                      <option value="">Todos</option>
                      <option value="CIERRE">Cierre</option>
                      <option value="CONTACTADO">Contactado</option>
                      <option value="SIN CONTACTO">Sin contacto</option>
                      <option value="NO LLAMADO">No llamado</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Usuario</label>
                    <select value={filtroUsr} onChange={e => { setFiltroUsr(e.target.value); setPage(1) }} style={inputStyle}>
                      <option value="">Todos</option>
                      {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#6b7a99', fontFamily: 'DM Mono, monospace' }}>
                  {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}{filtrados.length !== todos.length && ` de ${todos.length}`}
                </div>
              </Card>

              <Card bodyStyle={{ padding: 0 }}>
                <Table columns={tablaColumns} data={paginated} emptyMessage="Sin resultados" keyExtractor={r => r.id} />
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid #dde3ed', flexWrap: 'wrap' }}>
                    {[['««', 1], ['‹ Ant', page - 1], ['Sig ›', page + 1], ['»»', totalPages]].map(([label, target]) => (
                      <button key={label} disabled={page === (label === '««' || label === '‹ Ant' ? 1 : totalPages) && (label === '««' || label === '‹ Ant' ? page === 1 : page === totalPages)}
                        onClick={() => { setPage(Math.min(Math.max(1, target as number), totalPages)); window.scrollTo(0, 0) }}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #dde3ed', background: '#fff', color: '#6b7a99', fontSize: '0.78rem', fontFamily: 'DM Mono, monospace', fontWeight: 600, cursor: 'pointer', transition: 'all .1s' }}
                      >{label}</button>
                    ))}
                    <span style={{ fontSize: '0.78rem', fontFamily: 'DM Mono, monospace', color: '#0a0f1a' }}>
                      Pág <strong>{page}</strong> de <strong>{totalPages}</strong> &nbsp;·&nbsp; {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, filtrados.length)} de {filtrados.length}
                    </span>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ══ POR INGENIERO ════════════════════════════════════════════════ */}
          {subTab === 'ingenieros' && (
            <Card bodyStyle={{ padding: 0 }}>
              <Table columns={ingColumns} data={ingStats} emptyMessage="Sin datos" keyExtractor={r => r.ing} />
            </Card>
          )}
        </>
      )}
    </div>
  )
}
