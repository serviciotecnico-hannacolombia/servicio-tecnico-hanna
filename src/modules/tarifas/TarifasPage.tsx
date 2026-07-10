import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X, Copy, Check, Package, MapPin, Upload, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../../components/layout/Header'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../hooks/useUser'
import type { TarifaEnvio } from '../../types'

// ─── Constantes ───────────────────────────────────────────────────────────────

type RangoKey = 'tarifa_hasta_2m' | 'tarifa_2m_3m' | 'tarifa_3m_4m' | 'tarifa_4m_5m' | 'tarifa_5m_6m' | 'tarifa_mas_6m'

const RANGOS: { col: RangoKey; label: string; min: number; max: number }[] = [
  { col: 'tarifa_hasta_2m', label: 'Hasta $2M',  min: 0,         max: 2_000_000 },
  { col: 'tarifa_2m_3m',    label: '$2M – $3M',  min: 2_000_000, max: 3_000_000 },
  { col: 'tarifa_3m_4m',    label: '$3M – $4M',  min: 3_000_000, max: 4_000_000 },
  { col: 'tarifa_4m_5m',    label: '$4M – $5M',  min: 4_000_000, max: 5_000_000 },
  { col: 'tarifa_5m_6m',    label: '$5M – $6M',  min: 5_000_000, max: 6_000_000 },
  { col: 'tarifa_mas_6m',   label: 'Más de $6M', min: 6_000_000, max: Infinity  },
]

const fmtCOP = (n: number) =>
  '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === ',' && !inQ) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const vals = parseLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]))
  })
}

type TarifaRow = Omit<TarifaEnvio, 'id' | 'numero'>

function rowFromCSV(r: Record<string, string>): TarifaRow | null {
  const ciudad = (r.ciudad || '').trim().toUpperCase()
  if (!ciudad) return null
  const num = (s: string) => { const n = parseInt((s || '').replace(/\D/g, ''), 10); return isNaN(n) ? null : n }
  return {
    ciudad,
    departamento: (r.departamento || '').trim().toUpperCase(),
    promesa:      (r.promesa || '').trim() || null,
    tarifa_hasta_2m: num(r.tarifa_hasta_2m || r['hasta $2m'] || ''),
    tarifa_2m_3m:    num(r.tarifa_2m_3m    || r['$2m–$3m']   || r['$2m-$3m']  || ''),
    tarifa_3m_4m:    num(r.tarifa_3m_4m    || r['$3m–$4m']   || r['$3m-$4m']  || ''),
    tarifa_4m_5m:    num(r.tarifa_4m_5m    || r['$4m–$5m']   || r['$4m-$5m']  || ''),
    tarifa_5m_6m:    num(r.tarifa_5m_6m    || r['$5m–$6m']   || r['$5m-$6m']  || ''),
    tarifa_mas_6m:   num(r.tarifa_mas_6m   || r['más $6m']   || r['mas $6m']  || ''),
  }
}

// ─── Hook de datos ────────────────────────────────────────────────────────────

function useTarifas() {
  return useQuery<TarifaEnvio[]>({
    queryKey: ['tarifas-envio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarifas_envio')
        .select('*')
        .order('ciudad')
      if (error) throw error
      return data as TarifaEnvio[]
    },
    staleTime: 30 * 60 * 1000,
  })
}

// ─── CopyBtn ──────────────────────────────────────────────────────────────────

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setDone(true)
          toast.success(`${label} copiado`)
          setTimeout(() => setDone(false), 2000)
        })
      }}
      style={{
        display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 4,
        padding: '10px 20px', borderRadius: 10, border: 'none',
        background: done ? '#003d7a' : 'var(--accent)',
        color: '#fff', fontFamily: 'var(--sans)',
        fontSize: '0.82rem', fontWeight: 600,
        cursor: 'pointer', transition: 'all .18s', flexShrink: 0, minWidth: 100,
      }}
    >
      {done ? <Check size={16} /> : <Copy size={16} />}
      <span>{done ? '¡Copiado!' : 'Copiar'}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', opacity: 0.75, fontWeight: 400 }}>
        {value}
      </span>
    </button>
  )
}

