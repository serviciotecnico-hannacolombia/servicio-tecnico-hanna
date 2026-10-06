// Configuración (solo con mant_in_situ_editar). Equipos se edita en bloque
// (selección + acciones), Precios base y Jornada en la misma pantalla, y
// todo se puede actualizar también por CSV con vista previa (importaciones.ts).
// Destinos y peajes: se ven aquí y se actualizan por CSV.
import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { useDestinosInSitu, fmtCOP, fmtMinutos, CODIGO_BOGOTA } from './hooks/useMantInSitu'
import { FG, INP, B_ALERTA } from './ui'
import { CsvAcciones } from './CsvAcciones'
import { exportarDestinos, planDestinos, exportarPeajes, planPeajes } from './importaciones'
import { EquiposPanel } from './config/EquiposPanel'
import { PreciosPanel } from './config/PreciosPanel'
import { JornadaPanel } from './config/JornadaPanel'
import { EncabezadoPanel } from './config/EncabezadoPanel'
import type { MantInSituDestino } from '../../types'

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
          Cambios en bloque: selecciona en la tabla y aplica, o usa Descargar CSV → edita → Importar CSV.
        </p>
      </Card>
      {sub === 'equipos' ? <EquiposPanel /> : sub === 'precios' ? <PreciosPanel /> : sub === 'jornada' ? <JornadaPanel /> : <PeajesPanel />}
    </div>
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
      <EncabezadoPanel titulo="Peajes por visita y destino" subtitulo="Una visita incluye ida y regreso. Los peajes se multiplican por las visitas necesarias, no por equipos." acciones={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)' }}>Destinos (km, min, peaje manual)</span>
          <CsvAcciones
            titulo="Destinos"
            onExportar={() => exportarDestinos(data.destinos)}
            planificar={csv => planDestinos(csv, data.destinos)}
            ayuda={<>
              Solo se actualizan municipios que ya existen (por código DANE). Celda vacía en km/min = ruta pendiente de revisión.
              peaje_manual_valor vacío = usar los peajes de la ruta; 0 = ruta confirmada sin cobro. activo: si / no.
            </>}
          />
          <span style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)', marginTop: 4 }}>Tarifas de peajes</span>
          <CsvAcciones
            titulo="Tarifas de peajes"
            onExportar={() => exportarPeajes(data.peajes)}
            planificar={csv => planPeajes(csv, data.peajes)}
            ayuda={<>Solo se actualizan peajes que ya existen (por nombre). Tarifa categoría I sin decimales; actualizado en AAAA-MM-DD o DD/MM/AAAA. Sector, sentido y fuente se ignoran.</>}
          />
        </div>
      } />
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
