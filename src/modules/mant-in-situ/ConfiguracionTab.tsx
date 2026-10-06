// Configuración (solo con mant_in_situ_editar). Fase 1: solo lectura de los
// datos migrados del HTML — la edición llega en la fase 2.
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Spinner } from '../../components/ui/Spinner'
import {
  useConfigInSitu, useCodigosInSitu, useDestinosInSitu, useEquiposInSitu,
  fmtCOP, fmtHoras, fmtMinutos, CODIGO_BOGOTA, type EquipoInSitu,
} from './hooks/useMantInSitu'
import { FG, INP, EMPTY, B_CHIP, B_ALERTA } from './ui'
import type { MantInSituCodigo, MantInSituDestino } from '../../types'

type SubTab = 'equipos' | 'precios' | 'jornada' | 'peajes'

const SUBTABS: [SubTab, string][] = [
  ['equipos', 'Equipos y servicios'], ['precios', 'Precios base'], ['jornada', 'Jornada y vehículo'], ['peajes', 'Peajes por destino'],
]

export function ConfiguracionTab() {
  const [sub, setSub] = useState<SubTab>('equipos')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', gap: 20, alignItems: 'flex-start' }}>
      <Card bodyStyle={{ padding: 8 }}>
        {SUBTABS.map(([k, label]) => (
          <button key={k} onClick={() => setSub(k)} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: sub === k ? 600 : 500,
            background: sub === k ? 'var(--accent-bg)' : 'transparent', color: sub === k ? 'var(--accent)' : 'var(--text)',
          }}>{label}</button>
        ))}
        <p style={{ fontSize: 11, color: 'var(--muted)', padding: '10px 12px 4px', lineHeight: 1.5 }}>
          Solo lectura por ahora — la edición llega en la siguiente fase.
        </p>
      </Card>
      {sub === 'equipos' ? <EquiposPanel /> : sub === 'precios' ? <PreciosPanel /> : sub === 'jornada' ? <JornadaPanel /> : <PeajesPanel />}
    </div>
  )
}

// ── Equipos y servicios ─────────────────────────────────────────────────────

type FiltroPendiente = 'todos' | 'pendientes' | 'excepciones'

function EquiposPanel() {
  const { equipos, isLoading } = useEquiposInSitu()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroPendiente>('todos')

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return equipos
      .filter(e => filtro === 'todos' || (filtro === 'pendientes' ? !e.completo : e.tieneExcepcion))
      .filter(e => !q || [e.referencia, e.nombre, e.codigo, e.familia].some(v => (v || '').toLowerCase().includes(q)))
  }, [equipos, busqueda, filtro])

  const columns: Column<EquipoInSitu>[] = [
    { key: 'ref', header: 'Referencia', width: '130px', render: e => <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12.5 }}>{e.referencia}</span> },
    {
      key: 'nombre', header: 'Equipo',
      render: e => <div><div style={{ fontSize: 12.5 }}>{e.nombre}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.familia}</div></div>,
    },
    { key: 'codigo', header: 'Código', width: '150px', render: e => e.codigo ? <span style={B_CHIP}>{e.codigo}</span> : <span style={B_ALERTA}>Sin código</span> },
    { key: 'horas', header: 'Horas', width: '70px', align: 'right', render: e => e.horas != null ? fmtHoras(e.horas) : '—' },
    {
      key: 'precio', header: 'Precio base', width: '130px', align: 'right',
      render: e => <span title={e.precioIndividual ? 'Precio individual' : 'Precio del código'}>{fmtCOP(e.precio)}{e.precioIndividual ? ' *' : ''}</span>,
    },
    { key: 'exc', header: '', width: '90px', render: e => e.tieneExcepcion ? <span style={B_CHIP} title="Tiene valores propios distintos a Códigos o al código de mantenimiento">Excepción</span> : null },
  ]

  if (isLoading) return <Card><Spinner size={24} /></Card>

  const pendientes = equipos.filter(e => !e.completo).length
  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700 }}>Equipos y descripciones de servicio</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 14px' }}>
        Catálogo desde <strong>Códigos</strong> ({equipos.length} referencias). Sin precio individual se usa el del código. {pendientes > 0 && <>· <span style={{ color: 'var(--red)' }}>{pendientes} sin código, horas o precio válido</span></>}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Referencia, nombre, familia o código" style={{ ...INP, paddingLeft: 34 }} />
        </div>
        <select value={filtro} onChange={e => setFiltro(e.target.value as FiltroPendiente)} style={{ ...INP, width: 'auto' }}>
          <option value="todos">Todos los equipos</option>
          <option value="pendientes">Con información pendiente</option>
          <option value="excepciones">Con excepción</option>
        </select>
      </div>
      {filtrados.length === 0
        ? <div style={EMPTY}><p>Sin resultados</p></div>
        : <Table columns={columns} data={filtrados.slice(0, 300)} keyExtractor={e => e.referencia} compact />}
      {filtrados.length > 300 && <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>Mostrando 300 de {filtrados.length}. Usa el buscador para acotar.</p>}
    </Card>
  )
}