// ─── TarifasPage ──────────────────────────────────────────────────────────────

export function TarifasPage() {
  const { data: tarifas = [], isLoading } = useTarifas()
  const { hasCapability } = useUser()
  const canImportar = hasCapability('importar_csv_tarifas')
  const qc = useQueryClient()

  // ── Import state ──
  const [showImport, setShowImport]   = useState(false)
  const [csvRows, setCsvRows]         = useState<TarifaRow[] | null>(null)
  const [csvError, setCsvError]       = useState('')
  const [importMode, setImportMode]   = useState<'upsert' | 'replace'>('upsert')
  const [importing, setImporting]     = useState(false)
  const [importMsg, setImportMsg]     = useState('')

  const handleFile = (file: File) => {
    setCsvError(''); setCsvRows(null); setImportMsg('')
    const reader = new FileReader()
    reader.onload = e => {
      const raw = parseCSV(e.target?.result as string)
      if (!raw.length) { setCsvError('Archivo vacío o sin formato reconocible.'); return }
      if (!('ciudad' in raw[0])) { setCsvError('No se encontró la columna "ciudad". Revisa el encabezado.'); return }
      const rows = raw.map(rowFromCSV).filter(Boolean) as TarifaRow[]
      if (!rows.length) { setCsvError('No se encontraron filas válidas.'); return }
      setCsvRows(rows)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const runImport = async () => {
    if (!csvRows?.length) return
    setImporting(true)
    try {
      if (importMode === 'replace') {
        setImportMsg('Eliminando registros existentes…')
        const { error } = await supabase.from('tarifas_envio').delete().not('ciudad', 'is', null)
        if (error) throw error
      }
      const BATCH = 500
      for (let i = 0; i < csvRows.length; i += BATCH) {
        const { error } = await supabase
          .from('tarifas_envio')
          .upsert(csvRows.slice(i, i + BATCH), { onConflict: 'ciudad,departamento' })
        if (error) throw error
        setImportMsg(`Importando… ${Math.min(i + BATCH, csvRows.length)} / ${csvRows.length}`)
      }
      await qc.invalidateQueries({ queryKey: ['tarifas-envio'] })
      toast.success(`${csvRows.length} ciudades importadas correctamente`)
      setShowImport(false); setCsvRows(null); setImportMsg('')
    } catch {
      toast.error('Error durante la importación')
    } finally {
      setImporting(false)
    }
  }

  const closeImport = () => { if (!importing) { setShowImport(false); setCsvRows(null); setCsvError(''); setImportMsg('') } }

  // ── Búsqueda state ──
  const [ciudadQuery, setCiudadQuery]   = useState('')
  const [ciudadSel, setCiudadSel]       = useState<TarifaEnvio | null>(null)
  const [montoRaw, setMontoRaw]         = useState('')
  const [montoDisplay, setMontoDisplay] = useState('')
  const [openSugg, setOpenSugg]         = useState(false)
  const [focusedIdx, setFocusedIdx]     = useState(-1)
  const [copyResumen, setCopyResumen]   = useState(false)

  const wrapRef  = useRef<HTMLDivElement>(null)
  const montoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenSugg(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sugerencias: prioriza las que empiezan con el query
  const suggestions = ciudadQuery.trim().length >= 1
    ? tarifas
        .filter(t => t.ciudad.toLowerCase().includes(ciudadQuery.toLowerCase()))
        .sort((a, b) => {
          const q = ciudadQuery.toLowerCase()
          const aS = a.ciudad.toLowerCase().startsWith(q) ? 0 : 1
          const bS = b.ciudad.toLowerCase().startsWith(q) ? 0 : 1
          return aS - bS || a.ciudad.localeCompare(b.ciudad)
        })
        .slice(0, 12)
    : []

  const selectCiudad = (t: TarifaEnvio) => {
    setCiudadSel(t)
    setCiudadQuery(t.ciudad)
    setOpenSugg(false)
    setFocusedIdx(-1)
    setTimeout(() => montoRef.current?.focus(), 50)
  }

  const clearCiudad = () => {
    setCiudadQuery(''); setCiudadSel(null); setOpenSugg(false); setFocusedIdx(-1)
  }

  const handleCiudadChange = (v: string) => {
    setCiudadQuery(v); setCiudadSel(null); setFocusedIdx(-1)
    setOpenSugg(v.trim().length >= 1)
  }

  const handleCiudadKey = (e: React.KeyboardEvent) => {
    if (!openSugg || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && focusedIdx >= 0) selectCiudad(suggestions[focusedIdx])
    else if (e.key === 'Escape') setOpenSugg(false)
  }

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    setMontoRaw(digits)
    setMontoDisplay(digits ? Number(digits).toLocaleString('es-CO') : '')
  }

  const monto        = parseInt(montoRaw || '0', 10)
  const rangoActivo  = monto > 0 ? RANGOS.find(r => monto >= r.min && monto < r.max) : null
  const tarifaActiva = ciudadSel && rangoActivo ? ciudadSel[rangoActivo.col] : null

  const copiarResumen = () => {
    if (!ciudadSel) return
    const envioStr = tarifaActiva != null ? fmtCOP(tarifaActiva) : '—'
    const montoStr = monto > 0 ? fmtCOP(monto) : '—'
    const texto = [
      '📦 Resumen de Envío — Hanna Instruments',
      `Ciudad: ${ciudadSel.ciudad}${ciudadSel.departamento ? ' (' + ciudadSel.departamento + ')' : ''}`,
      `Promesa de entrega: ${ciudadSel.promesa || '—'}`,
      `Valor pedido: ${montoStr}`,
      `Costo envío: ${envioStr}`,
    ].join('\n')
    navigator.clipboard.writeText(texto).then(() => {
      setCopyResumen(true)
      toast.success('Resumen copiado')
      setTimeout(() => setCopyResumen(false), 2500)
    })
  }

  const highlight = (text: string, q: string) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return <>{text}</>
    return (
      <>
        {text.slice(0, idx)}
        <strong style={{ color: 'var(--accent)' }}>{text.slice(idx, idx + q.length)}</strong>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div>
      <Header
        title="Tarifas de Envío"
        subtitle={tarifas.length > 0 ? `${tarifas.length} ciudades disponibles` : 'Cargando…'}
        actions={canImportar ? (
          <Button variant="ghost" size="sm" onClick={() => setShowImport(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={13} /> Importar CSV
          </Button>
        ) : undefined}
      />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Spinner size={32} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>

          {/* ── Card búsqueda ── */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)',
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: '0.68rem', textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 18,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              Datos del envío
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Ciudad con autocomplete */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Ciudad destino
              </label>
              <div ref={wrapRef} style={{ position: 'relative' }}>
                <Search size={15} style={{
                  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--muted)', pointerEvents: 'none',
                }} />
                <input
                  value={ciudadQuery}
                  onChange={e => handleCiudadChange(e.target.value)}
                  onKeyDown={handleCiudadKey}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; if (ciudadQuery.trim().length >= 1 && !ciudadSel) setOpenSugg(true) }}
                  placeholder="Ej: Medellín, Cali, Barranquilla…"
                  autoComplete="off"
                  style={{
                    width: '100%', padding: '11px 36px 11px 40px', boxSizing: 'border-box',
                    border: `1.5px solid ${ciudadSel ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, background: 'var(--surface2)', color: 'var(--text)',
                    fontSize: '0.95rem', fontFamily: 'var(--sans)',
                    outline: 'none', transition: 'border-color .15s',
                  }}
                  onBlur={e => { if (!ciudadSel) e.currentTarget.style.borderColor = 'var(--border)' }}
                />
                {ciudadQuery && (
                  <button onClick={clearCiudad} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', display: 'flex', padding: 4,
                  }}>
                    <X size={14} />
                  </button>
                )}

                {/* Dropdown */}
                {openSugg && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                    background: 'var(--surface)', border: '1.5px solid var(--border)',
                    borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,.14)',
                    overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
                  }}>
                    {suggestions.map((t, i) => (
                      <div
                        key={t.id}
                        onMouseDown={() => selectCiudad(t)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                          borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                          background: i === focusedIdx ? 'var(--surface2)' : 'transparent',
                          transition: 'background .1s',
                        }}
                        onMouseEnter={() => setFocusedIdx(i)}
                        onMouseLeave={() => setFocusedIdx(-1)}
                      >
                        <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                          {highlight(t.ciudad, ciudadQuery)}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                          {t.departamento}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Departamento + Monto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Departamento
                </label>
                <input
                  readOnly
                  value={ciudadSel?.departamento ?? ''}
                  placeholder="Auto"
                  style={{
                    width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                    border: '1.5px solid var(--border)', borderRadius: 10,
                    background: 'var(--surface2)', color: ciudadSel ? 'var(--text)' : 'var(--muted)',
                    fontSize: '0.875rem', fontFamily: 'var(--sans)', cursor: 'default', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Valor del pedido
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.9rem', pointerEvents: 'none',
                  }}>$</span>
                  <input
                    ref={montoRef}
                    value={montoDisplay}
                    onChange={handleMontoChange}
                    placeholder="0"
                    inputMode="numeric"
                    autoComplete="off"
                    style={{
                      width: '100%', padding: '11px 14px 11px 24px', boxSizing: 'border-box',
                      border: '1.5px solid var(--border)', borderRadius: 10,
                      background: 'var(--surface2)', color: 'var(--text)',
                      fontSize: '0.95rem', fontFamily: 'var(--mono)', letterSpacing: '0.5px',
                      outline: 'none', transition: 'border-color .15s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Sin resultado ── */}
          {ciudadSel === null && ciudadQuery.trim() && !openSugg && (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)' }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 10 }}>📭</span>
              <p style={{ fontSize: '0.875rem' }}>
                No se encontró tarifa para <strong style={{ color: 'var(--text)' }}>"{ciudadQuery}"</strong>.
                <br />Verifica el nombre o consulta con el área logística.
              </p>
            </div>
          )}

          {/* ── Resultado ── */}
          {ciudadSel && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)',
            }}>
              {/* Header azul */}
              <div style={{
                background: 'var(--accent)', padding: '18px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--sans)' }}>
                    {ciudadSel.ciudad}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,.75)', fontFamily: 'var(--mono)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {ciudadSel.departamento}
                  </div>
                </div>
                {ciudadSel.promesa && (
                  <div style={{
                    background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)',
                    borderRadius: 20, padding: '5px 14px', fontSize: '0.78rem', color: '#fff',
                    fontFamily: 'var(--mono)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <Package size={12} />
                    {ciudadSel.promesa}
                  </div>
                )}
              </div>

              <div style={{ padding: '20px 24px' }}>
                {/* Tarifa activa */}
                {tarifaActiva != null ? (
                  <div style={{
                    background: 'var(--accent-bg, #eaf1fb)', border: '1.5px solid #b8d0ee',
                    borderRadius: 12, padding: '20px 24px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 500, marginBottom: 6 }}>
                        Tarifa para {rangoActivo?.label}
                      </div>
                      <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                        <sup style={{ fontSize: '1.1rem', fontWeight: 400 }}>$</sup>
                        {tarifaActiva.toLocaleString('es-CO')}
                      </div>
                    </div>
                    <CopyBtn value={String(tarifaActiva)} label="Tarifa" />
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--surface2)', border: '1px dashed var(--border)',
                    borderRadius: 12, padding: '18px 24px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted)',
                  }}>
                    <MapPin size={18} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem' }}>
                      Ingresa el valor del pedido para ver la tarifa aplicable.
                    </span>
                  </div>
                )}

                {/* Tabla de rangos */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: '0.68rem', fontFamily: 'var(--mono)', textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10,
                  }}>
                    Tabla completa de tarifas
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        {['Rango', 'Tarifa', ''].map((h, i) => (
                          <th key={i} style={{
                            textAlign: 'left', padding: '8px 12px',
                            background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
                            fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)',
                            textTransform: 'uppercase', letterSpacing: '0.07em',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RANGOS.map((r, i) => {
                        const val     = ciudadSel[r.col]
                        const esActivo = rangoActivo?.col === r.col && monto > 0
                        return (
                          <tr key={r.col} style={{ background: esActivo ? 'var(--accent-bg, #eaf1fb)' : 'transparent' }}>
                            <td style={{
                              padding: '10px 12px',
                              borderBottom: i < RANGOS.length - 1 ? '1px solid var(--border)' : 'none',
                              fontWeight: esActivo ? 600 : 400,
                              color: esActivo ? 'var(--accent)' : 'var(--text)',
                            }}>{r.label}</td>
                            <td style={{
                              padding: '10px 12px',
                              borderBottom: i < RANGOS.length - 1 ? '1px solid var(--border)' : 'none',
                              fontFamily: 'var(--mono)', fontSize: '0.85rem',
                              fontWeight: esActivo ? 700 : 400,
                              color: esActivo ? 'var(--accent)' : 'var(--text)',
                            }}>
                              {val != null ? fmtCOP(val) : '—'}
                            </td>
                            <td style={{
                              padding: '10px 12px',
                              borderBottom: i < RANGOS.length - 1 ? '1px solid var(--border)' : 'none',
                              color: 'var(--accent)', fontWeight: 700, width: 32, textAlign: 'center',
                            }}>
                              {esActivo ? '✓' : ''}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Copiar resumen */}
                <button
                  onClick={copiarResumen}
                  disabled={!monto}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: 11, borderRadius: 10,
                    border: `1.5px ${copyResumen ? 'solid' : 'dashed'} ${copyResumen ? 'var(--accent)' : 'var(--border)'}`,
                    background: copyResumen ? 'var(--accent-bg, #eaf1fb)' : 'none',
                    color: copyResumen ? 'var(--accent)' : 'var(--muted)',
                    fontFamily: 'var(--sans)', fontSize: '0.82rem', fontWeight: 500,
                    cursor: monto ? 'pointer' : 'not-allowed',
                    opacity: monto ? 1 : 0.5, transition: 'all .18s',
                  }}
                >
                  {copyResumen ? <Check size={14} /> : '📋'}
                  {copyResumen ? 'Resumen copiado' : 'Copiar resumen completo'}
                </button>
              </div>
            </div>
          )}

          {/* Estado inicial */}
          {!ciudadSel && !ciudadQuery && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
              <Package size={40} strokeWidth={1.2} style={{ marginBottom: 14, opacity: 0.35 }} />
              <p style={{ fontSize: '0.875rem' }}>Busca una ciudad para consultar las tarifas de envío.</p>
            </div>
          )}

        </div>
      )}

      {/* ── Modal importar CSV ── */}
      <Modal open={showImport} onClose={closeImport} title="Importar CSV — Tarifas de Envío" width={600}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Formato esperado */}
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
            <p style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Formato esperado del CSV
            </p>
            <pre style={{ fontSize: '0.7rem', fontFamily: 'var(--mono)', color: 'var(--text)', margin: 0, overflowX: 'auto' }}>
{`ciudad,departamento,promesa,tarifa_hasta_2m,tarifa_2m_3m,tarifa_3m_4m,tarifa_4m_5m,tarifa_5m_6m,tarifa_mas_6m
BOGOTÁ,BOGOTÁ D.C.,1-2 DÍAS HÁBILES,25000,31875,40641,51817,66066,84235
MEDELLÍN,ANTIOQUIA,2-3 DÍAS HÁBILES,18000,22950,29272,37321,47584,60645`}
            </pre>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>
              • La columna <code>ciudad</code> es la clave de upsert — debe coincidir exactamente (mayúsculas).<br />
              • <code>promesa</code> y valores de tarifa pueden quedar vacíos.<br />
              • Archivo en UTF-8. Exporta desde Excel como <em>CSV UTF-8 (delimitado por comas)</em>.
            </p>
          </div>

          {/* File input */}
          <div>
            <label style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
              Archivo CSV
            </label>
            <input
              type="file" accept=".csv,text/csv" disabled={importing}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              style={{ fontSize: '0.875rem', color: 'var(--text)' }}
            />
            {csvError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: '#dc2626', fontSize: '0.8rem' }}>
                <AlertTriangle size={14} /> {csvError}
              </div>
            )}
          </div>

          {/* Preview */}
          {csvRows && (
            <div>
              <p style={{ fontSize: '0.78rem', fontFamily: 'var(--mono)', color: 'var(--muted)', marginBottom: 8 }}>
                {csvRows.length} filas detectadas — primeras 3:
              </p>
              <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: 10, overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '0.7rem', fontFamily: 'var(--mono)', width: '100%' }}>
                  <thead>
                    <tr>
                      {['Ciudad', 'Dpto', 'Promesa', 'Hasta $2M', '$2M-$3M', '$3M-$4M', '$4M-$5M', '$5M-$6M', '+$6M'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 3).map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '4px 8px', color: 'var(--accent)', fontWeight: 600 }}>{r.ciudad}</td>
                        <td style={{ padding: '4px 8px' }}>{r.departamento}</td>
                        <td style={{ padding: '4px 8px' }}>{r.promesa || '—'}</td>
                        {(['tarifa_hasta_2m','tarifa_2m_3m','tarifa_3m_4m','tarifa_4m_5m','tarifa_5m_6m','tarifa_mas_6m'] as const).map(col => (
                          <td key={col} style={{ padding: '4px 8px' }}>
                            {r[col] != null ? fmtCOP(r[col] as number) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modo */}
          {csvRows && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
                Modo de importación
              </label>
              {([
                ['upsert',  'Actualizar / Agregar',  'Actualiza las ciudades existentes y agrega las nuevas. No elimina nada.'],
                ['replace', 'Reemplazar todo',        'Elimina TODAS las ciudades actuales y las sustituye por las del CSV.'],
              ] as const).map(([val, lbl, desc]) => (
                <label key={val} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                  padding: '10px 12px', borderRadius: 8,
                  border: `1.5px solid ${importMode === val ? 'var(--accent)' : 'var(--border)'}`,
                  background: importMode === val ? 'var(--accent-bg, #eaf1fb)' : 'var(--surface2)',
                }}>
                  <input type="radio" name="tarifaImportMode" value={val} checked={importMode === val} onChange={() => setImportMode(val)} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{lbl}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {importMode === 'replace' && csvRows && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', fontSize: '0.78rem' }}>
              <AlertTriangle size={14} /> Esta acción eliminará permanentemente todas las tarifas actuales antes de importar.
            </div>
          )}

          {importMsg && (
            <p style={{ fontSize: '0.8rem', fontFamily: 'var(--mono)', color: 'var(--accent)', margin: 0 }}>{importMsg}</p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={closeImport} disabled={importing}>Cancelar</Button>
            <Button onClick={runImport} disabled={!csvRows || importing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {importing
                ? <><Spinner size={14} /> {importMsg || 'Importando…'}</>
                : <><Upload size={13} /> Importar {csvRows ? `(${csvRows.length})` : ''}</>}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
