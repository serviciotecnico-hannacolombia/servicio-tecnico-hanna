// Peajes por destino: por municipio se ve la ruta (km/min por sentido), los
// peajes detectados y la nota de revisión, y se edita en pantalla: km y
// minutos, peaje manual por visita (con motivo) y si el destino está activo
// en la Consulta. También se actualiza en bloque por CSV.
import { useState } from 'react'
import { toast } from 'sonner'
import { Card } from '../../../components/ui/Card'
import { Spinner } from '../../../components/ui/Spinner'
import { useDestinosInSitu, useInvalidarMantInSitu, fmtCOP, fmtMinutos, CODIGO_BOGOTA } from '../hooks/useMantInSitu'
import { guardarDestino } from '../acciones'
import { leerNumero } from '../csv'
import { exportarDestinos, planDestinos } from '../importaciones'
import { CsvAcciones } from '../CsvAcciones'
import { EncabezadoPanel } from './EncabezadoPanel'
import { FG, INP, PRI, B_ALERTA } from '../ui'
import type { MantInSituDestino, MantInSituDestinoPeaje, MantInSituPeaje } from '../../../types'

export function DestinosPanel() {
  const { data, isLoading } = useDestinosInSitu()
  const [codigo, setCodigo] = useState('')
  if (isLoading || !data) return <Card><Spinner size={24} /></Card>

  const destinos = data.destinos.filter(d => d.codigo !== CODIGO_BOGOTA)
  const sel = destinos.find(d => d.codigo === codigo) ?? destinos[0]

  return (
    <Card>
      <EncabezadoPanel
        titulo="Peajes por destino"
        subtitulo="Una visita incluye ida y regreso. Los peajes se multiplican por las visitas necesarias, no por equipos."
        acciones={
          <CsvAcciones
            titulo="Destinos"
            onExportar={() => exportarDestinos(data.destinos)}
            planificar={csv => planDestinos(csv, data.destinos)}
            ayuda={<>
              Solo se actualizan municipios que ya existen (por código DANE). Celda vacía en km/min = ruta pendiente de revisión.
              peaje_manual_valor vacío = usar los peajes de la ruta; 0 = ruta confirmada sin cobro. activo: si / no.
            </>}
          />
        }
      />
      <FG label="Destino">
        <select value={sel?.codigo || ''} onChange={e => setCodigo(e.target.value)} style={INP}>
          {destinos.map(d => <option key={d.codigo} value={d.codigo}>{d.municipio}{!d.activo ? ' (inactivo)' : ''}</option>)}
        </select>
      </FG>
      {sel && <FormularioDestino key={`${sel.codigo}-${sel.updated_at ?? ''}`} destino={sel} pasos={data.pasos} peajes={data.peajes} />}
    </Card>
  )
}

const NUMEROS = [['ida_km', 'Ida (km)'], ['ida_min', 'Ida (minutos)'], ['regreso_km', 'Regreso (km)'], ['regreso_min', 'Regreso (minutos)']] as const
type CampoRuta = typeof NUMEROS[number][0]

