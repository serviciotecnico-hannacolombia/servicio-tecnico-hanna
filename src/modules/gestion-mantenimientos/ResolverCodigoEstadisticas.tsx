import {usePermisosInSitu} from './usePermisosInSitu'
import {useState} from 'react'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {toast} from './toastGestion'
import {useUser} from '../../hooks/useUser'
import {supabase,fetchAllRows} from '../../lib/supabase'
import {Modal} from '../../components/ui/Modal'
import {Button} from './uiGestion'
import {INP} from '../mant-in-situ/ui'
import {editarIntervencion} from './almacenIntervenciones'
import {normalizar,type Intervencion} from './intervenciones'
import type {CodigoEstadistica} from './estadisticas'
export const CLAVE_CODIGOS_PREVIEW='hanna-codigos-estadisticas-preview-v1'
export function ResolverCodigoEstadisticas({registro,catalogo,onClose,onSaved}:{registro:Intervencion;catalogo:CodigoEstadistica[];onClose:()=>void;onSaved:()=>Promise<void>}) {
 const {user,displayName,hasModule,hasCapability}=useUser(),acceso=usePermisosInSitu(),qc=useQueryClient()
 const [referencia,setReferencia]=useState(registro.referencia),[codigo,setCodigo]=useState(''),[ocupado,setOcupado]=useState(false),[buscar,setBuscar]=useState('')
 const referencias=catalogo.filter(c=>normalizar(c.codigo+' '+(c.codigo_mantenimiento_insitu??'')).includes(normalizar(buscar))).slice(0,30)
 const equipo=catalogo.find(c=>normalizar(c.codigo)===normalizar(referencia))
 const asignado=equipo?.codigo_mantenimiento_insitu??''
 const puedeAsignar=acceso.permisos.catalogo_editar&&hasModule('mant_in_situ')&&hasCapability('mant_in_situ_editar')
 const opciones=useQuery({queryKey:['estadisticas-codigos-disponibles',user?.id],enabled:!!user,queryFn:()=>fetchAllRows<{codigo:string;horas:number;precio:number}>('mant_in_situ_codigos',q=>q.order('codigo'))})
 async function guardar(e:React.FormEvent) {
  e.preventDefault();if(!user||ocupado)return
  if(!equipo){toast.error('Selecciona una referencia existente en el catálogo.');return}
  if(!codigo&&!asignado){toast.error('Selecciona un código para la referencia o una referencia que ya lo tenga asignado.');return}
  setOcupado(true)
  try {
   if(codigo&&codigo!==asignado){
    if(!puedeAsignar)throw Error('Se requiere permiso para configurar Mantenimiento in situ.')
    if(import.meta.env.DEV){const prev=JSON.parse(localStorage.getItem(CLAVE_CODIGOS_PREVIEW)??'{}');localStorage.setItem(CLAVE_CODIGOS_PREVIEW,JSON.stringify({...prev,[equipo.codigo]:codigo}))}
    else {const {data,error}=await supabase.rpc('gestion_asignar_codigo_in_situ',{p_referencias:[equipo.codigo],p_codigo:codigo});if(error)throw Error(error.message);if(!data)throw Error('No se actualizó la asignación. Recarga y vuelve a intentar.')}
   }
   if(equipo.codigo!==registro.referencia)await editarIntervencion({...registro,referencia:equipo.codigo},user.id,displayName||user.email||user.id)
   await qc.invalidateQueries({queryKey:['estadisticas-catalogo-in-situ']})
   for(const clave of ['mant_in_situ_codigos_inet','mant_in_situ_equipos','codigos-inet'])await qc.invalidateQueries({queryKey:[clave]})
   await onSaved();toast.success(import.meta.env.DEV?'Corrección guardada en la vista local':'Código actualizado');onClose()
  }catch(error){toast.error((error as Error).message)}finally{setOcupado(false)}
 }
 return <Modal open title={'Resolver código · '+registro.referencia} onClose={()=>{if(!ocupado)onClose()}} width={760}><form className="gestion-form" onSubmit={guardar}>
  <p>SN {registro.serial||'Sin serial'} · {registro.cliente} · {registro.fecha}</p>
  <label>Buscar una referencia en el catálogo<input style={INP} value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Referencia o código asignado"/></label>
  <label>Referencia del equipo<input style={INP} list="referencias-resolver-codigo" value={referencia} onChange={e=>{setReferencia(e.target.value);setCodigo('')}}/><datalist id="referencias-resolver-codigo">{referencias.map(c=><option key={c.codigo} value={c.codigo}>{c.codigo_mantenimiento_insitu||'Sin código asignado'}</option>)}</datalist></label>
  {!equipo?<p role="status" className="reporte-ayuda">Esta referencia no está en el catálogo. Busca y selecciona la referencia correcta del equipo para vincular su código.</p>:<p>Código asignado actualmente: <strong>{asignado||'Sin asignación'}</strong></p>}
  <label>Código de mantenimiento in situ<select style={INP} value={codigo} disabled={!equipo||!puedeAsignar||opciones.isLoading||!!opciones.error} onChange={e=>setCodigo(e.target.value)}><option value="">{asignado?'Conservar '+asignado:'Seleccionar código'}</option>{(opciones.data??[]).map(c=><option key={c.codigo} value={c.codigo}>{c.codigo}</option>)}</select></label>
  {!puedeAsignar&&<p className="reporte-ayuda">Puedes corregir la referencia del registro. Cambiar el código compartido requiere la casilla Asignar códigos de Gestión y el permiso de configuración de Mantenimiento in situ.</p>}
  {opciones.error&&<p role="alert">No se pudieron cargar los códigos disponibles.</p>}
  <p className="reporte-ayuda">Corregir la referencia modifica esta intervención. Asignar un código al catálogo afecta a esa referencia y actualizará sus estadísticas.</p>
  {import.meta.env.DEV&&<p className="gestion-preview">Vista local: esta corrección no modifica el catálogo compartido en Supabase.</p>}
  <Button type="submit" disabled={ocupado||!equipo||(!codigo&&!asignado)}>{ocupado?'Guardando…':'Guardar corrección'}</Button>
 </form></Modal>
}
