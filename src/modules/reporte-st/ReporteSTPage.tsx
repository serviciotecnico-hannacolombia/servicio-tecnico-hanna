import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from 'recharts'
import { ClipboardList, Timer, Zap, Download, X, Search } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { INTRANET_URL } from '../../lib/constants'
import { SLA_H } from './lib/businessHours'
import { processReport, parseExceptions, type CsvRow, type Exception, type ReportRow } from './lib/reportEngine'
import { getHistory, saveHistory, deleteMonth } from './lib/history'
import { exportExcel } from './lib/excelExport'

// ── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 25
const GREEN = '#16a34a', YELLOW = '#d97706', RED = '#dc2626', BLUE = '#2563eb'
const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d']

type SortCol = 'otst' | 'cliente' | 'tecnico' | 'vendedor' | 'inicio' | 'horas' | 'sla'
type SlaFilter = '' | 'ok' | 'fail' | 'nd'
type MorosoFilter = '' | '1' | '0'

function slaColor(pct: number) { return pct >= 70 ? GREEN : pct >= 50 ? YELLOW : RED }
function avgColor(h: number) { return h <= 30 ? GREEN : h <= 40 ? YELLOW : RED }
function shortFam(f: string) { return f.replace(/^[a-z]+\.\s*/i, '').replace(/\s*-\s*/g, ' ') }
function cellBg(avg: number) { return avg <= 15 ? 'var(--green-bg)' : avg <= 25 ? 'var(--yellow-bg)' : 'var(--red-bg)' }
function cellFg(avg: number) { return avg <= 15 ? 'var(--green)' : avg <= 25 ? 'var(--yellow)' : 'var(--red)' }

// ── Page ───────────────────────────────────────────────────────────────────────