// ── Precios base ────────────────────────────────────────────────────────────

function PreciosPanel() {
  const { data: codigos = [], isLoading } = useCodigosInSitu()
  const { equipos } = useEquiposInSitu()
  const usoPorCodigo = new Map<string, number>()
  for (const e of equipos) if (e.codigo) usoPorCodigo.set(e.codigo, (usoPorCodigo.get(e.codigo) || 0) + 1)

  const columns: Column<MantInSituCodigo>[] = [
    { key: 'codigo', header: 'Código de mantenimiento', render: c => <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{c.codigo}</span> },
    { key: 'horas', header: 'Horas estándar', width: '130px', align: 'right', render: c => fmtHoras(c.horas) },
    { key: 'precio', header: 'Precio base', width: '150px', align: 'right', render: c => <strong>{fmtCOP(c.precio)}</strong> },
    { key: 'uso', header: 'Referencias', width: '110px', align: 'right', render: c => usoPorCodigo.get(c.codigo) || 0 },
  ]
  if (isLoading) return <Card><Spinner size={24} /></Card>
  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700 }}>Precios base por mantenimiento</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 14px' }}>Se aplican a las referencias sin precio individual.</p>
      <Table columns={columns} data={codigos} keyExtractor={c => c.codigo} />
    </Card>
  )
}

// ── Jornada y vehículo ──────────────────────────────────────────────────────

function JornadaPanel() {
  const { data: config, isLoading } = useConfigInSitu()
  if (isLoading) return <Card><Spinner size={24} /></Card>
  if (!config) return <Card><p style={{ color: 'var(--muted)' }}>Falta la configuración inicial — aplica la migración del módulo.</p></Card>

  const campos: [string, string][] = [
    ['Jornada laboral', fmtHoras(config.jornada_horas) + ' por día'],
    ['Uso y desgaste del vehículo', fmtCOP(config.costo_km) + ' por km'],
    ['Rendimiento del vehículo', `${config.rendimiento_km_galon} km por galón`],
    ['Precio del combustible', fmtCOP(config.precio_galon) + ' por galón'],
    ['Margen del recorrido por sentido', `${config.margen_recorrido_pct} %`],
  ]
  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700 }}>Jornada y desplazamiento</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 14px' }}>La ida y el regreso se reservan cada día antes de asignar horas de mantenimiento.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {campos.map(([label, valor]) => (
          <FG key={label} label={label}><div style={INP}>{valor}</div></FG>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12.5, lineHeight: 1.6 }}>
        <strong>Origen fijo: {config.origen_nombre}</strong><br />
        {config.origen_direccion}<br />
        <span style={{ color: 'var(--muted)' }}>
          Dentro de Bogotá se cobra únicamente el servicio. Fuera de Bogotá se suman vehículo, combustible y peajes por visita.
          {config.rutas_consultadas_at && <> Distancias a la cabecera municipal consultadas en OSRM el {new Date(config.rutas_consultadas_at).toLocaleDateString('es-CO')}; no incluyen tráfico en tiempo real.</>}
        </span>
      </div>
      <div style={{ marginTop: 16 }}>
        <FG label="Descripción general del servicio (para el cliente)">
          <textarea readOnly value={config.descripcion_servicio} rows={8} style={{ ...INP, resize: 'vertical', lineHeight: 1.55 }} />
        </FG>
      </div>
    </Card>
  )
}

