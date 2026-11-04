import {useState} from 'react'
import {useSearchParams} from 'react-router-dom'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {useUser} from '../../hooks/useUser'
import {supabase,fetchAllRows} from '../../lib/supabase'
import {usePermisosInSitu} from './usePermisosInSitu'
import {Header,Card,Button} from './uiGestion'
import {Modal} from '../../components/ui/Modal'
import {INP} from '../mant-in-situ/ui'
import {toast} from './toastGestion'

type Observacion={id:string;otst:string;tecnico?:string;periodo?:string;observaciones:string}
const local=import.meta.env.DEV
function leerLocal(clave:string):Observacion[]{
 const datos=JSON.parse(localStorage.getItem(clave)??'[]')
 if(!Array.isArray(datos))throw Error('No se pudieron leer las novedades locales.')
 return datos
}

export function ObservacionesST(){
 const [params, setParams] = useSearchParams()
 const vencidas = params.get('vista') === 'vencidas'
 const actual = new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'}).slice(0,7)
 const solicitado = params.get('mes') ?? ''
 const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(solicitado) ? solicitado : actual
 const {permisos} = usePermisosInSitu()
 if (!permisos.observaciones_ver && !permisos.observaciones_crear) return <Card>No tienes acceso a Novedades OTST.</Card>
 return <div className="gestion-page">
  <Header title="Novedades OTST" subtitle="Notas de servicio y justificaciones mensuales de órdenes vencidas."/>
  <nav className="gestion-toolbar" aria-label="Tipo de novedad">
   <Button aria-pressed={!vencidas} variant={vencidas?'ghost':'primary'} onClick={()=>setParams({})}>Novedades generales</Button>
   <Button aria-pressed={vencidas} variant={vencidas?'primary':'ghost'} onClick={()=>setParams({vista:'vencidas',mes})}>Vencidas justificadas</Button>
  </nav>
  {vencidas && <label>Mes del reporte<input type="month" style={INP} value={mes} onChange={e=>{if(e.target.value)setParams({vista:'vencidas',mes:e.target.value})}}/></label>}
  <RegistroOTST key={vencidas?mes:'generales'} periodo={vencidas?mes:null}/>
 </div>
}

