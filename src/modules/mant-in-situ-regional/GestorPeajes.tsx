import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { FG, INP } from '../mant-in-situ/ui'
import { fmtCOP } from '../mant-in-situ/hooks/useMantInSitu'
import { SelectorBuscable } from './SelectorBuscable'
import { useInvalidarRegional, type useRegional, type SedeRegional } from './datos'

type Datos=NonNullable<ReturnType<typeof useRegional>['data']>
export function GestorPeajes({data,sede}:{data:Datos;sede:SedeRegional}) {
  const [nombre,setNombre]=useState(''),[nuevo,setNuevo]=useState(false),[valor,setValor]=useState(''),[fuente,setFuente]=useState('')
  const [seleccion,setSeleccion]=useState<string[]>([]),[buscar,setBuscar]=useState(''),[saving,setSaving]=useState(false)
  const invalidar=useInvalidarRegional()
  const hoy=new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'})
  const rutas=data.destinos.filter(d=>d.codigo!==sede.codigo)
  const pendientes=rutas.filter(d=>!d.peajes_confirmados&&(!d.peajes_ruta_verificados||data.pasos.some(s=>s.destino_codigo===d.codigo&&data.peajes.some(p=>p.nombre===s.peaje_id&&p.vigencia_hasta&&p.vigencia_hasta<hoy))))
  const peajeActual=data.peajes.find(p=>p.nombre===nombre)
  const clavesActuales=data.pasos.filter(p=>p.peaje_id===nombre).map(p=>p.destino_codigo+'/'+p.sentido)
  const sinGuardar=!!nombre&&(nuevo||Number(valor)!==Number(peajeActual?.tarifa_categoria_i)||seleccion.length!==clavesActuales.length||seleccion.some(k=>!clavesActuales.includes(k)))
  function elegir(n:string) {
    const p=data.peajes.find(p=>p.nombre===n)
    setNombre(n);setValor(String(p?.tarifa_categoria_i??''));setFuente(p?.fuente_revision??p?.fuente??'')
    setSeleccion(data.pasos.filter(p=>p.peaje_id===n).map(p=>`${p.destino_codigo}/${p.sentido}`))
  }
  async function guardar() {
    if(!nombre.trim()||!valor.trim()||!Number.isSafeInteger(Number(valor))||Number(valor)<0||!fuente.trim()){toast.error('Ingresa nombre, valor entero no negativo y fuente');return}
    if(nuevo&&data.peajes.some(p=>p.nombre.toLocaleLowerCase()===nombre.trim().toLocaleLowerCase())){toast.error('El peaje ya existe; selecciónalo en la lista');return}
    setSaving(true)
    try {
      const campos={tarifa_categoria_i:Number(valor),fuente_revision:fuente.trim(),actualizado:hoy,vigencia_hasta:null}
      const {error}=nuevo?await supabase.from('mant_regional_peajes').insert({nombre:nombre.trim(),...campos}):await supabase.from('mant_regional_peajes').update(campos).eq('nombre',nombre)
      if(error)throw error
      if(nuevo){setNuevo(false);setNombre(nombre.trim())}
      const actuales=data.pasos.filter(p=>p.peaje_id===nombre)
      const agregar=seleccion.filter(k=>!actuales.some(p=>`${p.destino_codigo}/${p.sentido}`===k))
      if(agregar.length){const {error}=await supabase.from('mant_regional_pasos').upsert(agregar.map(k=>{const [destino_codigo,sentido]=k.split('/');return {sede_id:sede.id,destino_codigo,sentido,peaje_nombre:nombre.trim()}}));if(error)throw error}
      for(const p of actuales.filter(p=>!seleccion.includes(`${p.destino_codigo}/${p.sentido}`))){const {error}=await supabase.from('mant_regional_pasos').delete().eq('sede_id',sede.id).eq('peaje_nombre',nombre).eq('destino_codigo',p.destino_codigo).eq('sentido',p.sentido);if(error)throw error}
      const afectados=[...new Set([...agregar.map(k=>k.split('/')[0]),...actuales.filter(p=>!seleccion.includes(p.destino_codigo+'/'+p.sentido)).map(p=>p.destino_codigo)])]
      if(afectados.length){const {error}=await supabase.from('mant_regional_destinos').update({peajes_ruta_verificados:false,updated_at:new Date().toISOString()}).eq('sede_id',sede.id).in('codigo',afectados);if(error)throw error}
      setNuevo(false);toast.success('Peaje y destinos guardados. Confirma las rutas pendientes después de revisarlas completas.')
    } catch {toast.error('No se completó el guardado. Revisa los datos actualizados antes de reintentar.')}
    finally {await invalidar();setSaving(false)}
  }
  async function confirmar(codigo:string) {
    setSaving(true)
    try {
      const {data:rows,error}=await supabase.from('mant_regional_destinos').update({peajes_ruta_verificados:true,revision_ruta:{pendientes:[],revision_manual:'Ruta completa confirmada manualmente desde configuración',fecha:hoy},updated_at:new Date().toISOString()}).eq('sede_id',sede.id).eq('codigo',codigo).select('codigo')
      if(error||rows?.length!==1)throw error
      await invalidar();toast.success('Ruta confirmada con sus peajes actuales')
    } catch {toast.error('No se pudo confirmar la ruta')}
    finally {setSaving(false)}
  }
  return <>
    <h3>Peajes y destinos — {sede.nombre}</h3>
    <p className="regional-note">Edita el valor de una estación y marca dónde se cobra en ida y regreso. La tarifa es común al peaje; las rutas corresponden a la sede elegida. Se conservan los otros peajes y ajustes manuales por destino.</p>
    <div className="regional-table-toolbar"><strong>{pendientes.length} rutas pendientes</strong><Button disabled={saving} variant="ghost" onClick={()=>{setNuevo(v=>!v);elegir('')}}>{nuevo?'Elegir peaje existente':'+ Agregar peaje'}</Button></div>
    <div className="regional-table-filters">
      <FG label="Peaje">{nuevo?<input style={INP} value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre de la estación"/>:<SelectorBuscable style={INP} value={nombre} onChange={e=>elegir(e.target.value)}><option value="">Selecciona un peaje</option>{data.peajes.map(p=><option key={p.nombre}>{p.nombre}</option>)}</SelectorBuscable>}</FG>
      <FG label="Valor por paso, categoría I (COP)"><input style={INP} type="number" min={0} value={valor} onChange={e=>setValor(e.target.value)}/></FG>
      <FG label="Fuente o motivo de revisión"><input style={INP} value={fuente} onChange={e=>setFuente(e.target.value)}/></FG>
    </div>
    <input style={INP} placeholder="Buscar municipio o departamento" aria-label="Filtrar destinos del peaje" value={buscar} onChange={e=>setBuscar(e.target.value)}/>
    <div className="regional-table-scroll" style={{marginTop:12}}><table className="regional-table"><thead><tr><th>Destino</th><th>Ida</th><th>Regreso</th><th>Situación</th></tr></thead><tbody>{rutas.filter(d=>`${d.municipio} ${d.departamento}`.toLocaleLowerCase().includes(buscar.toLocaleLowerCase())).map(d=><tr key={d.codigo}><td>{d.municipio}<small>{d.departamento}</small></td>{(['ida','regreso'] as const).map(s=>{const key=`${d.codigo}/${s}`;return <td key={s}><input type="checkbox" disabled={!nombre||saving} aria-label={`${d.municipio}: ${s}`} checked={seleccion.includes(key)} onChange={e=>setSeleccion(v=>e.target.checked?[...v,key]:v.filter(k=>k!==key))}/></td>})}<td>{d.peajes_confirmados?'Total manual confirmado':pendientes.includes(d)?'Pendiente de revisar':'Ruta confirmada'}</td></tr>)}</tbody></table></div>
    <Button disabled={saving||!nombre} onClick={guardar} style={{marginTop:12}}>Guardar peaje y destinos</Button>
    {sinGuardar&&<p className="regional-note">Guarda los cambios del peaje antes de confirmar una ruta completa.</p>}
    <h4 style={{margin:'24px 0 12px'}}>Rutas que necesitan revisión</h4>
    {!pendientes.length&&<p className="regional-note">No hay rutas pendientes para esta sede.</p>}
    {pendientes.map(d=><div key={d.codigo} style={{borderTop:'1px solid var(--border)',padding:'12px 0'}}><strong>{d.municipio} — {d.departamento}</strong><p className="regional-note">{d.revision_ruta?.pendientes?.map(p=>`${p.nombre}: ${p.sentido} (${p.motivo})`).join(' · ')||'Revisar tarifa o vigencia de los peajes.'}</p>{(['ida','regreso'] as const).map(s=><p className="regional-note" key={s}>{s==='ida'?'Ida':'Regreso'}: {data.pasos.filter(p=>p.destino_codigo===d.codigo&&p.sentido===s).map(p=>`${p.peaje_id} (${fmtCOP(Number(data.peajes.find(t=>t.nombre===p.peaje_id)?.tarifa_categoria_i??0))})`).join(', ')||'Sin peajes asignados'}</p>)}<label className="regional-note"><input type="checkbox" disabled={saving||sinGuardar} checked={false} onChange={()=>void confirmar(d.codigo)}/> Revisé la ruta completa y confirmo los peajes asignados de ida y regreso</label></div>)}
  </>
}
