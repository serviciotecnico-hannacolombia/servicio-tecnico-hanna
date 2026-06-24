import { useState, useEffect, type CSSProperties } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { BarChart2, ChevronLeft, ChevronRight, Pencil, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'
import { useIndicadores } from './hooks/useIndicadores'
import type { CategoriaIndicador, IndicadorMeta, IndicadorReal } from '../../types'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CATS: { key: CategoriaIndicador; label: string; accent: string }[] = [
  { key: 'mantenimiento', label: 'Servicios de Mantenimiento', accent: '#3b82f6' },
  { key: 'calibracion',   label: 'Servicios de Calibración',   accent: '#8b5cf6' },
  { key: 'codigos_hanna', label: 'Meta Códigos HANNA',         accent: '#10b981' },
]

const fmtCOP = (n: number) =>
  '$ ' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtM = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`

function semaforo(pct: number, hasData: boolean) {
  if (!hasData) return { color: 'var(--muted)', bg: 'var(--surface2)', border: 'var(--border)', label: '—', texto: '' }
  if (pct >= 100) return { color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)', label: `${pct}%`, texto: '🟢 Meta superada' }
  if (pct >= 80)  return { color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)', label: `${pct}%`, texto: '🟢 En camino' }
  if (pct >= 60)  return { color: 'var(--yellow)', bg: 'var(--yellow-bg)', border: 'var(--yellow-border)', label: `${pct}%`, texto: '🟡 Atención' }
  return { color: 'var(--red)', bg: 'var(--red-bg)', border: 'var(--red-border)', label: `${pct}%`, texto: '🔴 Por debajo' }
}

// ─── Tooltip del gráfico ──────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; stroke: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const metaEntry = payload.find(p => p.dataKey === 'meta')
  const realEntry = payload.find(p => p.dataKey === 'real')
  const meta = metaEntry?.value ?? null
  const real = realEntry?.value ?? null
  const pct = meta != null && real != null ? Math.round((real / meta) * 100) : null
  const sem = pct != null ? semaforo(pct, true) : null

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,.12)',
      fontSize: '0.8rem', minWidth: 190,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--mono)' }}>
        {label}
      </div>
      {meta != null && (
        <div style={{ color: 'var(--muted)', marginBottom: 2 }}>
          Meta: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtCOP(meta)}</span>
        </div>
      )}
      {real != null && (
        <div style={{ color: 'var(--muted)', marginBottom: 4 }}>
          Real: <span style={{ fontWeight: 600, color: realEntry?.stroke }}>{fmtCOP(real)}</span>
        </div>
      )}
      {sem && (
        <div style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 6,
          background: sem.bg, color: sem.color, fontWeight: 700, fontSize: '0.72rem',
        }}>
          {sem.label}
        </div>
      )}
    </div>
  )
}

// ─── MetaSection ──────────────────────────────────────────────────────────────

function MetaSection({
  cat, metas, reales, mesActual, onRegistrar,
}: {
  cat: typeof CATS[0]
  metas: IndicadorMeta[]
  reales: IndicadorReal[]
  mesActual: number
  onRegistrar: (mes: number) => void
}) {
  const metaMes   = metas.find(m => m.mes === mesActual)
  const realMes   = reales.find(r => r.mes === mesActual)
  const metaVal   = metaMes?.meta ?? 0
  const realVal   = realMes?.valor_real ?? 0
  const hasData   = realVal > 0
  const pct       = metaVal > 0 ? Math.round((realVal / metaVal) * 100) : 0
  const sem       = semaforo(pct, hasData)
  const totalMeta = metas.reduce((s, m) => s + m.meta, 0)
  const totalReal = reales.reduce((s, r) => s + r.valor_real, 0)
  const barWidth  = Math.min(pct, 100)

  const chartData = MESES_CORTO.map((mes, i) => {
    const m = metas.find(x => x.mes === i + 1)
    const r = reales.find(x => x.mes === i + 1)
    return {
      mes,
      meta: m?.meta ?? null,
      real: r != null ? r.valor_real : null,
    }
  })

  const kpiCard = (title: string, value: React.ReactNode, sub?: React.ReactNode, highlight?: boolean) => (
    <div style={{
      flex: 1, minWidth: 140, padding: '14px 16px', borderRadius: 'var(--radius-sm)',
      border: `1px solid ${highlight ? cat.accent + '60' : 'var(--border)'}`,
      background: 'var(--surface2)',
    }}>
      <div style={{
        fontSize: '0.63rem', fontFamily: 'var(--mono)', textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)', lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )

  return (
    <Card title={cat.label}>
      {/* KPI row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>

        {kpiCard(
          `Meta ${MESES_LARGO[mesActual - 1]}`,
          metaVal > 0 ? fmtCOP(metaVal) : '—',
          metaMes?.porcentaje != null ? (
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {metaMes.porcentaje}% sobre ventas
            </span>
          ) : undefined
        )}

        {/* Real del mes — con botón editar */}
        <div style={{
          flex: 1, minWidth: 140, padding: '14px 16px', borderRadius: 'var(--radius-sm)',
          border: `1.5px solid ${hasData ? cat.accent + '70' : 'var(--border)'}`,
          background: 'var(--surface2)', position: 'relative',
        }}>
          <div style={{
            fontSize: '0.63rem', fontFamily: 'var(--mono)', textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: 6,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>Real acumulado {MESES_CORTO[mesActual - 1]}</span>
            <button
              onClick={() => onRegistrar(mesActual)}
              title="Actualizar valor real"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 4, color: 'var(--muted)', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = cat.accent }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
            >
              <Pencil size={12} />
            </button>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: hasData ? cat.accent : 'var(--muted)', fontFamily: 'var(--mono)', lineHeight: 1.2 }}>
            {hasData ? fmtCOP(realVal) : 'Sin datos'}
          </div>
          {realMes && (
            <div style={{ fontSize: '0.63rem', color: 'var(--muted)', marginTop: 4 }}>
              por {realMes.actualizado_por || '—'}
            </div>
          )}
        </div>

        {/* Cumplimiento / semáforo */}
        <div style={{
          flex: 1, minWidth: 140, padding: '14px 16px', borderRadius: 'var(--radius-sm)',
          border: `1.5px solid ${sem.border}`, background: sem.bg,
        }}>
          <div style={{
            fontSize: '0.63rem', fontFamily: 'var(--mono)', textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: 6,
          }}>
            Cumplimiento
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: sem.color, fontFamily: 'var(--mono)', lineHeight: 1.1 }}>
            {sem.label}
          </div>
          {sem.texto && (
            <div style={{ fontSize: '0.7rem', color: sem.color, marginTop: 4, fontWeight: 600 }}>
              {sem.texto}
            </div>
          )}
        </div>

        {kpiCard(
          'Total anual meta',
          fmtCOP(totalMeta),
          totalReal > 0 ? (
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
              Real YTD: {fmtCOP(totalReal)}
            </span>
          ) : undefined
        )}
      </div>

      {/* Barra de progreso */}
      {metaVal > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 6,
          }}>
            <span style={{ color: hasData ? cat.accent : 'var(--muted)', fontWeight: hasData ? 700 : 400 }}>
              {hasData ? `${fmtM(realVal)}  (${pct}%)` : 'Sin datos registrados'}
            </span>
            <span>Meta: {fmtM(metaVal)}</span>
          </div>
          <div style={{ height: 10, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${barWidth}%`,
              background: `linear-gradient(90deg, ${cat.accent}aa, ${cat.accent})`,
              borderRadius: 999,
              transition: 'width 0.5s ease',
              minWidth: barWidth > 0 ? 8 : 0,
            }} />
          </div>
        </div>
      )}

      {/* Gráfico meta vs real */}
      <div style={{ height: 230 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`}
              tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="meta"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              name="Meta"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="real"
              stroke={cat.accent}
              strokeWidth={2.5}
              dot={{ r: 4, fill: cat.accent, stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: cat.accent, strokeWidth: 2, fill: '#ffffff' }}
              name="Real"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: '#94a3b8' }}>
          <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 4" /></svg>
          Meta
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: cat.accent }}>
          <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke={cat.accent} strokeWidth="2.5" /></svg>
          Real
        </div>
      </div>
    </Card>
  )
}

// ─── RegistrarRealModal ───────────────────────────────────────────────────────

function RegistrarRealModal({
  open, onClose, label, metas, reales, defaultMes, onSave,
}: {
  open: boolean
  onClose: () => void
  label: string
  metas: IndicadorMeta[]
  reales: IndicadorReal[]
  defaultMes: number
  onSave: (mes: number, valor: number) => Promise<void>
}) {
  const [mesSel, setMesSel]   = useState(defaultMes)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!open) return
    setMesSel(defaultMes)
    const r = reales.find(x => x.mes === defaultMes)
    setInputVal(r ? String(r.valor_real) : '')
  }, [open, defaultMes])

  const handleMesChange = (mes: number) => {
    setMesSel(mes)
    const r = reales.find(x => x.mes === mes)
    setInputVal(r ? String(r.valor_real) : '')
  }

  const currentReal = reales.find(x => x.mes === mesSel)
  const metaMes     = metas.find(m => m.mes === mesSel)
  const preview     = inputVal ? parseInt(inputVal.replace(/[^0-9]/g, ''), 10) : NaN
  const pctPreview  = metaMes && !isNaN(preview) && preview > 0
    ? Math.round((preview / metaMes.meta) * 100) : null
  const semPrev     = pctPreview != null ? semaforo(pctPreview, true) : null

  const handleSave = async () => {
    const val = parseInt(inputVal.replace(/[^0-9]/g, ''), 10)
    if (isNaN(val) || val < 0) { toast.error('Ingresa un valor válido'); return }
    setSaving(true)
    try {
      await onSave(mesSel, val)
      toast.success('Valor registrado')
      onClose()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const fieldLabel: CSSProperties = {
    fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6,
  }
  const fieldInput: CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'var(--sans)',
    boxSizing: 'border-box',
  }

  return (
    <Modal open={open} onClose={onClose} title={`Registrar real — ${label}`} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Selector de mes */}
        <div>
          <label style={fieldLabel}>Mes</label>
          <select
            value={mesSel}
            onChange={e => handleMesChange(Number(e.target.value))}
            style={{ ...fieldInput, cursor: 'pointer' }}
          >
            {MESES_LARGO.map((mes, i) => (
              <option key={i + 1} value={i + 1}>
                {mes}{reales.find(r => r.mes === i + 1) ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Meta del mes */}
        {metaMes && (
          <div style={{
            padding: '10px 12px', borderRadius: 'var(--radius-sm)',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'var(--mono)',
          }}>
            Meta {MESES_LARGO[mesSel - 1]}: <strong style={{ color: 'var(--text)' }}>{fmtCOP(metaMes.meta)}</strong>
            {metaMes.porcentaje != null && (
              <span style={{ marginLeft: 10, opacity: 0.7 }}>({metaMes.porcentaje}%)</span>
            )}
          </div>
        )}

        {/* Input valor */}
        <div>
          <label style={fieldLabel}>Valor real acumulado en {MESES_LARGO[mesSel - 1]}</label>
          <input
            type="text"
            inputMode="numeric"
            value={inputVal}
            onChange={e => setInputVal(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Ej: 34200000"
            style={{ ...fieldInput, fontFamily: 'var(--mono)', fontSize: '1rem' }}
          />
          {!isNaN(preview) && preview > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                = {fmtCOP(preview)}
              </span>
              {semPrev && (
                <span style={{
                  fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6,
                  background: semPrev.bg, color: semPrev.color, fontWeight: 700,
                }}>
                  {semPrev.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Valor actual si existe */}
        {currentReal && (
          <div style={{
            fontSize: '0.75rem', color: 'var(--muted)', padding: '8px 12px',
            background: 'var(--surface2)', borderRadius: 6,
          }}>
            Valor actual: <strong style={{ color: 'var(--text)' }}>{fmtCOP(currentReal.valor_real)}</strong>
            {currentReal.actualizado_por && <span> — registrado por {currentReal.actualizado_por}</span>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !inputVal} style={{ flex: 2 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── GestionarMetasModal ──────────────────────────────────────────────────────

type FormVals = Record<CategoriaIndicador, string[]>

function GestionarMetasModal({
  open, onClose, anio, existingMetas, onSave,
}: {
  open: boolean
  onClose: () => void
  anio: number
  existingMetas: IndicadorMeta[]
  onSave: (rows: { anio: number; categoria: CategoriaIndicador; mes: number; meta: number; porcentaje?: number | null }[]) => Promise<void>
}) {
  const [tabActiva, setTabActiva] = useState<CategoriaIndicador>('mantenimiento')
  const [formVals, setFormVals]   = useState<FormVals>({
    mantenimiento: Array(12).fill(''),
    calibracion:   Array(12).fill(''),
    codigos_hanna: Array(12).fill(''),
  })
  const [formPct, setFormPct]   = useState<string[]>(Array(12).fill(''))
  const [copyAnio, setCopyAnio] = useState('')
  const [copying, setCopying]   = useState(false)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (!open) return
    const vals: FormVals = {
      mantenimiento: Array(12).fill(''),
      calibracion:   Array(12).fill(''),
      codigos_hanna: Array(12).fill(''),
    }
    const pct: string[] = Array(12).fill('')
    for (const m of existingMetas) {
      vals[m.categoria][m.mes - 1] = String(m.meta)
      if (m.categoria === 'codigos_hanna' && m.porcentaje != null) {
        pct[m.mes - 1] = String(m.porcentaje)
      }
    }
    setFormVals(vals)
    setFormPct(pct)
    setTabActiva('mantenimiento')
    setCopyAnio('')
  }, [open])

  const handleCopiar = async () => {
    const year = parseInt(copyAnio)
    if (!year || year < 2000 || year > 2100) { toast.error('Año inválido'); return }
    setCopying(true)
    try {
      const { data, error } = await supabase
        .from('indicadores_metas').select('*').eq('anio', year).order('mes')
      if (error) throw error
      if (!data?.length) { toast.error(`No hay metas para ${year}`); return }
      const vals: FormVals = {
        mantenimiento: Array(12).fill(''),
        calibracion:   Array(12).fill(''),
        codigos_hanna: Array(12).fill(''),
      }
      const pct: string[] = Array(12).fill('')
      for (const m of data as IndicadorMeta[]) {
        vals[m.categoria][m.mes - 1] = String(m.meta)
        if (m.categoria === 'codigos_hanna' && m.porcentaje != null) {
          pct[m.mes - 1] = String(m.porcentaje)
        }
      }
      setFormVals(vals)
      setFormPct(pct)
      toast.success(`Metas de ${year} cargadas — recuerda guardar`)
    } catch {
      toast.error('Error al cargar metas')
    } finally {
      setCopying(false)
    }
  }

  const setVal = (cat: CategoriaIndicador, i: number, v: string) =>
    setFormVals(prev => ({ ...prev, [cat]: prev[cat].map((x, j) => j === i ? v.replace(/[^0-9]/g, '') : x) }))

  const handleGuardar = async () => {
    const rows: { anio: number; categoria: CategoriaIndicador; mes: number; meta: number; porcentaje?: number | null }[] = []
    for (const cat of CATS) {
      for (let i = 0; i < 12; i++) {
        const meta = parseInt(formVals[cat.key][i])
        if (isNaN(meta) || meta <= 0) {
          toast.error(`Valor inválido: ${cat.label} — ${MESES_LARGO[i]}`)
          setTabActiva(cat.key)
          return
        }
        const porcentaje = cat.key === 'codigos_hanna' ? (parseFloat(formPct[i]) || null) : null
        rows.push({ anio, categoria: cat.key, mes: i + 1, meta, porcentaje })
      }
    }
    setSaving(true)
    try {
      await onSave(rows)
      toast.success('Metas guardadas')
      onClose()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputBase: CSSProperties = {
    width: '100%', padding: '6px 8px', borderRadius: 6,
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text)', fontSize: '0.78rem', fontFamily: 'var(--mono)',
    boxSizing: 'border-box',
  }

  return (
    <Modal open={open} onClose={onClose} title={`Gestionar metas ${anio}`} width={680}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Copiar desde otro año */}
        <div style={{
          padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8,
          border: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            Copiar desde año:
          </span>
          <input
            type="number"
            value={copyAnio}
            onChange={e => setCopyAnio(e.target.value)}
            placeholder="Ej: 2026"
            style={{ ...inputBase, width: 90, flexShrink: 0 }}
          />
          <Button size="sm" variant="ghost" onClick={handleCopiar} disabled={copying || !copyAnio}>
            {copying ? 'Cargando…' : 'Cargar'}
          </Button>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', flex: 1, minWidth: 120 }}>
            Pre-llena los campos — aún debes guardar.
          </span>
        </div>

        {/* Tabs de categoría */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {CATS.map(cat => (
            <button
              key={cat.key}
              onClick={() => setTabActiva(cat.key)}
              style={{
                padding: '8px 14px', border: 'none', background: 'transparent',
                borderBottom: tabActiva === cat.key ? `2.5px solid ${cat.accent}` : '2.5px solid transparent',
                color: tabActiva === cat.key ? cat.accent : 'var(--muted)',
                fontWeight: tabActiva === cat.key ? 700 : 500,
                fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--sans)',
                transition: 'all .12s', marginBottom: -1,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid 4×3 de inputs */}
        {CATS.filter(c => c.key === tabActiva).map(cat => (
          <div key={cat.key} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {MESES_LARGO.map((mes, i) => (
              <div key={i}>
                <div style={{
                  fontSize: '0.63rem', fontFamily: 'var(--mono)', color: 'var(--muted)',
                  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {mes}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formVals[cat.key][i]}
                  onChange={e => setVal(cat.key, i, e.target.value)}
                  placeholder="0"
                  style={{
                    ...inputBase,
                    borderColor: formVals[cat.key][i] ? 'var(--border)' : 'var(--border)',
                  }}
                />
                {cat.key === 'codigos_hanna' && (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formPct[i]}
                    onChange={e => setFormPct(prev => prev.map((x, j) => j === i ? e.target.value.replace(/[^0-9.]/g, '') : x))}
                    placeholder="% ventas"
                    style={{ ...inputBase, marginTop: 4, color: 'var(--muted)', fontSize: '0.72rem' }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Total preview */}
        {(() => {
          const cat = CATS.find(c => c.key === tabActiva)!
          const total = formVals[tabActiva].reduce((s, v) => s + (parseInt(v) || 0), 0)
          return total > 0 ? (
            <div style={{
              textAlign: 'right', fontSize: '0.78rem', fontFamily: 'var(--mono)', color: 'var(--muted)',
            }}>
              Total {cat.label}: <strong style={{ color: cat.accent }}>{fmtCOP(total)}</strong>
            </div>
          ) : null
        })()}

        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={saving} style={{ flex: 2 }}>
            {saving ? 'Guardando…' : 'Guardar todas las metas'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── IndicadoresPage ──────────────────────────────────────────────────────────

export function IndicadoresPage() {
  const anioActual = new Date().getFullYear()
  const mesActual  = new Date().getMonth() + 1
  const [anio, setAnio]           = useState(anioActual)
  const [gestionarOpen, setGestionarOpen] = useState(false)
  const [registrarModal, setRegistrarModal] = useState<{
    cat: typeof CATS[0]
    defaultMes: number
  } | null>(null)

  const { metas, reales, isLoading, registrarReal, guardarMetas } = useIndicadores(anio)

  const metasDe  = (cat: CategoriaIndicador) => metas.filter(m => m.categoria === cat).sort((a, b) => a.mes - b.mes)
  const realesDe = (cat: CategoriaIndicador) => reales.filter(r => r.categoria === cat)

  const navBtn = (onClick: () => void, icon: React.ReactNode) => (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
        color: 'var(--muted)', display: 'flex', alignItems: 'center', borderRadius: 4,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
    >
      {icon}
    </button>
  )

  return (
    <div>
      <Header
        title="Indicadores del Área"
        subtitle="Metas y cumplimiento — Servicio Técnico"
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Navegador de año */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            }}>
              {navBtn(() => setAnio(a => a - 1), <ChevronLeft size={15} />)}
              <span style={{
                fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '0.95rem',
                color: anio === anioActual ? 'var(--accent)' : 'var(--text)',
                minWidth: 42, textAlign: 'center',
              }}>
                {anio}
              </span>
              {navBtn(() => setAnio(a => a + 1), <ChevronRight size={15} />)}
            </div>

            <Button variant="ghost" size="sm" onClick={() => setGestionarOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Settings size={13} />
              Gestionar metas
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Spinner size={32} />
        </div>
      ) : metas.length === 0 ? (
        <Card>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '60px 20px', gap: 14, color: 'var(--muted)', textAlign: 'center',
          }}>
            <BarChart2 size={40} strokeWidth={1.5} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              No hay metas configuradas para <strong>{anio}</strong>
            </p>
            <Button onClick={() => setGestionarOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={14} />
              Configurar metas para {anio}
            </Button>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {CATS.map(cat => (
            <MetaSection
              key={cat.key}
              cat={cat}
              metas={metasDe(cat.key)}
              reales={realesDe(cat.key)}
              mesActual={mesActual}
              onRegistrar={mes => setRegistrarModal({ cat, defaultMes: mes })}
            />
          ))}
        </div>
      )}

      {/* Modal: registrar valor real */}
      {registrarModal && (
        <RegistrarRealModal
          open
          onClose={() => setRegistrarModal(null)}
          label={registrarModal.cat.label}
          metas={metasDe(registrarModal.cat.key)}
          reales={realesDe(registrarModal.cat.key)}
          defaultMes={registrarModal.defaultMes}
          onSave={async (mes, valor_real) =>
            registrarReal.mutateAsync({ categoria: registrarModal.cat.key, mes, valor_real })
          }
        />
      )}

      {/* Modal: gestionar metas */}
      <GestionarMetasModal
        open={gestionarOpen}
        onClose={() => setGestionarOpen(false)}
        anio={anio}
        existingMetas={metas}
        onSave={async rows => guardarMetas.mutateAsync(rows)}
      />
    </div>
  )
}