// ── Peajes por destino ──────────────────────────────────────────────────────

function PeajesPanel() {
  const { data, isLoading } = useDestinosInSitu()
  const [codigo, setCodigo] = useState('')
  if (isLoading || !data) return <Card><Spinner size={24} /></Card>

  const peajePorId = new Map(data.peajes.map(p => [p.id, p]))
  const destinos = data.destinos.filter(d => d.codigo !== CODIGO_BOGOTA)
  const sel: MantInSituDestino | undefined = destinos.find(d => d.codigo === codigo) ?? destinos[0]
  const pasos = sel ? data.pasos.filter(p => p.destino_codigo === sel.codigo) : []
  const porSentido = (s: 'ida' | 'regreso') => pasos.filter(p => p.sentido === s).map(p => ({ ...p, peaje: peajePorId.get(p.peaje_id) }))
  const totalRuta = pasos.reduce((s, p) => s + (peajePorId.get(p.peaje_id)?.tarifa_categoria_i ?? 0), 0)

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700 }}>Peajes por visita y destino</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 14px' }}>Una visita incluye ida y regreso. Los peajes se multiplican por las visitas necesarias, no por equipos.</p>
      <FG label="Destino a revisar">
        <select value={sel?.codigo || ''} onChange={e => setCodigo(e.target.value)} style={INP}>
          {destinos.map(d => <option key={d.codigo} value={d.codigo}>{d.municipio}</option>)}
        </select>
      </FG>
      {sel && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 14 }}>
            {(['ida', 'regreso'] as const).map(s => (
              <div key={s} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{s === 'ida' ? 'Ida' : 'Regreso'}</div>
                <div style={{ fontSize: 12.5 }}>
                  {s === 'ida' ? sel.ida_km : sel.regreso_km} km · {fmtMinutos(s === 'ida' ? sel.ida_min : sel.regreso_min)}
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {porSentido(s).length === 0
                    ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sin peajes</span>
                    : porSentido(s).map(p => (
                      <div key={p.peaje_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5 }}>
                        <span>{p.peaje?.nombre}{p.revision_requerida && <span style={{ ...B_ALERTA, marginLeft: 6 }} title="Detectado por geometría de la ruta — confirmar">revisar</span>}</span>
                        <strong>{fmtCOP(p.peaje?.tarifa_categoria_i)}</strong>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Total por visita (ida + regreso)</span>
            <strong>{sel.peaje_manual_valor != null ? `${fmtCOP(sel.peaje_manual_valor)} (manual)` : fmtCOP(totalRuta)}</strong>
          </div>
          {sel.peaje_manual_motivo && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Motivo: {sel.peaje_manual_motivo}</p>}
          {sel.revision_peajes?.note && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', fontSize: 12.5, lineHeight: 1.55 }}>
              <strong>Revisión de peajes{sel.revision_peajes.checkedAt ? ` · ${new Date(sel.revision_peajes.checkedAt + 'T00:00:00').toLocaleDateString('es-CO')}` : ''}</strong>
              <p style={{ margin: '4px 0' }}>{sel.revision_peajes.note}</p>
              {sel.revision_peajes.sources?.map(f => (
                <div key={f.url}><a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{f.label} ↗</a></div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