function RegistroOTST({periodo}:{periodo:string|null}){
 const tabla = periodo ? 'gestion_otst_vencidas_justificadas' : 'gestion_observaciones_st'
 const {user}=useUser(),{permisos}=usePermisosInSitu(),qc=useQueryClient()
 const clave = periodo ? 'hanna-vencidas-v1:'+user?.id+':'+periodo : 'hanna-observaciones-st-v1:'+user?.id
 const key=['observaciones-st',user?.id,periodo]
 const consulta=useQuery({queryKey:key,enabled:!!user&&permisos.observaciones_ver,queryFn:async()=>{
  if(local)return leerLocal(clave)
  return fetchAllRows<Observacion>(tabla,q=>(periodo?q.eq('periodo',periodo+'-01'):q).order('created_at',{ascending:false}).order('id'))
 }})
 const [otst,setOtst]=useState(''),[tecnico,setTecnico]=useState(''),[observaciones,setObservaciones]=useState('')
 const [buscar,setBuscar]=useState(''),[pagina,setPagina]=useState(1),[ocupado,setOcupado]=useState(false),[eliminar,setEliminar]=useState<Observacion|null>(null)
 const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 const filas=(consulta.data??[]).filter(r=>norm([r.otst,r.tecnico,r.observaciones].join(' ')).includes(norm(buscar)))
 const paginas=Math.max(1,Math.ceil(filas.length/25)),actual=Math.min(pagina,paginas)
 async function guardar(e:React.FormEvent){
  e.preventDefault()
  if(!user||!permisos.observaciones_crear||ocupado)return
  if(!/^\d{1,20}$/.test(otst.trim())||(!periodo&&!tecnico.trim())||!observaciones.trim()){toast.error(periodo?'Completa la OTST numérica y la observación.':'Completa la OTST numérica, el técnico y las observaciones.');return}
  setOcupado(true)
  try{
   const r:Observacion={id:crypto.randomUUID(),otst:otst.trim(),...(periodo?{periodo:periodo+'-01'}:{tecnico:tecnico.trim()}),observaciones:observaciones.trim()}
   if(local)localStorage.setItem(clave,JSON.stringify([r,...leerLocal(clave)]))
   else {const {error}=await supabase.from(tabla).insert(r);if(error)throw error}
   setOtst('');setTecnico('');setObservaciones('');await qc.invalidateQueries({queryKey:key});toast.success('Observación registrada')
  }catch(e){toast.error((e as Error).message)}finally{setOcupado(false)}
 }
 async function borrar(){
  if(!user||!eliminar||ocupado||!permisos.administrar_observaciones_st)return
  setOcupado(true)
  try{
   if(local)localStorage.setItem(clave,JSON.stringify(leerLocal(clave).filter(r=>r.id!==eliminar.id)))
   else {const {data,error}=await supabase.from(tabla).delete().eq('id',eliminar.id).select('id');if(error)throw error;if(!data?.length)throw Error('No se eliminó el registro. Verifica el permiso o actualiza la lista.')}
   setEliminar(null);await qc.invalidateQueries({queryKey:key});toast.success('Observación eliminada')
  }catch(e){toast.error((e as Error).message)}finally{setOcupado(false)}
 }
 async function exportar(){
  if(!permisos.observaciones_ver||!permisos.exportar)return
  try{
   if(!local){const {data,error}=await supabase.rpc('intervenciones_mis_permisos');if(error||!data?.observaciones_ver||!data?.exportar)throw Error('No tienes permiso para exportar.')}
   const hoja=XLSX.utils.aoa_to_sheet([periodo?['OTST','Observación']:['OTST','Técnico a cargo','Observaciones'],...filas.map(r=>periodo?[r.otst,r.observaciones]:[r.otst,r.tecnico,r.observaciones])])
   hoja['!cols']=periodo?[{wch:16},{wch:90}]:[{wch:16},{wch:30},{wch:90}]
   const libro=XLSX.utils.book_new();XLSX.utils.book_append_sheet(libro,hoja,periodo?'Vencidas justificadas':'Novedades OTST')
   XLSX.writeFile(libro,periodo?'vencidas-justificadas-'+periodo+'.xlsx':'novedades-otst.xlsx')
  }catch(e){toast.error((e as Error).message)}
 }
 if(!permisos.observaciones_ver&&!permisos.observaciones_crear)return <Card>No tienes permiso para consultar observaciones.</Card>
 return <div className="gestion-page">
 {local&&<p className="gestion-preview">Vista previa local: los registros se guardan sólo en este navegador y usuario. Exporta un respaldo para conservarlos.</p>}
 {permisos.observaciones_crear&&<Card><form className="gestion-form" onSubmit={guardar}><div className="gestion-toolbar"><label># de OTST<input style={INP} inputMode="numeric" pattern="[0-9]{1,20}" required maxLength={20} value={otst} onChange={e=>setOtst(e.target.value)}/></label>{!periodo&&<label>Técnico a cargo<input style={INP} required maxLength={160} value={tecnico} onChange={e=>setTecnico(e.target.value)}/></label>}</div><label>Observaciones<textarea style={INP} rows={3} required maxLength={5000} value={observaciones} onChange={e=>setObservaciones(e.target.value)}/></label><Button type="submit" disabled={ocupado}>Registrar observación</Button></form></Card>}
 {permisos.observaciones_ver&&<Card><div className="gestion-toolbar"><label>Buscar<input style={INP} placeholder={periodo?"OTST u observación":"OTST, técnico u observación"} value={buscar} onChange={e=>{setBuscar(e.target.value);setPagina(1)}}/></label>{permisos.exportar&&<Button variant="ghost" onClick={exportar} disabled={!filas.length||!!consulta.error}>Exportar Excel</Button>}</div>
 {consulta.isLoading?<p role="status">Cargando observaciones…</p>:consulta.error?<p role="alert">No se pudieron cargar las observaciones. Verifica la instalación del SQL y los permisos. <Button onClick={()=>consulta.refetch()}>Reintentar</Button></p>:<><div className="gestion-table-scroll"><table className="gestion-table"><thead><tr><th>OTST</th>{!periodo&&<th>Técnico a cargo</th>}<th>Observaciones</th>{permisos.administrar_observaciones_st&&<th>Acciones</th>}</tr></thead><tbody>{filas.slice((actual-1)*25,actual*25).map(r=><tr key={r.id}><td>{r.otst}</td>{!periodo&&<td>{r.tecnico}</td>}<td style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{r.observaciones}</td>{permisos.administrar_observaciones_st&&<td><Button variant="ghost" onClick={()=>setEliminar(r)}>Eliminar</Button></td>}</tr>)}</tbody></table></div>{!filas.length&&<p className="gestion-empty">No hay observaciones con estos filtros.</p>}<div className="gestion-toolbar"><Button disabled={actual===1} onClick={()=>setPagina(actual-1)}>Anterior</Button><span>{filas.length} registros · {actual} / {paginas}</span><Button disabled={actual===paginas} onClick={()=>setPagina(actual+1)}>Siguiente</Button></div></>}
 </Card>}{permisos.observaciones_ver&&permisos.administrar_observaciones_st&&eliminar&&<Modal open title="Eliminar observación" onClose={()=>{if(!ocupado)setEliminar(null)}}><p>¿Eliminar la observación de la OTST {eliminar.otst}{periodo?' del mes '+periodo:', a cargo de '+eliminar.tecnico}? Esta acción no se puede deshacer.</p><Button variant="ghost" disabled={ocupado} onClick={()=>setEliminar(null)}>Cancelar</Button><Button disabled={ocupado||!permisos.administrar_observaciones_st} onClick={borrar}>Eliminar observación</Button></Modal>}</div>
}
