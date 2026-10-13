import { GestorPeajes } from './GestorPeajes'
import { useUser } from '../../hooks/useUser'
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
import { useRegional, useInvalidarRegional, type SedeRegional, type CodigoRegional } from './datos'

export function ConfiguracionRegional({ sede }: { sede: SedeRegional }) {
  const consulta = useRegional(sede)
  const {hasCapability,hasModule}=useUser()
  const puedeCrear=hasModule('codigos')&&(['editar_codigos','gestion_codigos','importar_csv_codigos'] as const).some(hasCapability)
  const [nueva,setNueva]=useState(false),[nombreEquipo,setNombreEquipo]=useState(''),[familiaEquipo,setFamiliaEquipo]=useState('')
  const [panel,setPanel]=useState('equipos')
  const [codigo, setCodigo] = useState('')
  const [referencia, setReferencia] = useState('')
  const [codigoEquipo, setCodigoEquipo] = useState('')
  const [saving, setSaving] = useState(false)
  const invalidar = useInvalidarRegional()
  if (consulta.isLoading) return <Spinner />
  if (!consulta.data || consulta.error) return <Card style={{overflow: 'visible'}}>No se pudo cargar la configuración regional.</Card>
  const data = consulta.data
  const codigoSel = data.codigos.find(c => c.codigo === codigo) ?? data.codigos[0]

  async function asignar() {
    const ref = referencia.trim().toUpperCase().replace(/\s+/g,' ')
    if (!ref || !codigoEquipo) { toast.error('Ingresa referencia y código regional'); return }
    setSaving(true)
    try {
      const { data: instrumento, error: consultaError } = await supabase.from('codigos_inet').select('codigo').eq('codigo', ref).maybeSingle()
      if (consultaError) throw consultaError
      if (!instrumento) {
        if (!nueva || !puedeCrear) { toast.error('La referencia no existe. Usa Agregar referencia para crearla con permiso de edición de Códigos.'); return }
        if (!nombreEquipo.trim() || !familiaEquipo.trim()) { toast.error('Ingresa el nombre y la familia del equipo'); return }
        const {error:crearError}=await supabase.from('codigos_inet').insert({codigo:ref,descripcion:nombreEquipo.trim(),familia:familiaEquipo.trim()})
        if (crearError) throw crearError
        setNueva(false)
      } else if (nueva) { toast.error('Esta referencia ya existe. Puedes asignarla usando Editar asignación.'); return }
      const { error } = await supabase.from('mant_regional_referencias').upsert({ referencia: ref, codigo: codigoEquipo }, { onConflict: 'referencia' })
      if (error) throw error
      await invalidar()
      toast.success(nueva?'Referencia creada y asignada a todas las sedes regionales':'Código asignado para todas las sedes regionales')
      setNueva(false);setNombreEquipo('');setFamiliaEquipo('')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo asignar el código') }
    finally { setSaving(false) }
  }
  return <div className="regional-config-layout"><Card style={{overflow: 'visible'}}><nav className="regional-config-nav" aria-label="Configuración regional">{[['equipos','Equipos y servicios'],['precios','Precios base'],['jornada','Jornada y vehículo'],['destinos','Peajes por destino'],['tarifas','Tarifas de peajes']].map(([key,label])=><button key={key} aria-pressed={panel===key} onClick={()=>setPanel(key)}>{label}</button>)}<p>Edita en pantalla o importa los peajes por CSV con vista previa. Los precios base son comunes a las cinco sedes.</p></nav></Card><div className="regional-config-content">
    {panel==='precios' && <Card style={{overflow: 'visible'}}><h3>Precios base regionales — catálogo común</h3>
      <p style={{ margin: '10px 0', fontSize: 12, color: 'var(--muted)' }}>Los servicios tienen el mismo precio base en las cinco sedes. Editar aquí actualiza todas las sedes regionales; los precios de Bogotá se mantienen independientes.</p>
      <FG label="Código de servicio"><SelectorBuscable style={INP} value={codigoSel?.codigo ?? ''} onChange={e => setCodigo(e.target.value)}>
        {data.codigos.map(c => <option key={c.codigo}>{c.codigo}</option>)}
      </SelectorBuscable></FG>
      {codigoSel && <Precio key={`${sede.id}-${codigoSel.codigo}-${codigoSel.precio}-${codigoSel.horas}`} codigo={codigoSel} />}
    </Card>}
    {panel==='equipos' && <Card style={{overflow: 'visible'}}><h3 style={{ marginBottom: 12 }}>Equipos y servicios</h3>
      <EquiposRegionalesPanel data={data} onEditar={(ref,cod)=>{setNueva(false);setReferencia(ref);setCodigoEquipo(cod)}} />
      <div style={{display:'flex',gap:12,alignItems:'center',margin:'20px 0 12px'}}><h4>{nueva?'Agregar nueva referencia':'Editar asignación de equipo'}</h4>{puedeCrear&&<Button variant="ghost" onClick={()=>{setNueva(v=>!v);setReferencia('');setCodigoEquipo('')}}>{nueva?'Volver a asignación':'+ Agregar referencia'}</Button>}</div>
      {nueva && <><p style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>La referencia se agrega al catálogo de Códigos y al regional con el servicio seleccionado. El precio base y las horas se toman de ese servicio.</p><div className="regional-table-filters"><FG label="Nombre del equipo"><input style={INP} value={nombreEquipo} onChange={e=>setNombreEquipo(e.target.value)}/></FG><FG label="Familia"><input style={INP} value={familiaEquipo} onChange={e=>setFamiliaEquipo(e.target.value)} list="familias-nuevas-regionales"/><datalist id="familias-nuevas-regionales">{[...new Set(data.equipos.map(e=>e.familia))].filter(Boolean).map(f=><option key={f}>{f}</option>)}</datalist></FG></div></>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <FG label="Referencia"><input style={INP} value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="HI 5221-01" list="referencias-regionales" />
          <datalist id="referencias-regionales">{data.asignaciones.map(e => <option key={e.referencia} value={e.referencia}>{e.codigo}</option>)}</datalist>
        </FG>
        <FG label="Código regional"><SelectorBuscable style={INP} value={codigoEquipo} onChange={e => setCodigoEquipo(e.target.value)}>
          <option value="">Seleccionar código</option>{data.codigos.map(c => <option key={c.codigo}>{c.codigo}</option>)}
        </SelectorBuscable></FG>
      </div>
      <Button disabled={saving} onClick={asignar} style={{ marginTop: 12 }}>{nueva?'Crear referencia y asignar servicio':'Guardar asignación'}</Button>
    </Card>}
    {panel==='jornada' && <Card style={{overflow: 'visible'}}><h3 style={{ marginBottom: 12 }}>Jornada, vehículo y combustible</h3>
      <Jornada key={JSON.stringify(data.config)} sede={sede} config={data.config} />
    </Card>}
    {panel==='destinos' && <><Card style={{overflow:'visible'}}><GestorPeajes key={sede.id} data={data} sede={sede}/></Card>
    <Card style={{overflow: 'visible'}}><h3 style={{ marginBottom: 12 }}>Actualizar peajes mediante CSV</h3>
      <p style={{ marginBottom: 12 }}>Descarga los destinos de {sede.nombre}, completa el total de ida y regreso y la fuente. Solo se importan filas con un total informado; 0 confirma una ruta sin cobro.</p>
      <Button onClick={() => descargarCSV('peajes-regionales-'+sede.id,['sede','codigo_destino','municipio','total_peajes_cop','fuente'],data.destinos.filter(d=>d.codigo!==sede.codigo).map(d=>[sede.id,d.codigo,d.municipio,d.peajes_confirmados?d.peaje_manual_valor:null,d.peaje_manual_motivo]))}>Descargar plantilla con destinos</Button>
      <ImportarPeajes sede={sede} destinos={data.destinos} />
    </Card></>}
    {panel==='tarifas' && <Card style={{overflow:'visible'}}><GestorPeajes key={sede.id} data={data} sede={sede}/></Card>}
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
