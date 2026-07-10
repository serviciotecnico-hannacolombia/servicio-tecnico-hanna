import { useState, useRef, forwardRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Warehouse, AlertTriangle, ArrowRightLeft, Mail, CheckCircle2, Download, Trash2, X, ListTodo, MapPinOff } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { useUser } from '../../hooks/useUser'
import { useProfiles } from '../../hooks/useProfiles'
import { exportToCSV, todayISO } from '../../lib/utils'
import { INTRANET_URL } from '../../lib/constants'
import type { OtstBodega, OtstBodegaMovimiento, OtstBodegaZona, OtstBodegaConfig, EstadoOtstBodega, OtstBodegaPendiente } from '../../types'

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_COLUMNAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const FILAS       = [0, 1, 2, 3]
const SUBCOLUMNAS = [1, 2]
const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ── QR Parser (formato "OTST-MM-AAAA|correo") ─────────────────────────────────

interface ParsedOtstQR {
  otst: string
  mes: number
  anio: number
  correo: string
}

// Algunos lectores de QR emiten teclas en layout US mientras Windows está en
// layout ES, lo que corrompe los separadores: '-' → ', '|' → Ç/], '@' → ".
// Se acepta cualquiera de esas variantes al parsear.
const SEP_GRUPO = /['-]/
const SEP_CORREO = /[|Çç\]}]/