export function ReporteSTPage() {
  const [rawRG, setRawRG] = useState<CsvRow[] | null>(null)
  const [rawTC, setRawTC] = useState<CsvRow[] | null>(null)
  const [excepts, setExcepts] = useState<Exception[]>([])
  const [rgName, setRgName] = useState('')
  const [tcName, setTcName] = useState('')
  const [excName, setExcName] = useState('')
  const [processing, setProcessing] = useState(false)

  const [month, setMonth] = useState<string | null>(null)
  const [allRows, setAllRows] = useState<ReportRow[]>([])       // solo diagnosticadas
  const [totalRows, setTotalRows] = useState<ReportRow[]>([])   // incluye sin diagnóstico
  const [statusMsg, setStatusMsg] = useState('Carga los dos archivos CSV para continuar')
  const [statusColor, setStatusColor] = useState<'muted' | 'green' | 'red'>('muted')

  const [search, setSearch] = useState('')
  const [fTech, setFTech] = useState('')
  const [fSla, setFSla] = useState<SlaFilter>('')
  const [fMoroso, setFMoroso] = useState<MorosoFilter>('')
  const [sortCol, setSortCol] = useState<SortCol>('horas')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [curPage, setCurPage] = useState(1)
  const [showHistory, setShowHistory] = useState(false)
  const [historyTick, setHistoryTick] = useState(0)

  const processed = allRows.length > 0 || totalRows.length > 0

  function readCsv(file: File, onDone: (rows: CsvRow[]) => void) {
    Papa.parse<CsvRow>(file, {
      header: true, delimiter: ';', skipEmptyLines: true, encoding: 'ISO-8859-1',
      complete: res => onDone(res.data),
      error: () => toast.error('No se pudo leer: ' + file.name),
    })
  }

  function handleRG(file: File) { readCsv(file, rows => { setRawRG(rows); setRgName(file.name) }) }
  function handleTC(file: File) { readCsv(file, rows => { setRawTC(rows); setTcName(file.name) }) }
  function handleExc(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = String(e.target?.result || '')
      const parsed = parseExceptions(text)
      setExcepts(parsed)
      setExcName(`${parsed.length} excepción(es)`)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const tecnicosDetectados = useMemo(
    () => [...new Set(allRows.map(r => r.tecnico).filter(Boolean))].sort(),
    [allRows]
  )

  function procesar() {
    if (!rawRG || !rawTC) return
    setProcessing(true)
    const { rows, rowsDiag, detectedMonth } = processReport(rawRG, rawTC, excepts)
    setAllRows(rowsDiag)
    setTotalRows(rows)
    setMonth(detectedMonth || '????-??')
    saveHistory(detectedMonth || '????-??', rows)
    setSearch(''); setFTech(''); setFSla(''); setFMoroso(''); setCurPage(1)
    setSortCol('horas'); setSortDir('desc')

    const sinDiagCount = rows.length - rowsDiag.length
    const excCount = rowsDiag.filter(r => r.excAdj > 0).length
    let txt = `${rowsDiag.length} OTs diagnosticadas · ${sinDiagCount} sin diagnóstico omitidas`
    if (excCount) txt += ` · ${excCount} con corrimiento de tiempo`
    setStatusMsg(txt); setStatusColor('green')
    setProcessing(false)
    setHistoryTick(t => t + 1)
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = allRows.length
    const cumple = allRows.filter(r => r.slaCumple)
    const morosas = allRows.filter(r => r.esMoroso).length
    const conExc = allRows.filter(r => r.excAdj > 0)
    const slaPct = total ? 100 * cumple.length / total : 0
    const avgH = total ? allRows.reduce((a, b) => a + (b.horas as number), 0) / total : 0
    const excAvg = conExc.length ? conExc.reduce((a, b) => a + b.excAdj, 0) / conExc.length : 0
    return { total, cumpleN: cumple.length, morosas, slaPct, avgH, conExcN: conExc.length, excAvg }
  }, [allRows])

  // ── Datos de gráficos ────────────────────────────────────────────────────────
  const techStats = useMemo(() => {
    const tm: Record<string, { sum: number, n: number, ok: number }> = {}
    allRows.filter(r => r.tecnico).forEach(r => {
      if (!tm[r.tecnico]) tm[r.tecnico] = { sum: 0, n: 0, ok: 0 }
      tm[r.tecnico].sum += r.horas as number; tm[r.tecnico].n++
      if (r.slaCumple) tm[r.tecnico].ok++
    })
    return Object.entries(tm).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tecnico, d]) => ({ tecnico, slaPct: Math.round(100 * d.ok / d.n), avg: +(d.sum / d.n).toFixed(1), n: d.n }))
  }, [allRows])

  const famData = useMemo(() => {
    const fc: Record<string, number> = {}
    allRows.forEach(r => r.cats.forEach(c => { fc[c] = (fc[c] || 0) + 1 }))
    return Object.entries(fc).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([fam, n]) => ({ fam: shortFam(fam), n }))
  }, [allRows])

  const trendData = useMemo(() => {
    const hist = getHistory()
    return Object.keys(hist).sort().map(m => ({ mes: m, sla: hist[m].slaPct, horas: hist[m].avgH }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyTick])

  const matrix = useMemo(() => {
    const withDiag = allRows.filter(r => r.tecnico)
    const m: Record<string, Record<string, { sum: number, n: number, ok: number }>> = {}
    const famTotals: Record<string, number> = {}
    withDiag.forEach(r => {
      if (!m[r.tecnico]) m[r.tecnico] = {}
      r.cats.forEach(fam => {
        if (!m[r.tecnico][fam]) m[r.tecnico][fam] = { sum: 0, n: 0, ok: 0 }
        m[r.tecnico][fam].sum += r.horas as number
        m[r.tecnico][fam].n++
        if (r.slaCumple) m[r.tecnico][fam].ok++
        famTotals[fam] = (famTotals[fam] || 0) + 1
      })
    })
    const techs = Object.keys(m).sort()
    const fams = Object.keys(famTotals).sort((a, b) => famTotals[b] - famTotals[a]).slice(0, 10)
    return { techs, fams, m }
  }, [allRows])

  const stackedData = useMemo(() => {
    const top8 = matrix.fams.slice(0, 8)
    return matrix.techs.map(t => {
      const row: Record<string, number | string> = { tecnico: t }
      top8.forEach(f => { row[shortFam(f)] = matrix.m[t][f] ? matrix.m[t][f].n : 0 })
      return row
    })
  }, [matrix])

  const famFailData = useMemo(() => {
    const famFail: Record<string, { n: number, fail: number }> = {}
    allRows.forEach(r => r.cats.forEach(f => {
      if (!famFail[f]) famFail[f] = { n: 0, fail: 0 }
      famFail[f].n++
      if (!r.slaCumple) famFail[f].fail++
    }))
    return Object.entries(famFail).filter(([, d]) => d.n >= 2)
      .sort((a, b) => (b[1].fail / b[1].n) - (a[1].fail / a[1].n)).slice(0, 12)
      .map(([f, d]) => ({ fam: shortFam(f), pct: Math.round(100 * d.fail / d.n), n: d.n }))
  }, [allRows])

  // ── Tabla de detalle ───────────────────────────────────────────────────────
  const viewRows = useMemo(() => {
    const q = search.toLowerCase().trim()
    let rows = allRows.filter(r => {
      if (q && ![r.otst, r.cliente, r.tecnico, r.vendedor].some(v => v.toLowerCase().includes(q))) return false
      if (fTech && r.tecnico !== fTech) return false
      if (fSla === 'ok' && !r.slaCumple) return false
      if (fSla === 'fail' && r.slaCumple !== false) return false
      if (fSla === 'nd' && r.horas !== null) return false
      if (fMoroso === '1' && !r.esMoroso) return false
      if (fMoroso === '0' && r.esMoroso) return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      let av: string | number, bv: string | number
      if (sortCol === 'horas') { av = a.horas ?? Infinity; bv = b.horas ?? Infinity }
      else if (sortCol === 'sla') {
        av = a.slaCumple === true ? 0 : a.slaCumple === false ? 1 : 2
        bv = b.slaCumple === true ? 0 : b.slaCumple === false ? 1 : 2
      } else if (sortCol === 'inicio') { av = a.esMoroso ? 1 : 0; bv = b.esMoroso ? 1 : 0 }
      else { av = (a[sortCol] as string || '').toLowerCase(); bv = (b[sortCol] as string || '').toLowerCase() }
      return av < bv ? (sortDir === 'asc' ? -1 : 1) : av > bv ? (sortDir === 'asc' ? 1 : -1) : 0
    })
    return rows
  }, [allRows, search, fTech, fSla, fMoroso, sortCol, sortDir])

  const totalPages = Math.ceil(viewRows.length / PER_PAGE) || 1
  const pageClamped = Math.min(curPage, totalPages)
  const pageRows = viewRows.slice((pageClamped - 1) * PER_PAGE, pageClamped * PER_PAGE)
  const maxH = Math.max(...allRows.filter(r => r.horas !== null).map(r => r.horas as number), SLA_H, 1)

  function sortBy(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  return (
    <div>
      <Header
        title="Reporte ST"
        subtitle="Tiempos y cumplimiento de SLA de diagnóstico — Servicio Técnico"
        actions={<button onClick={() => setShowHistory(true)} style={GHOST}>🕓 Historial</button>}
      />

      {/* ── Carga de archivos ────────────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Dropzone icon="📋" title="Reporte General" hint="Arrastra el CSV o haz clic aquí"
            loadedLabel={rgName && `✓ ${rgName}`} accept=".csv" onFile={handleRG} />
          <Dropzone icon="⏱" title="Tiempos % Cumplimiento" hint="Arrastra el CSV o haz clic aquí"
            loadedLabel={tcName && `✓ ${tcName}`} accept=".csv" onFile={handleTC} />
          <Dropzone icon="⚡" title="Excepciones" optional hint="TXT de corrimientos de tiempo"
            loadedLabel={excName && `✓ ${excName}`} accept=".txt" onFile={handleExc} />
        </div>

        <details open style={{ marginBottom: 14, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)', padding: '10px 14px' }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
            ¿Cómo armo el TXT de excepciones?
          </summary>
          <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 8 }}>
              Un renglón por excepción, formato: <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)' }}>
                AAAA-MM-DD, HH:MM-HH:MM, Motivo
              </code> y, opcionalmente, <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)' }}>
                | Técnico1; Técnico2
              </code> al final.
            </p>
            <ul style={{ marginBottom: 10, paddingLeft: 18 }}>
              <li><strong>Sin</strong> técnicos después del <code>|</code> → aplica a <strong>todos</strong>.</li>
              <li><strong>Con</strong> uno o más técnicos, separados por <code>;</code> → solo les resta el tiempo a esos técnicos.</li>
              <li>Líneas que empiezan con <code>#</code> son comentarios y se ignoran; las líneas en blanco también.</li>
              <li>Los nombres no distinguen mayúsculas/tildes, pero deben coincidir con el nombre del técnico en el CSV.</li>
            </ul>
            <pre style={{
              fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 14px', overflowX: 'auto', color: 'var(--text)', whiteSpace: 'pre',
            }}>{`# Ejemplo 1: capacitación para TODOS
2026-05-08, 09:00-11:00, Capacitación técnica equipos pH

# Ejemplo 2: reunión solo para un técnico
2026-05-06, 14:00-15:30, Reunión interna | Maicol Peralta

# Ejemplo 3: visita a cliente — afecta a dos técnicos
2026-05-13, 08:00-12:00, Visita cliente Bogotá | Maicol Peralta; Wilfor Leyva`}</pre>
          </div>
        </details>

        {tecnicosDetectados.length > 0 && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--accent-bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--mono)', lineHeight: 1.8 }}>
            <strong style={{ fontSize: 10, letterSpacing: '.5px', textTransform: 'uppercase' }}>Técnicos detectados (úsalos en el TXT de excepciones):</strong><br />
            {tecnicosDetectados.map(n => (
              <span key={n} style={{ display: 'inline-block', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 5, padding: '1px 7px', margin: '2px 3px 2px 0' }}>{n}</span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={procesar} disabled={!rawRG || !rawTC || processing} style={PRI}>
            {processing ? 'Procesando…' : 'Generar Reporte'}
          </button>
          <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: statusColor === 'green' ? 'var(--green)' : statusColor === 'red' ? 'var(--red)' : 'var(--muted)' }}>
            {statusMsg}
          </span>
        </div>
      </Card>

      {/* ── Dashboard ────────────────────────────────────────────────────── */}
      {processed && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '4px 12px', borderRadius: 8 }}>
              {month}
            </span>
          </div>

          <SecTitle>Indicadores del período</SecTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <Kpi icon={<ClipboardList size={16} />} label="OTs diagnosticadas" value={String(kpis.total)} sub={`${kpis.morosas} con regularización morosidad`} />
            <Kpi icon={<Timer size={16} />} label={`Cumplimiento SLA ≤${SLA_H}h`} value={kpis.total ? kpis.slaPct.toFixed(0) + '%' : '—'}
              color={slaColor(kpis.slaPct)} sub={`${kpis.cumpleN} cumplen · ${kpis.total - kpis.cumpleN} no cumplen`} />
            <Kpi icon={<Timer size={16} />} label="Promedio horas diagnóstico" value={kpis.total ? kpis.avgH.toFixed(1) + 'h' : '—'}
              color={avgColor(kpis.avgH)} sub={`SLA objetivo: ≤${SLA_H}h`} />
            <Kpi icon={<Zap size={16} />} label="OTs con corrimiento aplicado" value={String(kpis.conExcN)}
              sub={kpis.conExcN ? `prom. −${kpis.excAvg.toFixed(1)}h por corrimiento` : 'sin excepciones cargadas'} />
          </div>

          <SecTitle>Desempeño por técnico</SecTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ChartCard title="% Cumplimiento SLA por técnico" sub={`≤${SLA_H}h · Verde ≥70% · Ámbar 50–70% · Rojo <50%`}>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={techStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="tecnico" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => v + '%'} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="slaPct" radius={[5, 5, 0, 0]}>
                    {techStats.map((d, i) => <Cell key={i} fill={slaColor(d.slaPct)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Horas promedio por técnico" sub="Desde inicio de conteo hasta diagnóstico">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={techStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="tecnico" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => v + 'h'} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${v}h`} />
                  <Bar dataKey="avg" radius={[5, 5, 0, 0]}>
                    {techStats.map((d, i) => <Cell key={i} fill={avgColor(d.avg)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <ChartCard title="Familias de productos más diagnosticadas" sub="Top 10 categorías del período actual">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={famData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="fam" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${v} OTs`} />
                  <Bar dataKey="n" fill={BLUE} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Tendencia mensual — SLA % y Prom. horas" sub="Acumulado de reportes procesados en este navegador">
              {trendData.length < 2 ? (
                <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7 }}>
                  Se necesitan al menos 2 meses procesados<br />para ver la tendencia.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="sla" domain={[0, 100]} tickFormatter={v => v + '%'} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="horas" orientation="right" tickFormatter={v => v + 'h'} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="sla" type="monotone" dataKey="sla" name="SLA %" stroke={GREEN} strokeWidth={2} />
                    <Line yAxisId="horas" type="monotone" dataKey="horas" name="Prom. horas" stroke={YELLOW} strokeWidth={2} strokeDasharray="4 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <SecTitle>Matriz técnico × familia</SecTitle>
          <ChartCard title="Horas promedio de diagnóstico — técnico por familia" sub="Cada celda: promedio de horas hábiles · (n) = OTs · Verde ≤15h · Ámbar 15–25h · Rojo >25h">
            <HeatMatrix techs={matrix.techs} fams={matrix.fams} m={matrix.m} />
          </ChartCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <ChartCard title="Distribución de familias por técnico" sub="Cantidad de OTs diagnosticadas — top 8 familias">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stackedData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="tecnico" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 9.5 }} />
                  {matrix.fams.slice(0, 8).map((f, i) => (
                    <Bar key={f} dataKey={shortFam(f)} stackId="fam" fill={PALETTE[i % PALETTE.length]}
                      radius={i === Math.min(matrix.fams.length, 8) - 1 ? [4, 4, 0, 0] : undefined} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Familias con mayor incumplimiento SLA" sub={`% de OTs que superaron las ${SLA_H}h hábiles`}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={famFailData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => v + '%'} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="fam" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${v}% incumplió SLA`} />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                    {famFailData.map((d, i) => <Cell key={i} fill={d.pct >= 50 ? RED : d.pct >= 25 ? YELLOW : GREEN} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <SecTitle>Detalle operativo por OTST</SecTitle>
          <Card>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input value={search} onChange={e => { setSearch(e.target.value); setCurPage(1) }}
                  placeholder="Buscar OTST, cliente, técnico, vendedor…" style={{ ...INP, paddingLeft: 34 }} />
              </div>
              <select value={fTech} onChange={e => { setFTech(e.target.value); setCurPage(1) }} style={INP}>
                <option value="">Todos los técnicos</option>
                {techStats.map(t => <option key={t.tecnico} value={t.tecnico}>{t.tecnico}</option>)}
              </select>
              <select value={fSla} onChange={e => { setFSla(e.target.value as SlaFilter); setCurPage(1) }} style={INP}>
                <option value="">Todo SLA</option>
                <option value="ok">✓ Cumple ≤{SLA_H}h</option>
                <option value="fail">✗ No cumple</option>
                <option value="nd">Sin diagnóstico</option>
              </select>
              <select value={fMoroso} onChange={e => { setFMoroso(e.target.value as MorosoFilter); setCurPage(1) }} style={INP}>
                <option value="">Todos</option>
                <option value="1">Con regularización morosidad</option>
                <option value="0">Sin morosidad</option>
              </select>
              <button onClick={() => exportExcel(allRows, month || '')} style={{ ...GHOST, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={13} /> Exportar Excel
              </button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <TH onClick={() => sortBy('otst')}>OTST ↕</TH>
                    <TH onClick={() => sortBy('cliente')}>Cliente ↕</TH>
                    <TH onClick={() => sortBy('tecnico')}>Técnico ↕</TH>
                    <TH onClick={() => sortBy('vendedor')}>Vendedor ↕</TH>
                    <TH>Familia(s)</TH>
                    <TH onClick={() => sortBy('inicio')}>Inicio conteo ↕</TH>
                    <TH onClick={() => sortBy('horas')}>Horas ↕</TH>
                    <TH onClick={() => sortBy('sla')}>SLA ↕</TH>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr><td colSpan={8}><div style={EMPTY_TD}><ClipboardList size={28} strokeWidth={1.5} /><p>No hay resultados para los filtros seleccionados.</p></div></td></tr>
                  ) : pageRows.map(r => {
                    const pct = r.horas !== null ? Math.min(100, (r.horas / maxH) * 100) : 0
                    const barColor = r.slaCumple === true ? GREEN : r.slaCumple === false ? RED : '#94a3b8'
                    return (
                      <tr key={r.otst} style={{ borderBottom: '1px solid rgba(221,227,237,.5)' }}>
                        <td style={{ padding: '9px 12px' }}>
                          <a href={INTRANET_URL + r.otst} target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--mono)', textDecoration: 'none' }}>{r.otst}</a>
                        </td>
                        <td style={{ padding: '9px 12px', maxWidth: 155, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.cliente}>{r.cliente || '—'}</td>
                        <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{r.tecnico || '—'}</td>
                        <td style={{ padding: '9px 12px', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.vendedor}>{r.vendedor || '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--muted)', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.cats.join(', ')}>
                          {r.cats.map(shortFam).join(', ') || '—'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={r.esMoroso ? B_BLUE : B_GRAY}>{r.esMoroso ? 'Reg. morosidad' : 'Creación'}</span>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 52, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                              <div style={{ width: pct + '%', height: '100%', background: barColor }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 38 }}>{r.horas !== null ? r.horas.toFixed(1) + 'h' : '—'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          {r.slaCumple ? <span style={B_OK}>✓ Cumple</span> : <span style={B_FAIL}>✗ {(r.horas as number).toFixed(1)}h</span>}
                          {r.excAdj > 0 && <span style={EXC_CHIP} title={`Corrimiento: −${r.excAdj.toFixed(1)}h aplicado`}>−{r.excAdj.toFixed(1)}h⚡</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--surface2)', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                <span>{viewRows.length === 0 ? '0' : (pageClamped - 1) * PER_PAGE + 1}–{Math.min(pageClamped * PER_PAGE, viewRows.length)} de {viewRows.length} OTs</span>
                <Pagination total={totalPages} current={pageClamped} onGo={setCurPage} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onChange={() => setHistoryTick(t => t + 1)} />}
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────────

function Dropzone({ icon, title, hint, loadedLabel, optional, accept, onFile }: {
  icon: string, title: string, hint: string, loadedLabel?: string | false | '', optional?: boolean, accept: string, onFile: (f: File) => void,
}) {
  const [over, setOver] = useState(false)
  const loaded = !!loadedLabel
  return (
    <label
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      style={{
        border: `2px ${loaded ? 'solid' : 'dashed'} ${loaded ? 'var(--green)' : over ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 14, padding: '20px 14px', textAlign: 'center', cursor: 'pointer', display: 'block',
        background: loaded ? 'var(--green-bg)' : over ? 'var(--accent-bg)' : 'var(--surface2)', transition: 'all .16s',
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
        {title}{' '}
        {optional && <span style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 9, fontWeight: 600, padding: '1px 5px', textTransform: 'uppercase' }}>Opcional</span>}
      </h3>
      <p style={{ fontSize: 11, color: 'var(--muted)' }}>{loadedLabel || hint}</p>
      <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </label>
  )
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      {children}
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function Kpi({ icon, label, value, sub, color }: { icon: React.ReactNode, label: string, value: string, sub?: string, color?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)', color: color || 'var(--text)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function ChartCard({ title, sub, children }: { title: string, sub: string, children: React.ReactNode }) {
  return (
    <Card>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{title}</h3>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>{sub}</p>
      {children}
    </Card>
  )
}

function HeatMatrix({ techs, fams, m }: {
  techs: string[], fams: string[], m: Record<string, Record<string, { sum: number, n: number, ok: number }>>,
}) {
  if (!techs.length) return <p style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Sin datos de diagnóstico para construir la matriz.</p>
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420, fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)' }}>
              <th style={{ ...HM_TH, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--surface2)' }}>Técnico</th>
              {fams.map(f => <th key={f} title={f} style={HM_TH}>{shortFam(f)}</th>)}
              <th style={HM_TH}>Total</th>
            </tr>
          </thead>
          <tbody>
            {techs.map((t, ti) => {
              const rowBg = ti % 2 === 0 ? 'var(--surface)' : 'var(--surface2)'
              let tN = 0, tSum = 0, tOk = 0
              const cells = fams.map(f => {
                const d = m[t][f]
                if (!d) return <td key={f} style={{ ...HM_TD, background: rowBg, color: 'var(--border2)' }}>—</td>
                const avg = d.sum / d.n
                tN += d.n; tSum += d.sum; tOk += d.ok
                return (
                  <td key={f} title={`${shortFam(f)} · ${t}: ${avg.toFixed(1)}h prom. · ${d.n} OTs · SLA ${Math.round(100 * d.ok / d.n)}%`}
                    style={{ ...HM_TD, background: cellBg(avg), color: cellFg(avg), fontWeight: 600 }}>
                    {avg.toFixed(1)}h<br /><span style={{ fontWeight: 400, fontSize: 9 }}>({d.n})</span>
                  </td>
                )
              })
              const tAvg = tN > 0 ? (tSum / tN).toFixed(1) : null
              const tSla = tN > 0 ? Math.round(100 * tOk / tN) : null
              return (
                <tr key={t}>
                  <td style={{ ...HM_TD, textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: rowBg }}>{t}</td>
                  {cells}
                  <td style={{ ...HM_TD, background: rowBg, fontWeight: 700 }}>
                    {tAvg !== null ? <>{tAvg}h<br /><span style={{ fontSize: 9, fontWeight: 400, color: 'var(--muted)' }}>SLA {tSla}%</span></> : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10, flexWrap: 'wrap', fontSize: 10.5, color: 'var(--muted)' }}>
        <LegendDot color="var(--green-bg)" border="var(--green-border)" label="≤ 15 h" />
        <LegendDot color="var(--yellow-bg)" border="var(--yellow-border)" label="15 – 25 h" />
        <LegendDot color="var(--red-bg)" border="var(--red-border)" label="> 25 h" />
        <span>Top 10 familias por volumen · hover para detalle</span>
      </div>
    </div>
  )
}

function LegendDot({ color, border, label }: { color: string, border: string, label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 11, height: 11, borderRadius: 2, background: color, border: `1px solid ${border}`, display: 'inline-block' }} />
      {label}
    </span>
  )
}

function Pagination({ total, current, onGo }: { total: number, current: number, onGo: (p: number) => void }) {
  const range = (s: number, e: number) => Array.from({ length: e - s + 1 }, (_, i) => s + i)
  const pages: (number | '…')[] = total <= 7 ? range(1, total)
    : current <= 4 ? [...range(1, 5), '…', total]
    : current >= total - 3 ? [1, '…', ...range(total - 4, total)]
    : [1, '…', ...range(current - 1, current + 1), '…', total]
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {pages.map((p, i) => p === '…'
        ? <span key={i} style={{ padding: '2px 4px', color: 'var(--muted)' }}>…</span>
        : <button key={i} onClick={() => onGo(p)} style={{
            border: '1px solid var(--border)', background: p === current ? 'var(--accent)' : 'var(--surface)',
            color: p === current ? '#fff' : 'var(--text)', borderColor: p === current ? 'var(--accent)' : 'var(--border)',
            borderRadius: 6, padding: '2px 9px', cursor: 'pointer', fontSize: 11, minWidth: 28, fontFamily: 'var(--mono)',
          }}>{p}</button>
      )}
    </div>
  )
}

function TH({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) {
  return (
    <th onClick={onClick} style={{
      background: 'var(--surface2)', padding: '9px 12px', textAlign: 'left', fontFamily: 'var(--mono)',
      fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--muted)',
      borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default', userSelect: 'none',
    }}>{children}</th>
  )
}

function HistoryModal({ onClose, onChange }: { onClose: () => void, onChange: () => void }) {
  const [, forceRender] = useState(0)
  const hist = getHistory()
  const months = Object.keys(hist).sort().reverse()

  function handleDelete(m: string) {
    if (!confirm(`¿Eliminar el reporte de ${m}?`)) return
    deleteMonth(m)
    forceRender(x => x + 1)
    onChange()
  }

  return (
    <Modal open onClose={onClose} title="Historial de reportes">
      {months.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '14px 0' }}>No hay reportes guardados aún.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {months.map(m => {
            const h = hist[m]
            const color = h.slaPct >= 70 ? 'var(--green)' : h.slaPct >= 50 ? 'var(--yellow)' : 'var(--red)'
            return (
              <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{m}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                    {h.total} OTs · SLA <span style={{ color, fontWeight: 700 }}>{h.slaPct}%</span> · Prom. {h.avgH}h
                  </div>
                </div>
                <X size={18} style={{ cursor: 'pointer', color: 'var(--red)' }} onClick={() => handleDelete(m)} />
              </div>
            )
          })}
        </div>
      )}
      <p style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 14 }}>Datos almacenados en este navegador. No se suben a ningún servidor.</p>
    </Modal>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const INP: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
  borderRadius: 8, padding: '10px 13px', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
}
const PRI: React.CSSProperties = { padding: '11px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const GHOST: React.CSSProperties = { padding: '9px 16px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 12.5, cursor: 'pointer' }
const B_OK: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)', background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }
const B_FAIL: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)', background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }
const B_BLUE: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)', background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--border2)' }
const B_GRAY: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)', background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }
const EXC_CHIP: React.CSSProperties = { background: 'var(--yellow-bg)', color: 'var(--yellow)', border: '1px solid var(--yellow-border)', display: 'inline-block', padding: '1px 6px', borderRadius: 5, fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)', marginLeft: 4 }
const EMPTY_TD: React.CSSProperties = { textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }
const HM_TH: React.CSSProperties = { padding: '7px 9px', fontSize: 10, fontWeight: 600, color: 'var(--muted)', textAlign: 'center', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }
const HM_TD: React.CSSProperties = { padding: '6px 9px', textAlign: 'center', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