function FormularioDestino({ destino, pasos, peajes }: { destino: MantInSituDestino, pasos: MantInSituDestinoPeaje[], peajes: MantInSituPeaje[] }) {
  const invalidar = useInvalidarMantInSitu()
  const inicial = {
    ida_km: destino.ida_km?.toString() ?? '', ida_min: destino.ida_min?.toString() ?? '',
    regreso_km: destino.regreso_km?.toString() ?? '', regreso_min: destino.regreso_min?.toString() ?? '',
    peaje: destino.peaje_manual_valor?.toString() ?? '', motivo: destino.peaje_manual_motivo ?? '', activo: destino.activo,
  }
  const [f, setF] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const cambiado = JSON.stringify(f) !== JSON.stringify(inicial)

  const peajePorId = new Map(peajes.map(p => [p.id, p]))
  const propios = pasos.filter(p => p.destino_codigo === destino.codigo).map(p => ({ ...p, peaje: peajePorId.get(p.peaje_id) }))
  const totalRuta = propios.reduce((s, p) => s + Number(p.peaje?.tarifa_categoria_i ?? 0), 0)

  async function guardar() {
    const ruta = {} as Record<CampoRuta, number | null>
    for (const [campo, label] of NUMEROS) {
      const n = leerNumero(f[campo])
      if (n != null && (isNaN(n) || n < 0)) { toast.error(`${label}: valor no válido`); return }
      ruta[campo] = n
    }
    const peaje = leerNumero(f.peaje, true)
    if (peaje != null && (isNaN(peaje) || peaje < 0)) { toast.error('Peaje manual: valor no válido (sin decimales)'); return }
    if (peaje != null && !f.motivo.trim()) { toast.error('Indica el motivo o la ruta confirmada del peaje manual'); return }
    setGuardando(true)
    const error = await guardarDestino(destino.codigo, { ...ruta, peaje_manual_valor: peaje, peaje_manual_motivo: peaje != null ? f.motivo.trim() : null, activo: f.activo })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error); return }
    toast.success(`${destino.municipio} actualizado`)
    invalidar()
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {NUMEROS.map(([campo, label]) => (
          <FG key={campo} label={label}>
            <input value={f[campo]} onChange={e => setF(v => ({ ...v, [campo]: e.target.value }))} inputMode="decimal" placeholder="Pendiente" style={INP} />
          </FG>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 14 }}>
        {(['ida', 'regreso'] as const).map(s => (
          <div key={s} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
              Peajes de {s} · {fmtMinutos(s === 'ida' ? destino.ida_min : destino.regreso_min)}
            </div>
            {propios.filter(p => p.sentido === s).length === 0
              ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sin peajes en la ruta</span>
              : propios.filter(p => p.sentido === s).map(p => (
                <div key={p.peaje_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5 }}>
                  <span>{p.peaje?.nombre}{p.revision_requerida && <span style={{ ...B_ALERTA, marginLeft: 6 }} title="Detectado por la geometría de la ruta — confirmar">revisar</span>}</span>
                  <strong>{fmtCOP(p.peaje?.tarifa_categoria_i)}</strong>
                </div>
              ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(220px, 2fr)', gap: 12, marginTop: 14 }}>
        <FG label="Peaje manual por visita (COP)">
          <input value={f.peaje} onChange={e => setF(v => ({ ...v, peaje: e.target.value }))} inputMode="numeric" placeholder={`Vacío = ruta (${fmtCOP(totalRuta)})`} style={INP} />
        </FG>
        <FG label="Motivo o ruta confirmada">
          <input value={f.motivo} onChange={e => setF(v => ({ ...v, motivo: e.target.value }))} maxLength={250} placeholder="Ej. ruta acordada con el técnico" disabled={!f.peaje.trim()} style={INP} />
        </FG>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
        Total por visita: <strong>{f.peaje.trim() ? `${fmtCOP(leerNumero(f.peaje, true) || 0)} (manual)` : fmtCOP(totalRuta)}</strong>. 0 = ruta confirmada sin cobro; vacío = usar los peajes detectados en la ruta.
      </p>

      {destino.revision_peajes?.note && (
        <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', fontSize: 12.5, lineHeight: 1.55 }}>
          <strong>Revisión de peajes{destino.revision_peajes.checkedAt ? ` · ${new Date(destino.revision_peajes.checkedAt + 'T00:00:00').toLocaleDateString('es-CO')}` : ''}</strong>
          <p style={{ margin: '4px 0' }}>{destino.revision_peajes.note}</p>
          {destino.revision_peajes.sources?.map(fu => (
            <div key={fu.url}><a href={fu.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{fu.label} ↗</a></div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.activo} onChange={e => setF(v => ({ ...v, activo: e.target.checked }))} />
          Disponible en la Consulta
        </label>
        <button onClick={guardar} disabled={!cambiado || guardando} style={{ ...PRI, opacity: !cambiado || guardando ? .5 : 1 }}>
          {guardando ? 'Guardando…' : `✓ Guardar ${destino.municipio}`}
        </button>
      </div>
    </div>
  )
}