function parseOtstQR(raw: string): ParsedOtstQR | null {
  const sepIdx = raw.search(SEP_CORREO)
  if (sepIdx === -1) return null
  const izq = raw.slice(0, sepIdx)
  const correo = raw.slice(sepIdx + 1).replace(/"/g, '@')
  const partes = izq.trim().split(SEP_GRUPO)
  if (partes.length !== 3) return null
  const [otst, mesStr, anioStr] = partes
  const mes  = parseInt(mesStr, 10)
  const anio = parseInt(anioStr, 10)
  if (!otst.trim() || !mes || mes < 1 || mes > 12 || !anio || anio < 2000 || anio > 2100) return null
  return { otst: otst.trim(), mes, anio, correo: correo.trim() }
}

function codigoUbicacion(columna: string, fila: number | string, subcolumna: number | string): string {
  return `${columna}${fila}${subcolumna}`
}

function mesesTranscurridos(mes: number, anio: number): number {
  const now = new Date()
  return (now.getFullYear() - anio) * 12 + (now.getMonth() + 1 - mes)
}

function nombreMesAnio(mes: number, anio: number): string {
  return `${MESES[mes] ?? mes} ${anio}`
}

// ── Supabase queries ───────────────────────────────────────────────────────────

function useBodega() {
  return useQuery({
    queryKey: ['otst_bodega'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('otst_bodega').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as OtstBodega[]
    },
  })
}

function useMovimientos() {
  return useQuery({
    queryKey: ['otst_bodega_movimientos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('otst_bodega_movimientos').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as OtstBodegaMovimiento[]
    },
  })
}

function useZonas() {
  return useQuery({
    queryKey: ['otst_bodega_zonas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('otst_bodega_zonas').select('*').order('anio', { ascending: false }).order('mes', { ascending: false })
      if (error) throw error
      return data as OtstBodegaZona[]
    },
  })
}

function useConfig() {
  return useQuery({
    queryKey: ['otst_bodega_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('otst_bodega_config').select('*').eq('id', 1).single()
      if (error) throw error
      return data as OtstBodegaConfig
    },
  })
}

function usePendientes() {
  return useQuery({
    queryKey: ['otst_bodega_pendientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('otst_bodega_pendientes').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as OtstBodegaPendiente[]
    },
  })
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Tab = 'ingreso' | 'bodega' | 'pendientes' | 'historial' | 'config'

export function OtstBodegaPage() {
  const { hasCapability } = useUser()
  const canRegistrarIngreso = hasCapability('bodega_registrar_ingreso')
  const [tab, setTab] = useState<Tab>(canRegistrarIngreso ? 'ingreso' : 'bodega')
  const { data: bodega     = [] } = useBodega()
  const { data: movimientos = [] } = useMovimientos()
  const { data: zonas      = [] } = useZonas()
  const { data: pendientes = [] } = usePendientes()
  const { data: config } = useConfig()
  const umbral   = config?.umbral_meses ?? 3
  const columnas = config?.columnas ?? DEFAULT_COLUMNAS
  const abiertas = pendientes.filter(p => p.estado === 'pendiente').length

  return (
    <div>
      <Header title="Bodega" subtitle="Ubicación física y control de OTST abandonadas en bodega" />

      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
        {([
          ...(canRegistrarIngreso ? [['ingreso', '📥', 'Ingreso']] : []),
          ['bodega',     '🗄️', 'Bodega'],
          ['pendientes', '📋', 'Pendientes'],
          ['historial',  '🕓', 'Historial'],
          ['config',     '⚙️', 'Config'],
        ] as [Tab, string, string][]).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 9, cursor: 'pointer',
            fontSize: 13, fontWeight: tab === id ? 600 : 500, fontFamily: 'var(--sans)',
            background: tab === id ? 'var(--accent)' : 'transparent',
            color: tab === id ? '#fff' : 'var(--muted)', transition: 'all .18s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {icon} {label}
            {id === 'pendientes' && abiertas > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18, padding: '0 5px', borderRadius: 10,
                background: tab === id ? 'rgba(255,255,255,.25)' : '#c0392b',
                color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
              }}>{abiertas}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'ingreso'    && <TabIngreso    zonas={zonas} bodega={bodega} columnas={columnas} />}
      {tab === 'bodega'     && <TabBodega     bodega={bodega} umbral={umbral} columnas={columnas} pendientes={pendientes} />}
      {tab === 'pendientes' && <TabPendientes bodega={bodega} pendientes={pendientes} umbral={umbral} />}
      {tab === 'historial'  && <TabHistorial  bodega={bodega} movimientos={movimientos} />}
      {tab === 'config'     && <TabConfig     zonas={zonas} config={config} bodega={bodega} />}
    </div>
  )
}

// ── Tab Ingreso ────────────────────────────────────────────────────────────────

function TabIngreso({ zonas, bodega, columnas }: { zonas: OtstBodegaZona[], bodega: OtstBodega[], columnas: string[] }) {
  const qc              = useQueryClient()
  const qrRef           = useRef<HTMLInputElement>(null)
  const { displayName } = useUser()

  const [qr,         setQr]         = useState('')
  const [otst,       setOtst]       = useState('')
  const [mes,        setMes]        = useState<number | ''>('')
  const [anio,       setAnio]       = useState<number | ''>('')
  const [correo,     setCorreo]     = useState('')
  const [columna,    setColumna]    = useState('')
  const [fila,       setFila]       = useState<number | ''>('')
  const [subcolumna, setSubcolumna] = useState<number | ''>('')
  const [nota,       setNota]       = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [saving,     setSaving]     = useState(false)

  const zonaSugerida = mes && anio ? zonas.find(z => z.mes === mes && z.anio === anio) : undefined
  const duplicada = otst.trim().length > 0
    ? bodega.find(r => r.otst.trim().toLowerCase() === otst.trim().toLowerCase())
    : undefined

  function handleQR(val: string) {
    setQr(val)
    const parsed = parseOtstQR(val)
    if (parsed) {
      setOtst(parsed.otst); setMes(parsed.mes); setAnio(parsed.anio); setCorreo(parsed.correo)
      setAutoFilled(true)
      return
    }
    if (autoFilled) {
      setOtst(''); setMes(''); setAnio(''); setCorreo(''); setAutoFilled(false)
    }
  }

  async function submit() {
    if (!otst.trim())        { toast.error('Ingresa el número de OTST'); return }
    if (!mes || !anio)       { toast.error('Indica mes y año de ingreso'); return }
    if (!columna || fila === '' || !subcolumna) { toast.error('Selecciona la ubicación completa (columna, fila, subcolumna)'); return }
    if (duplicada) { toast.error(`La OTST ${otst.trim()} ya está registrada en bodega`); return }
    setSaving(true)
    const codigo = codigoUbicacion(columna, fila, subcolumna)
    const { data, error } = await supabase.from('otst_bodega').insert({
      otst: otst.trim(), correo_cliente: correo.trim() || null,
      mes_ingreso: mes, anio_ingreso: anio,
      columna, fila, subcolumna,
      estado: 'en_bodega', nota: nota.trim() || null, usuario: displayName,
    }).select().single()
    if (error) {
      const msg = error.code === '23505' ? `La OTST ${otst.trim()} ya está registrada en bodega` : 'Error: ' + error.message
      toast.error(msg); setSaving(false); return
    }

    const { error: movError } = await supabase.from('otst_bodega_movimientos').insert({
      otst_id: data.id, tipo: 'ingreso', usuario: displayName,
      ubicacion_origen: null, ubicacion_destino: codigo, motivo: nota.trim() || null,
    })
    setSaving(false)
    if (movError) { toast.error('Registro guardado, pero falló el historial: ' + movError.message) }
    else toast.success('OTST registrada en bodega')

    qc.invalidateQueries({ queryKey: ['otst_bodega'] })
    qc.invalidateQueries({ queryKey: ['otst_bodega_movimientos'] })
    clearParaSiguiente()
  }

  // Mantiene la ubicación (columna/fila/subcolumna) para agregar varias OTST seguidas al mismo lugar.
  function clearParaSiguiente() {
    setQr(''); setOtst(''); setMes(''); setAnio(''); setCorreo(''); setNota(''); setAutoFilled(false)
    qrRef.current?.focus()
  }

  function clear() {
    clearParaSiguiente()
    setColumna(''); setFila(''); setSubcolumna('')
  }

  return (
    <Card>
      <SecTitle>Registrar ingreso a bodega</SecTitle>
      <FG label="Código QR de la OTST" hint="Escanea el QR generado en diagnóstico para rellenar OTST, mes/año y correo automáticamente">
        <QRInput ref={qrRef} value={qr} onChange={handleQR} />
      </FG>

      <div style={G2}>
        <FG label="OTST (AUTO)" hint={duplicada ? '⚠ Esta OTST ya está registrada en bodega' : undefined}>
          <input value={otst} onChange={e => setOtst(e.target.value)} readOnly={autoFilled}
            placeholder="Auto desde QR" style={duplicada ? { ...iS(autoFilled), borderColor: '#c0392b' } : iS(autoFilled)} />
        </FG>
        <FG label="Correo del cliente (AUTO)">
          <input value={correo} onChange={e => setCorreo(e.target.value)} readOnly={autoFilled} placeholder="Auto desde QR" style={iS(autoFilled)} />
        </FG>
        <FG label="Mes de ingreso (AUTO)">
          <select value={mes} onChange={e => setMes(e.target.value ? Number(e.target.value) : '')} disabled={autoFilled} style={iS(autoFilled)}>
            <option value="">Seleccionar...</option>
            {MESES.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </FG>
        <FG label="Año de ingreso (AUTO)">
          <input type="number" value={anio} onChange={e => setAnio(e.target.value ? Number(e.target.value) : '')} readOnly={autoFilled} placeholder="Auto desde QR" style={iS(autoFilled)} />
        </FG>
        <FG label="Responsable">
          <input value={displayName} readOnly style={iS(true)} />
        </FG>
      </div>

      {zonaSugerida && (
        <div style={{ ...PREVIEW, marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)', color: 'var(--accent)', marginBottom: 4 }}>
            Zona sugerida para {nombreMesAnio(mes as number, anio as number)}
          </div>
          <div style={{ fontSize: 13 }}>Columnas: <strong>{zonaSugerida.columnas.join(', ')}</strong></div>
        </div>
      )}

      <SecTitle>Ubicación asignada</SecTitle>
      <div style={G3}>
        <FG label="Columna">
          <select value={columna} onChange={e => setColumna(e.target.value)} style={INP}>
            <option value="">Seleccionar...</option>
            {columnas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FG>
        <FG label="Fila">
          <select value={fila} onChange={e => setFila(e.target.value ? Number(e.target.value) : '')} style={INP}>
            <option value="">Seleccionar...</option>
            {FILAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </FG>
        <FG label="Subcolumna">
          <select value={subcolumna} onChange={e => setSubcolumna(e.target.value ? Number(e.target.value) : '')} style={INP}>
            <option value="">Seleccionar...</option>
            {SUBCOLUMNAS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FG>
      </div>

      {columna && fila !== '' && subcolumna && (
        <div style={{ marginTop: 10, fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
          → Casilla: <strong>{codigoUbicacion(columna, fila, subcolumna)}</strong>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <FG label="Observaciones">
          <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Opcional..." rows={2} style={{ ...INP, resize: 'vertical' }} />
        </FG>
      </div>

      <Actions>
        <button onClick={clear} style={GHOST}>↺ Limpiar</button>
        <button onClick={submit} disabled={saving || !!duplicada} style={PRI}>{saving ? 'Guardando…' : '✓ Registrar ingreso'}</button>
      </Actions>
    </Card>
  )
}

// ── Tab Bodega ─────────────────────────────────────────────────────────────────

function TabBodega({ bodega, umbral, columnas, pendientes }: { bodega: OtstBodega[], umbral: number, columnas: string[], pendientes: OtstBodegaPendiente[] }) {
  const { hasCapability } = useUser()
  const canEliminar = hasCapability('bodega_eliminar')
  const [search,  setSearch]  = useState('')
  const [colF,    setColF]    = useState('')
  const [estadoF, setEstadoF] = useState<'all' | EstadoOtstBodega>('all')
  const [soloAbandonadas, setSoloAbandonadas] = useState(false)
  const [accionItem, setAccionItem] = useState<{ item: OtstBodega, tipo: 'mover' | 'contactar' | 'retirar' | 'eliminar' | 'pendiente' } | null>(null)

  const otstPendientes = new Set(pendientes.filter(p => p.estado === 'pendiente').map(p => p.otst.trim().toLowerCase()))

  const activos = bodega.filter(r => r.estado !== 'retirado')
  const abandonadas = activos.filter(r => mesesTranscurridos(r.mes_ingreso, r.anio_ingreso) >= umbral)
  const conNovedad = activos.filter(r => r.estado === 'novedad')
  const mes = new Date().toISOString().slice(0, 7)
  const esteMes = bodega.filter(r => r.created_at?.startsWith(mes)).length

  const rows = activos.filter(r => {
    const q  = search.toLowerCase()
    const ok = !q || [r.otst, r.correo_cliente].some(f => f?.toLowerCase().includes(q))
    const okC = !colF || r.columna === colF
    const okE = estadoF === 'all' || r.estado === estadoF
    const esAbandonada = mesesTranscurridos(r.mes_ingreso, r.anio_ingreso) >= umbral
    const okA = !soloAbandonadas || esAbandonada
    return ok && okC && okE && okA
  })

  function clearFilters() {
    setSearch(''); setColF(''); setEstadoF('all'); setSoloAbandonadas(false)
  }

  function exportarCSV() {
    if (!rows.length) { toast.error('No hay registros para exportar'); return }
    const data = rows.map(r => {
      const antig = mesesTranscurridos(r.mes_ingreso, r.anio_ingreso)
      return {
        OTST: r.otst,
        Correo: r.correo_cliente || '',
        'Mes Ingreso': MESES[r.mes_ingreso] || r.mes_ingreso,
        'Año Ingreso': r.anio_ingreso,
        Columna: r.columna,
        Fila: r.fila,
        Subcolumna: r.subcolumna,
        Ubicacion: codigoUbicacion(r.columna, r.fila, r.subcolumna),
        'Antiguedad (meses)': antig,
        Abandonada: antig >= umbral ? 'Si' : 'No',
        Estado: r.estado,
        'Responsable Novedad': r.responsable_novedad || '',
        Nota: r.nota || '',
        Usuario: r.usuario || '',
        'Creado en': r.created_at,
        'Actualizado en': r.updated_at,
      }
    })
    exportToCSV(data, `bodega_otst_${todayISO()}`)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {([
          ['En bodega',   activos.length,      'var(--accent)'],
          ['Abandonadas', abandonadas.length,  '#c0392b'],
          ['Con novedad', conNovedad.length,    '#7c3aed'],
          ['Este mes',    esteMes,             '#2e9e4e'],
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="OTST, correo..." style={INP} />
          </div>
          <div>
            <FL>Columna</FL>
            <select value={colF} onChange={e => setColF(e.target.value)} style={INP}>
              <option value="">Todas</option>
              {columnas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <FL>Estado</FL>
            <select value={estadoF} onChange={e => setEstadoF(e.target.value as typeof estadoF)} style={INP}>
              <option value="all">Todos</option>
              <option value="en_bodega">En bodega</option>
              <option value="contactado">Contactado</option>
              <option value="novedad">Novedad</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', paddingBottom: 10 }}>
            <input type="checkbox" checked={soloAbandonadas} onChange={e => setSoloAbandonadas(e.target.checked)} />
            Solo abandonadas
          </label>
          <button onClick={clearFilters} style={GHOST}>✕ Limpiar</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            {rows.length} registro{rows.length !== 1 ? 's' : ''}
          </div>
          <button onClick={exportarCSV} style={{ ...GHOST, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}>
            <Download size={13} /> Exportar CSV
          </button>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['OTST', 'Correo', 'F. Ingreso', 'Ubicación', 'Antigüedad', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7}><div style={EMPTY_TD}><Warehouse size={30} strokeWidth={1.5} /><p>Sin registros</p></div></td></tr>
              ) : rows.map(r => {
                const antig = mesesTranscurridos(r.mes_ingreso, r.anio_ingreso)
                const abandonada = antig >= umbral
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(221,227,237,.5)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}><OtstLink otst={r.otst} /></td>
                    <td style={{ padding: '10px 14px', fontSize: 11 }}>
                      {r.correo_cliente ? <CopyableText value={r.correo_cliente} /> : '—'}
                    </td>
                    <td style={TMONO}>{nombreMesAnio(r.mes_ingreso, r.anio_ingreso)}</td>
                    <td style={{ padding: '10px 14px' }}><span style={B_LOC}>{codigoUbicacion(r.columna, r.fila, r.subcolumna)}</span></td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={abandonada ? B_ABANDONADA : B_OK}>
                        {abandonada && <AlertTriangle size={11} style={{ marginRight: 3, verticalAlign: -1 }} />}
                        {antig} mes{antig !== 1 ? 'es' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {r.estado === 'novedad'
                            ? <span style={B_NOVEDAD}><MapPinOff size={11} style={{ marginRight: 3, verticalAlign: -1 }} />Novedad</span>
                            : <span style={r.estado === 'contactado' ? B_CONTACTADO : B_LOC}>{r.estado === 'contactado' ? 'Contactado' : 'En bodega'}</span>}
                          {otstPendientes.has(r.otst.trim().toLowerCase()) && <span style={B_PENDIENTE}>📋 Pendiente</span>}
                        </div>
                        {r.estado === 'novedad' && r.responsable_novedad && (
                          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>→ {r.responsable_novedad}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <IconBtn title="Mover"     onClick={() => setAccionItem({ item: r, tipo: 'mover' })}><ArrowRightLeft size={14} /></IconBtn>
                        <IconBtn title="Contactar" onClick={() => setAccionItem({ item: r, tipo: 'contactar' })}><Mail size={14} /></IconBtn>
                        <IconBtn title="Retirar"   onClick={() => setAccionItem({ item: r, tipo: 'retirar' })}><CheckCircle2 size={14} /></IconBtn>
                        {!otstPendientes.has(r.otst.trim().toLowerCase()) && (
                          <IconBtn title="Agregar a pendientes de despacho" onClick={() => setAccionItem({ item: r, tipo: 'pendiente' })}>
                            <ListTodo size={14} />
                          </IconBtn>
                        )}
                        {canEliminar && (
                          <IconBtn title="Eliminar" onClick={() => setAccionItem({ item: r, tipo: 'eliminar' })}>
                            <Trash2 size={14} color="#c0392b" />
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {accionItem?.tipo === 'mover'     && <ModalMover     item={accionItem.item} columnas={columnas} onClose={() => setAccionItem(null)} />}
      {accionItem?.tipo === 'contactar' && <ModalContactar item={accionItem.item} onClose={() => setAccionItem(null)} />}
      {accionItem?.tipo === 'retirar'   && <ModalRetirar   item={accionItem.item} onClose={() => setAccionItem(null)} />}
      {accionItem?.tipo === 'eliminar'  && <ModalEliminar  item={accionItem.item} onClose={() => setAccionItem(null)} />}
      {accionItem?.tipo === 'pendiente' && <ModalAgregarPendiente item={accionItem.item} onClose={() => setAccionItem(null)} />}
    </div>
  )
}

function ModalMover({ item, columnas, onClose }: { item: OtstBodega, columnas: string[], onClose: () => void }) {
  const qc              = useQueryClient()
  const { displayName } = useUser()
  const [columna,    setColumna]    = useState(item.columna)
  const [fila,       setFila]       = useState<number>(item.fila)
  const [subcolumna, setSubcolumna] = useState<number>(item.subcolumna)
  const [motivo,     setMotivo]     = useState('')
  const [saving,     setSaving]     = useState(false)

  async function submit() {
    setSaving(true)
    const origen  = codigoUbicacion(item.columna, item.fila, item.subcolumna)
    const destino = codigoUbicacion(columna, fila, subcolumna)
    const { error } = await supabase.from('otst_bodega')
      .update({ columna, fila, subcolumna, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    const { error: movError } = await supabase.from('otst_bodega_movimientos').insert({
      otst_id: item.id, tipo: 'traslado', usuario: displayName,
      ubicacion_origen: origen, ubicacion_destino: destino, motivo: motivo.trim() || null,
    })
    setSaving(false)
    if (movError) toast.error('Se movió, pero falló el historial: ' + movError.message)
    else toast.success('Ubicación actualizada')
    qc.invalidateQueries({ queryKey: ['otst_bodega'] })
    qc.invalidateQueries({ queryKey: ['otst_bodega_movimientos'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Mover OTST ${item.otst}`}>
      <div style={G3}>
        <FG label="Columna">
          <select value={columna} onChange={e => setColumna(e.target.value)} style={INP}>
            {columnas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FG>
        <FG label="Fila">
          <select value={fila} onChange={e => setFila(Number(e.target.value))} style={INP}>
            {FILAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </FG>
        <FG label="Subcolumna">
          <select value={subcolumna} onChange={e => setSubcolumna(Number(e.target.value))} style={INP}>
            {SUBCOLUMNAS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FG>
      </div>
      <div style={{ marginTop: 14 }}>
        <FG label="Motivo del traslado">
          <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Opcional..." rows={2} style={{ ...INP, resize: 'vertical' }} />
        </FG>
      </div>
      <Actions>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : 'Confirmar traslado'}</button>
      </Actions>
    </Modal>
  )
}

function ModalContactar({ item, onClose }: { item: OtstBodega, onClose: () => void }) {
  const qc              = useQueryClient()
  const { displayName } = useUser()
  const [correo, setCorreo] = useState(item.correo_cliente || '')
  const [saving, setSaving] = useState(false)

  function generarMailto(): string {
    const subject = `Recordatorio: retiro de equipo OTST ${item.otst}`
    const body = [
      `Estimado cliente,`,
      ``,
      `Le recordamos que el equipo correspondiente a la OTST ${item.otst}, recibido en ${nombreMesAnio(item.mes_ingreso, item.anio_ingreso)}, se encuentra en nuestra bodega de abandonados. Ayúdenos a darle salida indicándonos una de las siguientes opciones:`,
      ``,
      `  • Disposición final: autoriza que nos deshagamos del equipo correctamente.`,
      `  • Retiro: usted o alguien autorizado pasa a recogerlo en nuestras instalaciones.`,
      `  • Envío: se lo enviamos con pago contraentrega.`,
      ``,
      `Quedamos atentos a su respuesta.`,
      ``,
      `Saludos,`,
    ].join('\n')
    const params = [`subject=${encodeURIComponent(subject)}`, `body=${encodeURIComponent(body)}`]
    return `mailto:${correo.trim()}?${params.join('&')}`
  }

  async function submit() {
    if (!correo.trim()) { toast.error('Ingresa el correo del cliente'); return }
    setSaving(true)
    window.location.href = generarMailto()
    const { error } = await supabase.from('otst_bodega')
      .update({ estado: 'contactado', correo_cliente: correo.trim(), updated_at: new Date().toISOString() })
      .eq('id', item.id)
    const { error: movError } = await supabase.from('otst_bodega_movimientos').insert({
      otst_id: item.id, tipo: 'contacto', usuario: displayName,
      ubicacion_origen: codigoUbicacion(item.columna, item.fila, item.subcolumna),
      ubicacion_destino: codigoUbicacion(item.columna, item.fila, item.subcolumna),
      motivo: `Correo de recordatorio enviado a ${correo.trim()}`,
    })
    setSaving(false)
    if (error) toast.error('Error: ' + error.message)
    else if (movError) toast.error('Se marcó contactado, pero falló el historial: ' + movError.message)
    else toast.success('Correo abierto y OTST marcada como contactada')
    qc.invalidateQueries({ queryKey: ['otst_bodega'] })
    qc.invalidateQueries({ queryKey: ['otst_bodega_movimientos'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Contactar cliente — OTST ${item.otst}`}>
      <FG label="Correo del cliente">
        <input value={correo} onChange={e => setCorreo(e.target.value)} placeholder="correo@cliente.com" style={INP} />
      </FG>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
        Se abrirá tu cliente de correo con un recordatorio prellenado y la OTST quedará marcada como "Contactado".
      </p>
      <Actions>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Procesando…' : '✉ Abrir correo y marcar'}</button>
      </Actions>
    </Modal>
  )
}

function ModalRetirar({ item, onClose }: { item: OtstBodega, onClose: () => void }) {
  const qc              = useQueryClient()
  const { displayName } = useUser()
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const codigo = codigoUbicacion(item.columna, item.fila, item.subcolumna)
    const { error } = await supabase.from('otst_bodega')
      .update({ estado: 'retirado', updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    const { error: movError } = await supabase.from('otst_bodega_movimientos').insert({
      otst_id: item.id, tipo: 'retiro', usuario: displayName,
      ubicacion_origen: codigo, ubicacion_destino: codigo, motivo: motivo.trim() || null,
    })
    setSaving(false)
    if (movError) toast.error('Se retiró, pero falló el historial: ' + movError.message)
    else toast.success('OTST marcada como retirada')
    qc.invalidateQueries({ queryKey: ['otst_bodega'] })
    qc.invalidateQueries({ queryKey: ['otst_bodega_movimientos'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Retirar OTST ${item.otst}`}>
      <FG label="Motivo / observación">
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Opcional..." rows={2} style={{ ...INP, resize: 'vertical' }} />
      </FG>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
        La OTST dejará de aparecer en la lista de bodega, pero se conserva su historial.
      </p>
      <Actions>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Confirmar retiro'}</button>
      </Actions>
    </Modal>
  )
}

function ModalEliminar({ item, onClose }: { item: OtstBodega, onClose: () => void }) {
  const qc = useQueryClient()
  const [confirmacion, setConfirmacion] = useState('')
  const [saving, setSaving] = useState(false)
  const habilitado = confirmacion.trim() === item.otst.trim()

  async function submit() {
    if (!habilitado) return
    setSaving(true)
    const { error } = await supabase.from('otst_bodega').delete().eq('id', item.id)
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('OTST eliminada')
    qc.invalidateQueries({ queryKey: ['otst_bodega'] })
    qc.invalidateQueries({ queryKey: ['otst_bodega_movimientos'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Eliminar OTST ${item.otst}`}>
      <p style={{ fontSize: 13 }}>
        Esta acción elimina permanentemente el registro de la OTST <strong>{item.otst}</strong> y todo su historial de movimientos. No se puede deshacer.
      </p>
      <div style={{ marginTop: 14 }}>
        <FG label={`Escribe "${item.otst}" para confirmar`}>
          <input value={confirmacion} onChange={e => setConfirmacion(e.target.value)} placeholder={item.otst} style={INP} autoFocus />
        </FG>
      </div>
      <Actions>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving || !habilitado} style={{ ...PRI, background: '#c0392b', opacity: habilitado ? 1 : .5 }}>
          {saving ? 'Eliminando…' : '🗑 Eliminar definitivamente'}
        </button>
      </Actions>
    </Modal>
  )
}

function ModalAgregarPendiente({ item, onClose }: { item: OtstBodega, onClose: () => void }) {
  const qc              = useQueryClient()
  const { displayName } = useUser()
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const { error } = await supabase.from('otst_bodega_pendientes').insert({
      otst: item.otst, otst_id: item.id, nota: nota.trim() || null, solicitado_por: displayName, estado: 'pendiente',
    })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Agregada a pendientes de despacho')
    qc.invalidateQueries({ queryKey: ['otst_bodega_pendientes'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Agregar a pendientes — OTST ${item.otst}`}>
      <div style={{ ...PREVIEW, marginTop: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)', color: 'var(--accent)', marginBottom: 4 }}>
          Ubicación actual
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)' }}>{codigoUbicacion(item.columna, item.fila, item.subcolumna)}</div>
      </div>
      <FG label="Motivo de la solicitud" hint="Ej. Cliente pidió despacho por correo / pasar a logística para envío">
        <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Opcional..." rows={2} style={{ ...INP, resize: 'vertical' }} autoFocus />
      </FG>
      <Actions>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '+ Agregar a pendientes'}</button>
      </Actions>
    </Modal>
  )
}

function ModalNovedad({ item, onClose }: { item: OtstBodega, onClose: () => void }) {
  const qc              = useQueryClient()
  const { displayName } = useUser()
  const { data: profiles = [] } = useProfiles()
  const activos = profiles.filter(p => p.activo)
  const [responsable, setResponsable] = useState('')
  const [motivo, setMotivo] = useState('No se encontró físicamente en la ubicación registrada')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!responsable) { toast.error('Selecciona un responsable'); return }
    setSaving(true)
    const codigo = codigoUbicacion(item.columna, item.fila, item.subcolumna)
    const { error } = await supabase.from('otst_bodega')
      .update({ estado: 'novedad', responsable_novedad: responsable, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }

    const { error: movError } = await supabase.from('otst_bodega_movimientos').insert({
      otst_id: item.id, tipo: 'novedad', usuario: displayName,
      ubicacion_origen: codigo, ubicacion_destino: codigo,
      motivo: `${motivo.trim() || 'Novedad reportada'} — asignado a ${responsable}`,
    })
    setSaving(false)
    if (movError) toast.error('Se marcó la novedad, pero falló el historial: ' + movError.message)
    else toast.success('OTST marcada con novedad')
    qc.invalidateQueries({ queryKey: ['otst_bodega'] })
    qc.invalidateQueries({ queryKey: ['otst_bodega_movimientos'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Marcar novedad — OTST ${item.otst}`}>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        El sistema indica que debería estar en <strong>{codigoUbicacion(item.columna, item.fila, item.subcolumna)}</strong>, pero no se encontró físicamente. Asigna un responsable para investigarlo.
      </p>
      <FG label="Motivo / detalle">
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} style={{ ...INP, resize: 'vertical' }} />
      </FG>
      <div style={{ marginTop: 14 }}>
        <FG label="Responsable de investigar">
          <select value={responsable} onChange={e => setResponsable(e.target.value)} style={INP}>
            <option value="">Seleccionar...</option>
            {activos.map(p => (
              <option key={p.id} value={p.full_name || p.email}>{p.full_name || p.email}</option>
            ))}
          </select>
        </FG>
      </div>
      <Actions>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={{ ...PRI, background: '#c0392b' }}>{saving ? 'Guardando…' : '⚠ Marcar novedad'}</button>
      </Actions>
    </Modal>
  )
}

function ModalResolverNovedad({ item, onClose }: { item: OtstBodega, onClose: () => void }) {
  const qc              = useQueryClient()
  const { displayName } = useUser()
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const codigo = codigoUbicacion(item.columna, item.fila, item.subcolumna)
    const { error } = await supabase.from('otst_bodega')
      .update({ estado: 'en_bodega', responsable_novedad: null, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }

    const { error: movError } = await supabase.from('otst_bodega_movimientos').insert({
      otst_id: item.id, tipo: 'novedad', usuario: displayName,
      ubicacion_origen: codigo, ubicacion_destino: codigo,
      motivo: `Novedad resuelta${nota.trim() ? ': ' + nota.trim() : ''}`,
    })
    setSaving(false)
    if (movError) toast.error('Se resolvió, pero falló el historial: ' + movError.message)
    else toast.success('Novedad resuelta')
    qc.invalidateQueries({ queryKey: ['otst_bodega'] })
    qc.invalidateQueries({ queryKey: ['otst_bodega_movimientos'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Resolver novedad — OTST ${item.otst}`}>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Responsable actual: <strong>{item.responsable_novedad || '—'}</strong>
      </p>
      <FG label="¿Cómo se resolvió?">
        <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej. Se encontró en la misma ubicación, estaba mal registrada la fila..." rows={2} style={{ ...INP, resize: 'vertical' }} autoFocus />
      </FG>
      <Actions>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Resolver novedad'}</button>
      </Actions>
    </Modal>
  )
}

// ── Tab Pendientes (to-do de despachos) ─────────────────────────────────────────

function diasTranscurridos(fecha: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000))
}

function TabPendientes({ bodega, pendientes, umbral }: { bodega: OtstBodega[], pendientes: OtstBodegaPendiente[], umbral: number }) {
  const qc              = useQueryClient()
  const { displayName } = useUser()
  const otstRef          = useRef<HTMLInputElement>(null)
  const [otstInput, setOtstInput] = useState('')
  const [notaInput, setNotaInput] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [verCompletados, setVerCompletados] = useState(false)
  const [completando, setCompletando] = useState<{ pendiente: OtstBodegaPendiente, item: OtstBodega } | null>(null)
  const [marcandoNovedad, setMarcandoNovedad] = useState<OtstBodega | null>(null)
  const [resolviendoNovedad, setResolviendoNovedad] = useState<OtstBodega | null>(null)

  function resolverItem(p: OtstBodegaPendiente): OtstBodega | undefined {
    return bodega.find(b => b.otst.trim().toLowerCase() === p.otst.trim().toLowerCase())
  }

  const yaTienePendiente = new Set(pendientes.filter(p => p.estado === 'pendiente').map(p => p.otst.trim().toLowerCase()))

  async function agregar() {
    const otst = otstInput.trim()
    if (!otst) { toast.error('Ingresa el número de OTST'); return }
    if (yaTienePendiente.has(otst.toLowerCase())) { toast.error(`Ya existe una solicitud pendiente para la OTST ${otst}`); return }
    setSaving(true)
    const match = bodega.find(b => b.otst.trim().toLowerCase() === otst.toLowerCase())
    const { error } = await supabase.from('otst_bodega_pendientes').insert({
      otst, otst_id: match?.id ?? null, nota: notaInput.trim() || null, solicitado_por: displayName, estado: 'pendiente',
    })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(match ? 'Agregada a pendientes de despacho' : 'Agregada a pendientes (aún no está registrada en bodega)')
    qc.invalidateQueries({ queryKey: ['otst_bodega_pendientes'] })
    setOtstInput(''); setNotaInput('')
    otstRef.current?.focus()
  }

  async function quitar(id: string) {
    const { error } = await supabase.from('otst_bodega_pendientes').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    qc.invalidateQueries({ queryKey: ['otst_bodega_pendientes'] })
  }

  const abiertos = pendientes
    .filter(p => p.estado === 'pendiente')
    .map(p => ({ p, item: resolverItem(p) }))
    .sort((a, b) => a.p.created_at.localeCompare(b.p.created_at))

  const completados = pendientes
    .filter(p => p.estado === 'completado')
    .map(p => ({ p, item: resolverItem(p) }))

  return (
    <div>
      <Card>
        <SecTitle>Agregar solicitud de despacho</SecTitle>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 160px' }}>
            <FL>OTST</FL>
            <input
              ref={otstRef} value={otstInput}
              onChange={e => setOtstInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }}
              placeholder="Número..." style={INP} autoFocus
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <FL>Motivo (opcional)</FL>
            <input
              value={notaInput} onChange={e => setNotaInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }}
              placeholder="Ej. Cliente pidió despacho por correo..." style={INP}
            />
          </div>
          <button onClick={agregar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '+ Agregar'}</button>
        </div>
      </Card>

      <div style={{ marginTop: 20 }}>
        <SecTitle>Pendientes de despacho ({abiertos.length})</SecTitle>
        {abiertos.length === 0 ? (
          <Card><div style={EMPTY}><ListTodo size={32} strokeWidth={1.5} /><p>No hay solicitudes pendientes</p></div></Card>
        ) : (
          <Card bodyStyle={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['OTST', 'Ubicación', 'Antigüedad', 'Solicitado por', 'Hace', 'Nota', 'Acciones'].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {abiertos.map(({ p, item }) => {
                    const dias = diasTranscurridos(p.created_at)
                    const antig = item ? mesesTranscurridos(item.mes_ingreso, item.anio_ingreso) : null
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(221,227,237,.5)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}><OtstLink otst={p.otst} /></td>
                        <td style={{ padding: '10px 14px' }}>
                          {!item ? (
                            <span style={B_ABANDONADA}><AlertTriangle size={11} style={{ marginRight: 3, verticalAlign: -1 }} />No encontrada en bodega</span>
                          ) : item.estado === 'novedad' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={B_NOVEDAD}><MapPinOff size={11} style={{ marginRight: 3, verticalAlign: -1 }} />Novedad en {codigoUbicacion(item.columna, item.fila, item.subcolumna)}</span>
                              {item.responsable_novedad && <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>→ {item.responsable_novedad}</span>}
                            </div>
                          ) : (
                            <span style={{ ...B_LOC, fontSize: 13, fontWeight: 700 }}>{codigoUbicacion(item.columna, item.fila, item.subcolumna)}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {antig === null ? '—' : (
                            <span style={antig >= umbral ? B_ABANDONADA : B_OK}>{antig} mes{antig !== 1 ? 'es' : ''}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>{p.solicitado_por || '—'}</td>
                        <td style={TMONO}>hace {dias} día{dias !== 1 ? 's' : ''}</td>
                        <td style={{ padding: '10px 14px', maxWidth: 220 }}>{p.nota || '—'}</td>
                        <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {item && (
                              <button onClick={() => setCompletando({ pendiente: p, item })} style={{ ...PRI, padding: '6px 12px', fontSize: 12 }}>
                                ✓ Completar
                              </button>
                            )}
                            {item && (
                              item.estado === 'novedad' ? (
                                <IconBtn title="Resolver novedad" onClick={() => setResolviendoNovedad(item)}>
                                  <CheckCircle2 size={14} color="#7c3aed" />
                                </IconBtn>
                              ) : (
                                <IconBtn title="No se encontró físicamente / marcar novedad" onClick={() => setMarcandoNovedad(item)}>
                                  <MapPinOff size={14} color="#c0392b" />
                                </IconBtn>
                              )
                            )}
                            <IconBtn title="Quitar de pendientes" onClick={() => quitar(p.id)}><X size={14} /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={verCompletados} onChange={e => setVerCompletados(e.target.checked)} />
          Ver completados ({completados.length})
        </label>
        {verCompletados && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {completados.map(({ p, item }) => (
              <div key={p.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', fontSize: 12, opacity: .8 }}>
                <strong>OTST <OtstLink otst={p.otst} /></strong>{item ? ` (${codigoUbicacion(item.columna, item.fila, item.subcolumna)})` : ''} — despachado por {p.completado_por || '—'} el {p.completado_at ? new Date(p.completado_at).toLocaleString() : '—'}
                {p.nota && <div style={{ marginTop: 4, color: 'var(--muted)' }}>{p.nota}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {completando && (
        <ModalCompletarPendiente pendiente={completando.pendiente} item={completando.item} onClose={() => setCompletando(null)} />
      )}
      {marcandoNovedad && (
        <ModalNovedad item={marcandoNovedad} onClose={() => setMarcandoNovedad(null)} />
      )}
      {resolviendoNovedad && (
        <ModalResolverNovedad item={resolviendoNovedad} onClose={() => setResolviendoNovedad(null)} />
      )}
    </div>
  )
}

function ModalCompletarPendiente({ pendiente, item, onClose }: { pendiente: OtstBodegaPendiente, item: OtstBodega, onClose: () => void }) {
  const qc              = useQueryClient()
  const { displayName } = useUser()
  const [motivo, setMotivo] = useState(pendiente.nota || '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const codigo = codigoUbicacion(item.columna, item.fila, item.subcolumna)
    const { error } = await supabase.from('otst_bodega')
      .update({ estado: 'retirado', updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }

    const { error: movError } = await supabase.from('otst_bodega_movimientos').insert({
      otst_id: item.id, tipo: 'retiro', usuario: displayName,
      ubicacion_origen: codigo, ubicacion_destino: codigo, motivo: motivo.trim() || null,
    })
    const { error: pendError } = await supabase.from('otst_bodega_pendientes')
      .update({ estado: 'completado', completado_por: displayName, completado_at: new Date().toISOString() })
      .eq('id', pendiente.id)

    setSaving(false)
    if (movError || pendError) toast.error('Se retiró, pero falló actualizar el historial/pendiente')
    else toast.success('OTST despachada y retirada de bodega')

    qc.invalidateQueries({ queryKey: ['otst_bodega'] })
    qc.invalidateQueries({ queryKey: ['otst_bodega_movimientos'] })
    qc.invalidateQueries({ queryKey: ['otst_bodega_pendientes'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Completar despacho — OTST ${item.otst}`}>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Esto marca la OTST como retirada de bodega y cierra esta solicitud pendiente.
      </p>
      <FG label="Motivo / observación">
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Opcional..." rows={2} style={{ ...INP, resize: 'vertical' }} />
      </FG>
      <Actions>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Confirmar despacho'}</button>
      </Actions>
    </Modal>
  )
}

// ── Tab Historial ──────────────────────────────────────────────────────────────

function TabHistorial({ bodega, movimientos }: { bodega: OtstBodega[], movimientos: OtstBodegaMovimiento[] }) {
  const [q, setQ] = useState('')
  const ql = q.toLowerCase()
  const results = ql.length >= 2 ? bodega.filter(r => r.otst.toLowerCase().includes(ql)) : []

  return (
    <Card>
      <SecTitle>Buscar historial de una OTST</SecTitle>
      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder="Número de OTST..." style={{ ...INP, marginBottom: 16 }} autoFocus />
      {ql.length < 2 ? (
        <div style={EMPTY}><Search size={32} strokeWidth={1.5} /><p>Escribe al menos 2 caracteres para buscar</p></div>
      ) : results.length === 0 ? (
        <div style={EMPTY}><Search size={32} strokeWidth={1.5} /><p>Sin resultados para "<strong>{q}</strong>"</p></div>
      ) : (
        <div>
          {results.map(r => (
            <TimelineCard key={r.id} item={r} movimientos={movimientos.filter(m => m.otst_id === r.id)} />
          ))}
        </div>
      )}
    </Card>
  )
}

function TimelineCard({ item, movimientos }: { item: OtstBodega, movimientos: OtstBodegaMovimiento[] }) {
  const { hasCapability } = useUser()
  const canEliminar = hasCapability('bodega_eliminar')
  const [eliminando, setEliminando] = useState(false)
  const iconos: Record<string, string> = { ingreso: '📥', traslado: '🔄', contacto: '✉️', retiro: '✅', novedad: '⚠️' }
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>OTST <OtstLink otst={item.otst} /></div>
          <div style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            Ubicación actual: {codigoUbicacion(item.columna, item.fila, item.subcolumna)} · {item.estado}
          </div>
        </div>
        {canEliminar && (
          <IconBtn title="Eliminar" onClick={() => setEliminando(true)}><Trash2 size={14} color="#c0392b" /></IconBtn>
        )}
      </div>
      {eliminando && <ModalEliminar item={item} onClose={() => setEliminando(false)} />}
      {movimientos.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Sin movimientos registrados.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {movimientos.map(m => (
            <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <span>{iconos[m.tipo] || '•'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{m.tipo}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {new Date(m.created_at).toLocaleString()} · {m.usuario || '—'}
                  {m.ubicacion_origen && m.ubicacion_destino && m.ubicacion_origen !== m.ubicacion_destino
                    ? ` · ${m.ubicacion_origen} → ${m.ubicacion_destino}` : ''}
                </div>
                {m.motivo && <div style={{ fontSize: 12, marginTop: 2 }}>{m.motivo}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab Config ─────────────────────────────────────────────────────────────────

function TabConfig({ zonas, config, bodega }: { zonas: OtstBodegaZona[], config?: OtstBodegaConfig, bodega: OtstBodega[] }) {
  const qc = useQueryClient()
  const columnas = config?.columnas ?? DEFAULT_COLUMNAS
  const [umbral, setUmbral] = useState(config?.umbral_meses ?? 3)
  const [savingUmbral, setSavingUmbral] = useState(false)

  const [nuevaCol, setNuevaCol] = useState('')
  const [savingCols, setSavingCols] = useState(false)

  const [mes, setMes] = useState<number | ''>('')
  const [anio, setAnio] = useState<number | ''>(new Date().getFullYear())
  const [cols, setCols] = useState<string[]>([])
  const [savingZona, setSavingZona] = useState(false)

  async function guardarUmbral() {
    setSavingUmbral(true)
    const { error } = await supabase.from('otst_bodega_config').update({ umbral_meses: umbral }).eq('id', 1)
    setSavingUmbral(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Umbral actualizado')
    qc.invalidateQueries({ queryKey: ['otst_bodega_config'] })
  }

  function columnaEnUso(c: string) {
    return bodega.some(r => r.estado !== 'retirado' && r.columna === c)
  }

  async function agregarColumna() {
    const c = nuevaCol.trim().toUpperCase()
    if (!/^[A-Z]$/.test(c)) { toast.error('Ingresa una sola letra (A-Z)'); return }
    if (columnas.includes(c)) { toast.error(`La columna ${c} ya existe`); return }
    setSavingCols(true)
    const { error } = await supabase.from('otst_bodega_config')
      .update({ columnas: [...columnas, c].sort() }).eq('id', 1)
    setSavingCols(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`Columna ${c} agregada`)
    setNuevaCol('')
    qc.invalidateQueries({ queryKey: ['otst_bodega_config'] })
  }

  async function eliminarColumna(c: string) {
    if (columnaEnUso(c)) { toast.error(`No se puede quitar la columna ${c}: hay OTST activas ahí`); return }
    setSavingCols(true)
    const { error } = await supabase.from('otst_bodega_config')
      .update({ columnas: columnas.filter(x => x !== c) }).eq('id', 1)
    setSavingCols(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`Columna ${c} eliminada`)
    qc.invalidateQueries({ queryKey: ['otst_bodega_config'] })
  }

  function toggleCol(c: string) {
    setCols(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c].sort())
  }

  async function guardarZona() {
    if (!mes || !anio || cols.length === 0) { toast.error('Selecciona mes, año y al menos una columna'); return }
    setSavingZona(true)
    const { error } = await supabase.from('otst_bodega_zonas')
      .upsert({ mes, anio, columnas: cols }, { onConflict: 'mes,anio' })
    setSavingZona(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Zona guardada')
    setMes(''); setCols([])
    qc.invalidateQueries({ queryKey: ['otst_bodega_zonas'] })
  }

  async function eliminarZona(id: string) {
    const { error } = await supabase.from('otst_bodega_zonas').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    qc.invalidateQueries({ queryKey: ['otst_bodega_zonas'] })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <SecTitle>Umbral de abandono</SecTitle>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <FG label="Meses en bodega para considerar abandonada">
            <input type="number" min={1} value={umbral} onChange={e => setUmbral(Number(e.target.value))} style={{ ...INP, width: 120 }} />
          </FG>
          <button onClick={guardarUmbral} disabled={savingUmbral} style={PRI}>{savingUmbral ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </Card>

      <Card>
        <SecTitle>Columnas físicas de la bodega</SecTitle>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {columnas.map(c => (
            <div key={c} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface2)',
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13,
            }}>
              {c}
              <button onClick={() => eliminarColumna(c)} disabled={savingCols} title={`Eliminar columna ${c}`}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex' }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <FG label="Nueva columna (una letra)">
            <input value={nuevaCol} onChange={e => setNuevaCol(e.target.value.toUpperCase().slice(0, 1))} placeholder="I" style={{ ...INP, width: 80 }} />
          </FG>
          <button onClick={agregarColumna} disabled={savingCols} style={PRI}>{savingCols ? 'Guardando…' : '+ Agregar columna'}</button>
        </div>
      </Card>

      <Card>
        <SecTitle>Zonas de rotación mensual</SecTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <FG label="Mes">
            <select value={mes} onChange={e => setMes(e.target.value ? Number(e.target.value) : '')} style={INP}>
              <option value="">Seleccionar...</option>
              {MESES.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </FG>
          <FG label="Año">
            <input type="number" value={anio} onChange={e => setAnio(e.target.value ? Number(e.target.value) : '')} style={{ ...INP, width: 100 }} />
          </FG>
          <FG label="Columnas asignadas">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {columnas.map(c => (
                <button key={c} onClick={() => toggleCol(c)} style={{
                  width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--mono)', fontWeight: 700,
                  border: `1px solid ${cols.includes(c) ? 'var(--accent)' : 'var(--border)'}`,
                  background: cols.includes(c) ? 'var(--accent)' : 'var(--surface2)',
                  color: cols.includes(c) ? '#fff' : 'var(--text)',
                }}>{c}</button>
              ))}
            </div>
          </FG>
          <button onClick={guardarZona} disabled={savingZona} style={PRI}>{savingZona ? 'Guardando…' : '+ Agregar / actualizar zona'}</button>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>{['Mes', 'Año', 'Columnas', ''].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {zonas.length === 0 ? (
                <tr><td colSpan={4}><div style={EMPTY_TD}><p>Sin zonas configuradas</p></div></td></tr>
              ) : zonas.map(z => (
                <tr key={z.id} style={{ borderBottom: '1px solid rgba(221,227,237,.5)' }}>
                  <td style={{ padding: '10px 14px' }}>{MESES[z.mes]}</td>
                  <td style={TMONO}>{z.anio}</td>
                  <td style={{ padding: '10px 14px' }}>{z.columnas.join(', ')}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => eliminarZona(z.id)} style={GHOST}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── Shared UI components ───────────────────────────────────────────────────────

function OtstLink({ otst }: { otst: string }) {
  return (
    <a href={INTRANET_URL + otst} target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{
        color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 'inherit',
        textDecoration: 'none', padding: '2px 7px', borderRadius: 6,
        background: 'var(--accent-bg)', display: 'inline-block', transition: 'all .15s',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--accent)'; el.style.color = '#fff' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--accent-bg)'; el.style.color = 'var(--accent)' }}
    >
      {otst}
    </a>
  )
}

function CopyableText({ value }: { value: string }) {
  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(value).then(() => toast.success('Correo copiado al portapapeles'))
  }
  return (
    <span onClick={copy} title="Clic para copiar" style={{ cursor: 'pointer' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
    >
      {value}
    </span>
  )
}

function IconBtn({ title, onClick, children }: { title: string, onClick: () => void, children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface2)',
      color: 'var(--muted)', cursor: 'pointer',
    }}>
      {children}
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
const G3: React.CSSProperties  = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }
const PREVIEW: React.CSSProperties = { background: 'rgba(0,94,184,.05)', border: '1px solid rgba(0,94,184,.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 14, marginTop: 4 }

const PRI: React.CSSProperties = { padding: '11px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const GHOST: React.CSSProperties = { padding: '11px 22px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer' }

const TH: React.CSSProperties  = { background: 'var(--surface2)', padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.7px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
const TMONO: React.CSSProperties = { padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', verticalAlign: 'middle' }

const B_LOC: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, background: 'rgba(0,94,184,.08)', color: 'var(--accent)', border: '1px solid rgba(0,94,184,.15)' }
const B_OK: React.CSSProperties  = { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, background: 'rgba(46,158,78,.1)', color: '#2e9e4e', border: '1px solid rgba(46,158,78,.25)' }
const B_ABANDONADA: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, background: 'rgba(192,57,43,.1)', color: '#c0392b', border: '1px solid rgba(192,57,43,.3)' }
const B_CONTACTADO: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, background: 'rgba(224,123,0,.1)', color: '#e07b00', border: '1px solid rgba(224,123,0,.25)' }
const B_PENDIENTE: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, background: 'rgba(124,58,237,.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,.3)' }
const B_NOVEDAD: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, background: 'rgba(192,57,43,.1)', color: '#c0392b', border: '1px solid rgba(192,57,43,.3)' }

const EMPTY_TD: React.CSSProperties = { textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }
const EMPTY: React.CSSProperties    = { textAlign: 'center', padding: '50px 20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }
