import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { FG, INP } from '../mant-in-situ/ui'
import { fmtCOP } from '../mant-in-situ/hooks/useMantInSitu'
import { useRegional, useInvalidarRegional, type SedeRegional, type CodigoRegional, type DestinoRegional } from './datos'

export function ConfiguracionRegional({ sede }: { sede: SedeRegional }) {
  const consulta = useRegional(sede)
  const [codigo, setCodigo] = useState('')
  const [destino, setDestino] = useState('')
  const [referencia, setReferencia] = useState('')
  const [codigoEquipo, setCodigoEquipo] = useState('')
  const [saving, setSaving] = useState(false)
  const invalidar = useInvalidarRegional()
  if (consulta.isLoading) return <Spinner />
  if (!consulta.data || consulta.error) return <Card>No se pudo cargar la configuración regional.</Card>
  const data = consulta.data
  const codigoSel = data.codigos.find(c => c.codigo === codigo) ?? data.codigos[0]
  const destinoSel = data.destinos.find(d => d.codigo === destino) ?? data.destinos.find(d => d.codigo !== sede.codigo)

  async function asignar() {
    const ref = referencia.trim()
    if (!ref || !codigoEquipo) { toast.error('Ingresa referencia y código regional'); return }
    setSaving(true)
    try {
      const { data: instrumento, error: consultaError } = await supabase.from('codigos_inet').select('codigo').eq('codigo', ref).maybeSingle()
      if (consultaError) throw consultaError
      if (!instrumento) { toast.error('La referencia no existe en el catálogo de equipos'); return }
      const { error } = await supabase.from('mant_regional_referencias').upsert({ referencia: ref, codigo: codigoEquipo }, { onConflict: 'referencia' })
      if (error) throw error
      await invalidar()
      toast.success('Código asignado para todas las sedes regionales')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo asignar el código') }
    finally { setSaving(false) }
  }
  return <div style={{ display: 'grid', gap: 16 }}>
    <Card><h3>Precios base regionales — catálogo común</h3>
      <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--muted)' }}>Los servicios tienen el mismo precio base en las cinco sedes. Editar aquí actualiza todas las sedes regionales; los precios de Bogotá se mantienen independientes.</p>
      <FG label="Código de servicio"><select style={INP} value={codigoSel?.codigo ?? ''} onChange={e => setCodigo(e.target.value)}>
        {data.codigos.map(c => <option key={c.codigo}>{c.codigo}</option>)}
      </select></FG>
      {codigoSel && <Precio key={`${sede.id}-${codigoSel.codigo}-${codigoSel.precio}-${codigoSel.horas}`} codigo={codigoSel} />}
    </Card>
    <Card><h3 style={{ marginBottom: 12 }}>Asignación regional de equipos</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <FG label="Referencia"><input style={INP} value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="HI 5522" list="referencias-regionales" />
          <datalist id="referencias-regionales">{data.asignaciones.map(e => <option key={e.referencia} value={e.referencia}>{e.codigo}</option>)}</datalist>
        </FG>
        <FG label="Código regional"><select style={INP} value={codigoEquipo} onChange={e => setCodigoEquipo(e.target.value)}>
          <option value="">Seleccionar código</option>{data.codigos.map(c => <option key={c.codigo}>{c.codigo}</option>)}
        </select></FG>
      </div>
      <Button disabled={saving} onClick={asignar} style={{ marginTop: 12 }}>Guardar asignación</Button>
    </Card>
    <Card><h3 style={{ marginBottom: 12 }}>Jornada, vehículo y combustible</h3>
      <Jornada key={JSON.stringify(data.config)} sede={sede} config={data.config} />
    </Card>
    <Card><h3 style={{ marginBottom: 12 }}>Confirmación de peajes por destino</h3>
      <FG label="Destino"><select style={INP} value={destinoSel?.codigo ?? ''} onChange={e => setDestino(e.target.value)}>
        {data.destinos.filter(d => d.codigo !== sede.codigo).map(d => <option key={d.codigo} value={d.codigo}>{d.municipio} — {d.departamento}</option>)}
      </select></FG>
      {destinoSel && <Peajes key={`${destinoSel.codigo}-${destinoSel.updated_at}`} destino={destinoSel} />}
    </Card>
    <Card><h3 style={{ marginBottom: 12 }}>Peajes extraídos del HTML — referencia</h3>
      <p style={{ color: 'var(--muted)', fontSize: 12 }}>Tarifas históricas categoría I. La cercanía geográfica no confirma que el peaje esté en la ruta ni que su tarifa siga vigente. Usa una fuente revisada para confirmar cada total.</p>
      <div style={{ maxHeight: 320, overflow: 'auto', marginTop: 12 }}>
        {data.peajes.map(p => <div key={p.nombre} style={{ display: 'flex', gap: 12, justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div><strong>{p.nombre}</strong><p style={{ fontSize: 11, color: 'var(--muted)' }}>{p.sector} · {p.sentido} · {p.fuente} · {p.actualizado ?? 'Sin fecha'}</p></div>
          <span style={{ whiteSpace: 'nowrap' }}>{fmtCOP(Number(p.tarifa_categoria_i))}</span>
        </div>)}
      </div>
    </Card>
  </div>
}

function Precio({ codigo }: { codigo: CodigoRegional }) {
  const [precio, setPrecio] = useState(String(codigo.precio))
  const [horas, setHoras] = useState(String(codigo.horas))
  const [saving, setSaving] = useState(false)
  const invalidar = useInvalidarRegional()
  async function guardar() {
    if (!Number.isFinite(Number(precio)) || !Number.isFinite(Number(horas)) || Number(precio) <= 0 || Number(horas) <= 0) { toast.error('Precio y horas deben ser mayores a cero'); return }
    setSaving(true)
      const { error } = await supabase.from('mant_regional_servicios').update({ precio: Number(precio), horas: Number(horas), updated_at: new Date().toISOString() }).eq('codigo', codigo.codigo)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    await invalidar(); toast.success('Precio regional guardado')
  }
  return <div style={{ marginTop: 12 }}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    <FG label="Precio base (COP)"><input type="number" style={INP} min={1} value={precio} onChange={e => setPrecio(e.target.value)} /></FG>
    <FG label="Horas de servicio"><input type="number" style={INP} min={0.01} step="any" value={horas} onChange={e => setHoras(e.target.value)} /></FG>
  </div><Button disabled={saving} onClick={guardar} style={{ marginTop: 12 }}>Guardar precio regional común</Button></div>
}

const CAMPOS = [
  ['jornada_horas', 'Horas por jornada'], ['costo_km', 'Uso del vehículo (COP/km)'],
  ['rendimiento_km_galon', 'Rendimiento (km/galón)'], ['precio_galon', 'Combustible (COP/galón)'],
  ['margen_recorrido_pct', 'Margen de recorrido (%)'],
] as const

function Jornada({ sede, config }: { sede: SedeRegional, config: NonNullable<ReturnType<typeof useRegional>['data']>['config'] }) {
  const [valores, setValores] = useState(Object.fromEntries(CAMPOS.map(([campo]) => [campo, String(config[campo])])))
  const [saving, setSaving] = useState(false)
  const invalidar = useInvalidarRegional()
  async function guardar() {
    const datos = Object.fromEntries(CAMPOS.map(([campo]) => [campo, Number(valores[campo])]))
    if (CAMPOS.some(([c]) => !valores[c].trim() || !Number.isFinite(datos[c]) || datos[c] < 0) || datos.jornada_horas <= 0 || datos.rendimiento_km_galon <= 0) { toast.error('Revisa los valores de jornada y vehículo'); return }
    setSaving(true)
    const { error } = await supabase.from('mant_regional_config').update({ ...datos, updated_at: new Date().toISOString() }).eq('sede_id', sede.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    await invalidar(); toast.success('Configuración regional guardada')
  }
  return <><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{CAMPOS.map(([campo, label]) => <FG key={campo} label={label}>
    <input type="number" min={0} step="any" style={INP} value={valores[campo]} onChange={e => setValores(v => ({ ...v, [campo]: e.target.value }))} />
  </FG>)}</div><Button disabled={saving} onClick={guardar} style={{ marginTop: 12 }}>Guardar jornada y vehículo</Button></>
}

function Peajes({ destino }: { destino: DestinoRegional }) {
  const [total, setTotal] = useState(destino.peaje_manual_valor == null ? '' : String(destino.peaje_manual_valor))
  const [motivo, setMotivo] = useState(destino.peaje_manual_motivo ?? '')
  const [confirmado, setConfirmado] = useState(destino.peajes_confirmados)
  const [saving, setSaving] = useState(false)
  const invalidar = useInvalidarRegional()
  async function guardar() {
    if ((total.trim() && (!Number.isFinite(Number(total)) || Number(total) < 0)) || (confirmado && (!total.trim() || !motivo.trim()))) { toast.error('Para confirmar, ingresa el total (0 si no hay cobro) y la fuente o motivo'); return }
    setSaving(true)
    const { error } = await supabase.from('mant_regional_destinos').update({ peaje_manual_valor: total.trim() ? Number(total) : null,
      peaje_manual_motivo: motivo.trim() || null, peajes_confirmados: confirmado, updated_at: new Date().toISOString() }).eq('sede_id', destino.sede_id).eq('codigo', destino.codigo)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    await invalidar(); toast.success('Peajes regionales guardados')
  }
  return <div style={{ marginTop: 12 }}>
    <FG label="Total de peajes por visita, ida y regreso (COP)"><input type="number" min={0} style={INP} value={total} onChange={e => { setTotal(e.target.value); setConfirmado(false) }} /></FG>
    <div style={{ marginTop: 12 }}><FG label="Fuente, fecha de revisión y motivo"><textarea style={INP} value={motivo} onChange={e => { setMotivo(e.target.value); setConfirmado(false) }} /></FG></div>
    <label style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 13 }}><input type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} /> Confirmé los peajes de esta ruta en ambos sentidos</label>
    <Button disabled={saving} onClick={guardar} style={{ marginTop: 12 }}>Guardar peajes</Button>
  </div>
}
