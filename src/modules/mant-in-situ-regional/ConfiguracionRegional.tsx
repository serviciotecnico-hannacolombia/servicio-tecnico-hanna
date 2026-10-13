import { SelectorBuscable } from './SelectorBuscable'
import { useState } from 'react'
import { descargarCSV } from '../mant-in-situ/csv'
import { ImportarPeajes } from './ImportarPeajes'
import { EquiposRegionalesPanel } from './EquiposRegionalesPanel'
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
  const [panel,setPanel]=useState('equipos')
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
  return <div className="regional-config-layout"><Card><nav className="regional-config-nav" aria-label="Configuración regional">{[['equipos','Equipos y servicios'],['precios','Precios base'],['jornada','Jornada y vehículo'],['destinos','Peajes por destino'],['tarifas','Tarifas de peajes']].map(([key,label])=><button key={key} aria-pressed={panel===key} onClick={()=>setPanel(key)}>{label}</button>)}<p>Edita en pantalla o importa los peajes por CSV con vista previa. Los precios base son comunes a las cinco sedes.</p></nav></Card><div className="regional-config-content">
    {panel==='precios' && <Card><h3>Precios base regionales — catálogo común</h3>
      <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--muted)' }}>Los servicios tienen el mismo precio base en las cinco sedes. Editar aquí actualiza todas las sedes regionales; los precios de Bogotá se mantienen independientes.</p>
      <FG label="Código de servicio"><SelectorBuscable style={INP} value={codigoSel?.codigo ?? ''} onChange={e => setCodigo(e.target.value)}>
        {data.codigos.map(c => <option key={c.codigo}>{c.codigo}</option>)}
      </SelectorBuscable></FG>
      {codigoSel && <Precio key={`${sede.id}-${codigoSel.codigo}-${codigoSel.precio}-${codigoSel.horas}`} codigo={codigoSel} />}
    </Card>}
    {panel==='equipos' && <Card><h3 style={{ marginBottom: 12 }}>Equipos y servicios</h3>
      <EquiposRegionalesPanel data={data} onEditar={(ref,cod)=>{setReferencia(ref);setCodigoEquipo(cod)}} />
      <h4 style={{margin:'20px 0 12px'}}>Editar asignación de equipo</h4>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <FG label="Referencia"><input style={INP} value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="HI 5522" list="referencias-regionales" />
          <datalist id="referencias-regionales">{data.asignaciones.map(e => <option key={e.referencia} value={e.referencia}>{e.codigo}</option>)}</datalist>
        </FG>
        <FG label="Código regional"><SelectorBuscable style={INP} value={codigoEquipo} onChange={e => setCodigoEquipo(e.target.value)}>
          <option value="">Seleccionar código</option>{data.codigos.map(c => <option key={c.codigo}>{c.codigo}</option>)}
        </SelectorBuscable></FG>
      </div>
      <Button disabled={saving} onClick={asignar} style={{ marginTop: 12 }}>Guardar asignación</Button>
    </Card>}
    {panel==='jornada' && <Card><h3 style={{ marginBottom: 12 }}>Jornada, vehículo y combustible</h3>
      <Jornada key={JSON.stringify(data.config)} sede={sede} config={data.config} />
    </Card>}
    {panel==='destinos' && <><Card><h3 style={{ marginBottom: 12 }}>Peajes por ruta y ajustes manuales</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Los peajes se calculan por la ruta precalculada de ida y regreso. Un total manual confirmado reemplaza ese cálculo, sin sumarlo dos veces.</p>
      <FG label="Destino"><SelectorBuscable style={INP} value={destinoSel?.codigo ?? ''} onChange={e => setDestino(e.target.value)}>
        {data.destinos.filter(d => d.codigo !== sede.codigo).map(d => <option key={d.codigo} value={d.codigo}>{d.municipio} — {d.departamento}</option>)}
      </SelectorBuscable></FG>
      {destinoSel && <Peajes key={`${destinoSel.codigo}-${destinoSel.updated_at}`} destino={destinoSel} />}
    </Card>
    <Card><h3 style={{ marginBottom: 12 }}>Actualizar peajes mediante CSV</h3>
      <p style={{ marginBottom: 12 }}>Descarga los destinos de {sede.nombre}, completa el total de ida y regreso y la fuente. Solo se importan filas con un total informado; 0 confirma una ruta sin cobro.</p>
      <Button onClick={() => descargarCSV('peajes-regionales-'+sede.id,['sede','codigo_destino','municipio','total_peajes_cop','fuente'],data.destinos.filter(d=>d.codigo!==sede.codigo).map(d=>[sede.id,d.codigo,d.municipio,d.peajes_confirmados?d.peaje_manual_valor:null,d.peaje_manual_motivo]))}>Descargar plantilla con destinos</Button>
      <ImportarPeajes sede={sede} destinos={data.destinos} />
    </Card></>}
    {panel==='tarifas' && <Card><h3 style={{ marginBottom: 12 }}>Tarifas de peajes del HTML — referencia</h3>
      <EditarTarifa peajes={data.peajes} />
      <p style={{ color: 'var(--muted)', fontSize: 12 }}>Tarifas históricas categoría I. La cercanía geográfica no confirma que el peaje esté en la ruta ni que su tarifa siga vigente. Usa una fuente revisada para confirmar cada total.</p>
      <div style={{ maxHeight: 320, overflow: 'auto', marginTop: 12 }}>
        {data.peajes.map(p => <div key={p.nombre} style={{ display: 'flex', gap: 12, justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div><strong>{p.nombre}</strong><p style={{ fontSize: 11, color: 'var(--muted)' }}>{p.sector} · {p.sentido} · {p.fuente} · {p.actualizado ?? 'Sin fecha'}</p></div>
          <span style={{ whiteSpace: 'nowrap' }}>{fmtCOP(Number(p.tarifa_categoria_i))}</span>
        </div>)}
      </div>
    </Card>}
  </div></div>
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
  ['recargo_km_adicional','Valor adicional por km que exceda 60 km (COP/km)'],
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

function EditarTarifa({peajes}:{peajes:NonNullable<ReturnType<typeof useRegional>['data']>['peajes']}) {
  const [nombre,setNombre]=useState(''),[valor,setValor]=useState(''),[fuente,setFuente]=useState(''),[saving,setSaving]=useState(false)
  const invalidar=useInvalidarRegional()
  async function guardar() {
    if(!nombre||!valor.trim()||!Number.isFinite(Number(valor))||Number(valor)<0||!fuente.trim()){toast.error('Selecciona un peaje, precio válido y fuente');return}
    setSaving(true)
    const {data,error}=await supabase.from('mant_regional_peajes').update({tarifa_categoria_i:Number(valor),fuente_revision:fuente.trim(),actualizado:new Date().toISOString().slice(0,10),vigencia_hasta:null}).eq('nombre',nombre).select('nombre')
    setSaving(false)
    if(error||data?.length!==1){toast.error('No se pudo guardar la tarifa');return}
    await invalidar();toast.success('Tarifa regional actualizada')
  }
  return <div className="regional-table-filters"><FG label="Peaje"><SelectorBuscable style={INP} value={nombre} onChange={e=>{const p=peajes.find(p=>p.nombre===e.target.value);setNombre(e.target.value);setValor(String(p?.tarifa_categoria_i??''));setFuente(p?.fuente_revision??p?.fuente??'')}}><option value="">Selecciona un peaje</option>{peajes.map(p=><option key={p.nombre}>{p.nombre}</option>)}</SelectorBuscable></FG><FG label="Tarifa categoría I (COP)"><input style={INP} type="number" min={0} value={valor} onChange={e=>setValor(e.target.value)}/></FG><FG label="Fuente de revisión"><input style={INP} value={fuente} onChange={e=>setFuente(e.target.value)}/></FG><Button disabled={saving} onClick={guardar}>Guardar tarifa</Button></div>
}
