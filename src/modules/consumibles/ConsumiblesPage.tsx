import { useState, useRef, forwardRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Package } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { useUser } from '../../hooks/useUser'
import type { ConsumibleLlegada, ConsumibleDestape } from '../../types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedQR {
  ref: string
  lote: string
  venc: string
  nombre: string
  vol: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const UBICACIONES = ['Control de Calidad', 'Servicio Técnico']

// ── QR Parser (formato Ñ de Hanna Instruments) ────────────────────────────────

function parseQR(raw: string): ParsedQR | null {
  if (!raw.includes('Ñ') && !raw.includes('ñ')) return null
  const partes = raw.split(/[Ññ]/)
  if (partes.length < 4) return null
  const ref      = partes[0].trim()
    .replace(/'(\d+)$/, (_, n) => '-' + n.padStart(2, '0'))  // HI9828'25 → HI9828-25
    .replace(/-([A-Z])$/, '/$1')                              // HI76409A-P → HI76409A/P
  const lote     = partes[1].trim()
  const hasVenc  = partes.length >= 5
  const venc     = hasVenc ? partes[3].trim().replace(/-/g, '/') : ''
  const desc     = hasVenc ? partes.slice(4).join('Ñ').trim() : partes[3].trim()
  let nombre = desc
  let vol    = ''
  const volRx = /[''?]\s*(?:vol\.?\s*)?(\d[\d.,]*\s*(?:mL|ML|ml|L\b|l\b|G\b|g\b)\.?)/i
  const vm    = desc.match(volRx)
  if (vm) {
    nombre = desc.slice(0, desc.indexOf(vm[0])).trim()
    vol    = vm[1].trim().replace(/\.$/, '').replace(/\s+/g, ' ').replace(/ml/i, 'mL')
  }
  nombre = nombre.toLowerCase().replace(/\b([a-záéíóúüñ])/gi, c => c.toUpperCase())
  return { ref, lote, venc, nombre, vol }
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// ── Supabase queries ───────────────────────────────────────────────────────────

function useLlegadas() {
  return useQuery({
    queryKey: ['consumibles_llegada'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consumibles_llegada').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as ConsumibleLlegada[]
    },
  })
}

function useDestapes() {
  return useQuery({
    queryKey: ['consumibles_destape'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consumibles_destape').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as ConsumibleDestape[]
    },
  })
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Tab = 'ingreso' | 'destape' | 'inventario' | 'buscar'

export function ConsumiblesPage() {
  const [tab, setTab] = useState<Tab>('ingreso')
  const { data: llegadas = [] } = useLlegadas()
  const { data: destapes = [] } = useDestapes()

  return (
    <div>
      <Header title="Consumibles" subtitle="Control de llegadas y destapes de soluciones técnicas" />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
        {([
          ['ingreso',    '📥', 'Ingreso'],
          ['destape',    '🔓', 'Destape'],
          ['inventario', '📦', 'Inventario'],
          ['buscar',     '🔍', 'Buscar'],
        ] as [Tab, string, string][]).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 9, cursor: 'pointer',
            fontSize: 13, fontWeight: tab === id ? 600 : 500, fontFamily: 'var(--sans)',
            background: tab === id ? 'var(--accent)' : 'transparent',
            color: tab === id ? '#fff' : 'var(--muted)', transition: 'all .18s',
          }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === 'ingreso'    && <TabIngreso    llegadas={llegadas} />}
      {tab === 'destape'    && <TabDestape    llegadas={llegadas} destapes={destapes} />}
      {tab === 'inventario' && <TabInventario llegadas={llegadas} destapes={destapes} />}
      {tab === 'buscar'     && <TabBuscar     llegadas={llegadas} destapes={destapes} />}
    </div>
  )
}

// ── Tab Ingreso ────────────────────────────────────────────────────────────────

function TabIngreso({ llegadas }: { llegadas: ConsumibleLlegada[] }) {
  const qc              = useQueryClient()
  const qrRef           = useRef<HTMLInputElement>(null)
  const { displayName } = useUser()

  const [qr,         setQr]         = useState('')
  const [nombre,     setNombre]     = useState('')
  const [ref,        setRef]        = useState('')
  const [lote,       setLote]       = useState('')
  const [venc,       setVenc]       = useState('')
  const [vol,        setVol]        = useState('')
  const [ubicacion,  setUbicacion]  = useState(() => localStorage.getItem('consumibles_ubicacion') ?? '')
  const [obs,        setObs]        = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [saving,     setSaving]     = useState(false)

  function handleQR(val: string) {
    setQr(val)
    const parsed = parseQR(val)
    if (parsed) {
      setNombre(parsed.nombre); setRef(parsed.ref); setLote(parsed.lote)
      setVenc(parsed.venc); setVol(parsed.vol); setAutoFilled(true)
      return
    }
    const up = val.trim().toUpperCase()
    if (up.length >= 3) {
      const prev = llegadas.find(r =>
        (r.ref || '').toUpperCase() === up || (r.lote || '').toUpperCase() === up
      )
      if (prev) {
        setNombre(prev.nombre || ''); setRef(prev.ref || ''); setLote(prev.lote || '')
        setVenc(prev.venc || ''); setAutoFilled(true)
        return
      }
    }
    if (autoFilled) {
      setNombre(''); setRef(''); setLote(''); setVenc(''); setVol(''); setAutoFilled(false)
    }
  }

  async function submit() {
    if (!qr.trim()) { toast.error('Ingresa el código QR'); return }
    if (!ubicacion) { toast.error('Selecciona una ubicación'); return }
    setSaving(true)
    const { error } = await supabase.from('consumibles_llegada').insert({
      fecha: todayStr(), qr: qr.trim(),
      nombre: nombre.trim() || null, ref: ref.trim() || null,
      lote: lote.trim() || null, venc: venc.trim() || null,
      vol: vol.trim() || null,
      responsable: displayName, ubicacion, obs: obs.trim() || null,
    })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Llegada registrada')
    qc.invalidateQueries({ queryKey: ['consumibles_llegada'] })
    clear()
  }

  function clear() {
    setQr(''); setNombre(''); setRef(''); setLote(''); setVenc(''); setVol('')
    setObs(''); setAutoFilled(false)
    qrRef.current?.focus()
  }

  return (
    <Card>
      <SecTitle>Registrar llegada</SecTitle>
      <FG label="Código QR / Referencia" hint="Escanea el QR del envase para rellenar los campos automáticamente">
        <QRInput ref={qrRef} value={qr} onChange={handleQR} />
      </FG>

      {autoFilled && (
        <div style={PREVIEW}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>{nombre || ref}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
            {ref  && <span>REF: <strong style={{ color: 'var(--text)' }}>{ref}</strong></span>}
            {lote && <span>LOTE: <strong style={{ color: 'var(--text)' }}>{lote}</strong></span>}
            {venc && <span>VENCE: <strong style={{ color: 'var(--text)' }}>{venc}</strong></span>}
            {vol  && <span>VOL: <strong style={{ color: 'var(--text)' }}>{vol}</strong></span>}
          </div>
        </div>
      )}

      <div style={G2}>
        <FG label="Nombre (AUTO)">
          <input value={nombre} onChange={e => setNombre(e.target.value)} readOnly={autoFilled} placeholder="Auto desde QR" style={iS(autoFilled)} />
        </FG>
        <FG label="Referencia (AUTO)">
          <input value={ref} onChange={e => setRef(e.target.value)} readOnly={autoFilled} placeholder="Auto desde QR" style={iS(autoFilled)} />
        </FG>
        <FG label="Lote (AUTO)">
          <input value={lote} onChange={e => setLote(e.target.value)} readOnly={autoFilled} placeholder="Auto desde QR" style={iS(autoFilled)} />
        </FG>
        <FG label="F. Vencimiento (AUTO)">
          <input value={venc} onChange={e => setVenc(e.target.value)} readOnly={autoFilled} placeholder="Auto desde QR" style={iS(autoFilled)} />
        </FG>
        <FG label="Volumen (AUTO)">
          <input value={vol} onChange={e => setVol(e.target.value)} readOnly={autoFilled} placeholder="Auto desde QR" style={iS(autoFilled && !!vol)} />
        </FG>
        <FG label="Responsable">
          <input value={displayName} readOnly style={iS(true)} />
        </FG>
        <FG label="Ubicación">
          <Select value={ubicacion} onChange={v => { setUbicacion(v); localStorage.setItem('consumibles_ubicacion', v) }} options={UBICACIONES} placeholder="Seleccionar..." />
        </FG>
        <FG label="Fecha de registro">
          <input value={todayStr()} readOnly style={iS(false)} />
        </FG>
        <FG label="Observaciones" full>
          <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional..." rows={2} style={{ ...INP, resize: 'vertical' }} />
        </FG>
      </div>

      <Actions>
        <button onClick={clear} style={GHOST}>↺ Limpiar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Registrar llegada'}</button>
      </Actions>
    </Card>
  )
}

// ── Tab Destape ────────────────────────────────────────────────────────────────

function TabDestape({ llegadas, destapes }: { llegadas: ConsumibleLlegada[], destapes: ConsumibleDestape[] }) {
  const qc              = useQueryClient()
  const qrRef           = useRef<HTMLInputElement>(null)
  const { displayName } = useUser()

  const [qr,           setQr]           = useState('')
  const [linked,       setLinked]       = useState<ConsumibleLlegada | null>(null)
  const [matches,      setMatches]      = useState<ConsumibleLlegada[]>([])
  const [manualRef,    setManualRef]    = useState('')
  const [manualNombre, setManualNombre] = useState('')
  const [manualLote,   setManualLote]   = useState('')
  const [fecha,        setFecha]        = useState(todayStr())
  const [ubicacion,    setUbicacion]    = useState(() => localStorage.getItem('consumibles_destape_ubicacion') ?? '')
  const [obs,          setObs]          = useState('')
  const [saving,       setSaving]       = useState(false)

  const destapedIds = new Set(destapes.map(d => d.llegada_id).filter(Boolean))

  function handleQR(val: string) {
    setQr(val)
    setLinked(null); setMatches([]); setManualRef(''); setManualNombre(''); setManualLote('')
    const parsed = parseQR(val)
    const searchKey = (parsed?.ref || val.trim()).toUpperCase()
    if (searchKey.length < 2) return
    const found = llegadas.filter(l =>
      ((l.ref || '').toUpperCase() === searchKey ||
       (l.lote || '').toUpperCase() === searchKey) &&
      !destapedIds.has(l.id)
    )
    if (found.length === 1) {
      setLinked(found[0])
    } else if (found.length > 1) {
      setMatches(found)
    } else if (parsed) {
      setManualRef(parsed.ref); setManualNombre(parsed.nombre); setManualLote(parsed.lote)
    }
  }

  async function submit() {
    if (!qr.trim()) { toast.error('Ingresa el código QR del envase'); return }
    if (!fecha)     { toast.error('Selecciona la fecha de destape'); return }
    if (!ubicacion) { toast.error('Selecciona la ubicación'); return }
    setSaving(true)
    const { error } = await supabase.from('consumibles_destape').insert({
      fecha, qr: qr.trim(),
      llegada_id: linked?.id ?? null,
      ref:    linked?.ref    ?? manualRef    ?? null,
      nombre: linked?.nombre ?? manualNombre ?? null,
      lote:   linked?.lote   ?? manualLote   ?? null,
      responsable: displayName, ubicacion, obs: obs.trim() || null,
    })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Destape registrado')
    qc.invalidateQueries({ queryKey: ['consumibles_destape'] })
    clear()
  }

  function clear() {
    setQr(''); setLinked(null); setMatches([]); setManualRef(''); setManualNombre(''); setManualLote('')
    setFecha(todayStr()); setObs('')
    qrRef.current?.focus()
  }

  const hasQR    = qr.trim().length > 2
  const dispNombre = linked?.nombre || manualNombre || '—'
  const dispRef    = linked?.ref    || manualRef    || '—'
  const dispLote   = linked?.lote   || manualLote   || '—'

  return (
    <Card>
      <SecTitle>Registrar destape</SecTitle>
      <FG label="Código QR del envase" hint="Escanea el QR del frasco que vas a destapar">
        <QRInput ref={qrRef} value={qr} onChange={handleQR} />
      </FG>

      {matches.length > 1 && (
        <div style={{ ...PREVIEW, borderColor: 'rgba(124,58,237,.3)', background: 'rgba(124,58,237,.04)', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)', color: 'var(--purple)', marginBottom: 10 }}>
            {matches.length} unidades en stock — selecciona cuál destapar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {matches.map(m => (
              <button
                key={m.id}
                onClick={() => { setLinked(m); setMatches([]) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  border: '1.5px solid rgba(124,58,237,.25)', borderRadius: 8,
                  background: 'var(--surface)', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'var(--sans)', transition: 'all .12s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--purple)'; el.style.background = 'var(--purple-bg)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(124,58,237,.25)'; el.style.background = 'var(--surface)' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.nombre || m.ref}</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 2 }}>
                    Llegó: {m.fecha} · Lote: {m.lote || '—'}{m.venc ? ` · Vence: ${m.venc}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--purple)', fontWeight: 700 }}>Seleccionar →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasQR && !matches.length && (
        <div style={{
          ...PREVIEW,
          borderColor: linked ? 'rgba(0,94,184,.3)' : 'rgba(224,123,0,.3)',
          background:  linked ? 'rgba(0,94,184,.05)' : 'rgba(224,123,0,.04)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)', color: linked ? 'var(--accent)' : '#e07b00', marginBottom: 6 }}>
            {linked ? '✓ Llegada vinculada' : '⚠ Sin llegada previa — se registrará sin vinculación'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{dispNombre}</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
            <span>REF: <strong style={{ color: 'var(--text)' }}>{dispRef}</strong></span>
            <span>LOTE: <strong style={{ color: 'var(--text)' }}>{dispLote}</strong></span>
            {linked?.fecha && <span>Llegó: <strong style={{ color: 'var(--text)' }}>{linked.fecha}</strong></span>}
            {linked?.venc  && <span>Vence: <strong style={{ color: 'var(--text)' }}>{linked.venc}</strong></span>}
            {linked?.vol   && <span>Vol: <strong style={{ color: 'var(--text)' }}>{linked.vol}</strong></span>}
          </div>
        </div>
      )}

      <div style={G2}>
        <FG label="Fecha de destape">
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={INP} />
        </FG>
        <FG label="Responsable">
          <input value={displayName} readOnly style={iS(true)} />
        </FG>
        <FG label="Ubicación donde se almacena abierto">
          <Select value={ubicacion} onChange={v => { setUbicacion(v); localStorage.setItem('consumibles_destape_ubicacion', v) }} options={UBICACIONES} placeholder="Seleccionar..." />
        </FG>
        <FG label="Observaciones" full>
          <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional..." rows={2} style={{ ...INP, resize: 'vertical' }} />
        </FG>
      </div>

      <Actions>
        <button onClick={clear} style={GHOST}>↺ Limpiar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '🔓 Registrar destape'}</button>
      </Actions>
    </Card>
  )
}

// ── Tab Inventario ─────────────────────────────────────────────────────────────

function TabInventario({ llegadas, destapes }: { llegadas: ConsumibleLlegada[], destapes: ConsumibleDestape[] }) {
  const [search,   setSearch]   = useState('')
  const [statusF,  setStatusF]  = useState<'all' | 'stock' | 'destapado'>('all')
  const [ubicF,    setUbicF]    = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const destapedMap = new Map(
    destapes.filter(d => d.llegada_id).map(d => [d.llegada_id!, d])
  )

  const rows = llegadas.map(l => ({
    ...l, destapado: destapedMap.has(l.id), destape: destapedMap.get(l.id),
  })).filter(r => {
    const q   = search.toLowerCase()
    const ok  = !q || [r.nombre, r.ref, r.lote, r.responsable, r.ubicacion].some(f => f?.toLowerCase().includes(q))
    const okS = statusF === 'all' || (statusF === 'stock' ? !r.destapado : r.destapado)
    const okU = !ubicF || r.ubicacion === ubicF
    const okF = (!dateFrom || (r.fecha ?? '') >= dateFrom) && (!dateTo || (r.fecha ?? '') <= dateTo)
    return ok && okS && okU && okF
  })

  const mes       = new Date().toISOString().slice(0, 7)
  const enStock   = llegadas.filter(l => !destapedMap.has(l.id)).length
  const destapados = llegadas.filter(l => destapedMap.has(l.id)).length
  const esteMes   = llegadas.filter(l => l.fecha?.startsWith(mes)).length

  function clearFilters() {
    setSearch(''); setStatusF('all'); setUbicF(''); setDateFrom(''); setDateTo('')
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {([
          ['Total llegadas', llegadas.length, 'var(--accent)'],
          ['En stock',       enStock,         '#2e9e4e'],
          ['Destapados',     destapados,      '#e07b00'],
          ['Este mes',       esteMes,         'var(--accent)'],
        ] as [string, number, string][]).map(([label, num, color]) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', color }}>{num}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.8px' }}>{label}</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14, padding: 14, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <FL>Buscar</FL>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre, ref, lote..." style={INP} />
          </div>
          <div>
            <FL>Estado</FL>
            <select value={statusF} onChange={e => setStatusF(e.target.value as typeof statusF)} style={INP}>
              <option value="all">Todos</option>
              <option value="stock">En stock</option>
              <option value="destapado">Destapado</option>
            </select>
          </div>
          <div>
            <FL>Ubicación</FL>
            <select value={ubicF} onChange={e => setUbicF(e.target.value)} style={INP}>
              <option value="">Todas</option>
              {UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <FL>Desde</FL>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={INP} />
          </div>
          <div>
            <FL>Hasta</FL>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={INP} />
          </div>
          <button onClick={clearFilters} style={GHOST}>✕ Limpiar</button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 10 }}>
          {rows.length} registro{rows.length !== 1 ? 's' : ''}
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['#', 'Estado', 'F. Llegada', 'Nombre', 'Ref', 'Lote', 'Vol', 'Vence', 'Responsable', 'Ubicación', 'F. Destape'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={11}><div style={EMPTY_TD}><Package size={30} strokeWidth={1.5} /><p>Sin registros</p></div></td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(221,227,237,.5)' }}>
                  <td style={TMONO}>{rows.length - i}</td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 10,
                      fontFamily: 'var(--mono)', fontWeight: 600,
                      background: r.destapado ? 'rgba(224,123,0,.1)' : 'rgba(46,158,78,.1)',
                      color:      r.destapado ? '#e07b00'             : '#2e9e4e',
                      border:     `1px solid ${r.destapado ? 'rgba(224,123,0,.25)' : 'rgba(46,158,78,.25)'}`,
                    }}>
                      {r.destapado ? 'Destapado' : 'En stock'}
                    </span>
                  </td>
                  <td style={TMONO}>{r.fecha || '—'}</td>
                  <td style={{ padding: '10px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.nombre || ''}>{r.nombre || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><span style={B_REF}>{r.ref || '—'}</span></td>
                  <td style={TMONO}>{r.lote || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{r.vol || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><span style={B_EXP}>{r.venc || '—'}</span></td>
                  <td style={{ padding: '10px 14px' }}>{r.responsable || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><span style={B_LOC}>{r.ubicacion || '—'}</span></td>
                  <td style={TMONO}>{r.destape?.fecha || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── Tab Buscar ─────────────────────────────────────────────────────────────────

function TabBuscar({ llegadas, destapes }: { llegadas: ConsumibleLlegada[], destapes: ConsumibleDestape[] }) {
  const [q, setQ] = useState('')
  const ql = q.toLowerCase()
  const results = ql.length >= 2
    ? llegadas.filter(r => [r.nombre, r.ref, r.lote, r.qr, r.responsable].some(f => f?.toLowerCase().includes(ql)))
    : []

  const grouped = results.reduce<Record<string, ConsumibleLlegada[]>>((acc, r) => {
    const key = r.ref || r.qr || 'SIN_REF'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <Card>
      <SecTitle>Buscar consumible</SecTitle>
      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder="Referencia, nombre, lote, QR..." style={{ ...INP, marginBottom: 16 }} autoFocus />
      {ql.length < 2 ? (
        <div style={EMPTY}><Search size={32} strokeWidth={1.5} /><p>Escribe al menos 2 caracteres para buscar</p></div>
      ) : results.length === 0 ? (
        <div style={EMPTY}><Search size={32} strokeWidth={1.5} /><p>Sin resultados para "<strong>{q}</strong>"</p></div>
      ) : (
        <div>
          <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 14 }}>{results.length} registro(s)</p>
          {Object.entries(grouped).map(([key, items]) => (
            <DiagCard key={key} main={items[0]} rest={items.slice(1)}
              destape={destapes.find(d => d.llegada_id === items[0].id)} />
          ))}
        </div>
      )}
    </Card>
  )
}

function DiagCard({ main, rest, destape }: { main: ConsumibleLlegada, rest: ConsumibleLlegada[], destape?: ConsumibleDestape }) {
  const [expanded, setExpanded] = useState(false)
  const full = [main.ref, main.lote, main.venc, main.nombre].filter(Boolean).join(' ')
  const campos = [
    { label: 'Referencia',     value: main.ref || main.qr || '' },
    { label: 'Lote',           value: main.lote || '' },
    { label: 'F. Vencimiento', value: main.venc || '' },
    { label: 'Descripción',    value: main.nombre || '' },
  ]
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{main.nombre || main.ref || 'Sin nombre'}</div>
          {destape && (
            <div style={{ fontSize: 11, marginTop: 4, color: '#e07b00', fontFamily: 'var(--mono)' }}>
              🔓 Destapado el {destape.fecha} por {destape.responsable}
            </div>
          )}
        </div>
        <CopyBtn value={full} label="Copiar todo" />
      </div>

      {campos.map(f => (
        <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', minWidth: 120 }}>{f.label}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, flex: 1 }}>{f.value || '—'}</span>
          <CopyBtn value={f.value} label="Copiar" small />
        </div>
      ))}

      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 10 }}>
        Registro: {main.fecha || '—'} · {main.responsable || '—'} · {main.ubicacion || '—'}{main.vol ? ' · ' + main.vol : ''}
      </div>

      {rest.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setExpanded(e => !e)}
            style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {expanded ? '▾' : '▸'} Ver {rest.length} registro{rest.length > 1 ? 's' : ''} anterior{rest.length > 1 ? 'es' : ''}
          </button>
          {expanded && rest.map((o, i) => (
            <div key={i} style={{ padding: '8px 0', borderTop: '1px solid var(--border)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', flex: 1 }}>
                {o.fecha || '—'} · Lote: <strong style={{ color: 'var(--text)' }}>{o.lote || '—'}</strong> · Vence: {o.venc || '—'} · {o.responsable || '—'}
              </span>
              <CopyBtn value={[o.ref, o.lote, o.venc, o.nombre].filter(Boolean).join(' ')} label="Copiar" small />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared UI components ───────────────────────────────────────────────────────

function CopyBtn({ value, label, small }: { value: string, label: string, small?: boolean }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button onClick={copy} style={{
      padding: small ? '3px 8px' : '5px 12px', fontSize: small ? 11 : 12,
      borderRadius: 6, background: 'var(--surface)', cursor: 'pointer',
      border: `1px solid ${copied ? 'rgba(46,158,78,.4)' : 'var(--border)'}`,
      color: copied ? '#2e9e4e' : 'var(--muted)', fontFamily: 'var(--mono)',
      transition: 'all .15s', whiteSpace: 'nowrap' as const,
    }}>
      {copied ? '✓ Copiado' : label}
    </button>
  )
}

const QRInput = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void }>(
  ({ value, onChange }, ref) => (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', fontSize: 18, pointerEvents: 'none' }}>▣</span>
      <input ref={ref} value={value} onChange={e => onChange(e.target.value)}
        placeholder="Escanear o escribir código QR..." autoComplete="off"
        style={{ ...INP, paddingLeft: 40, fontFamily: 'var(--mono)', fontSize: 14 }} />
    </div>
  )
)

function Select({ value, onChange, options, placeholder }: { value: string, onChange: (v: string) => void, options: string[], placeholder: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={INP}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 2, display: 'inline-block' }} />
      {children}
    </div>
  )
}

function FG({ label, hint, full, children }: { label: string, hint?: string, full?: boolean, children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...(full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)' }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 10, color: 'var(--muted)', opacity: .75 }}>{hint}</span>}
    </div>
  )
}

function FL({ children }: { children: string }) {
  return <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--mono)', marginBottom: 4 }}>{children}</div>
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>{children}</div>
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const INP: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
  borderRadius: 8, padding: '10px 13px', fontFamily: 'var(--sans)', fontSize: 13,
  width: '100%', outline: 'none', transition: 'border-color .2s',
}

function iS(filled: boolean): React.CSSProperties {
  return filled
    ? { ...INP, borderColor: 'rgba(0,94,184,.4)', color: 'var(--accent)', background: 'rgba(0,94,184,.05)', cursor: 'default' }
    : INP
}

const G2: React.CSSProperties  = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }
const PREVIEW: React.CSSProperties = { background: 'rgba(0,94,184,.05)', border: '1px solid rgba(0,94,184,.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 14, marginTop: 4 }

const PRI: React.CSSProperties = { padding: '11px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const GHOST: React.CSSProperties = { padding: '11px 22px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer' }

const TH: React.CSSProperties  = { background: 'var(--surface2)', padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.7px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
const TMONO: React.CSSProperties = { padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', verticalAlign: 'middle' }

const B_REF: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, background: 'rgba(245,158,11,.1)', color: '#e07b00', border: '1px solid rgba(245,158,11,.2)' }
const B_EXP: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, background: 'rgba(0,94,184,.1)', color: 'var(--accent)', border: '1px solid rgba(0,94,184,.2)' }
const B_LOC: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, background: 'rgba(0,94,184,.08)', color: 'var(--accent)', border: '1px solid rgba(0,94,184,.15)' }

const EMPTY_TD: React.CSSProperties = { textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }
const EMPTY: React.CSSProperties    = { textAlign: 'center', padding: '50px 20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }
