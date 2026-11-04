import {useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {toast} from './toastGestion'
import {useUser} from '../../hooks/useUser'
import {Modal} from '../../components/ui/Modal'
import {Button} from './uiGestion'
import {INP} from '../mant-in-situ/ui'
import {usePermisosInSitu} from './usePermisosInSitu'
import {crearOportunidad} from './almacenOportunidades'
import {SelectorOrigenOportunidad} from './SelectorOrigenOportunidad'
import type {DatosOrigenOportunidad,Oportunidad} from './oportunidades'
import type {Intervencion} from './intervenciones'
export function NuevaOportunidadInSitu({registro,onClose,onCreated}:{registro?:Intervencion;onClose:()=>void;onCreated?:(o:Oportunidad)=>void}){
 const {user,displayName}=useUser(),permiso=usePermisosInSitu(),qc=useQueryClient(),[id]=useState(crypto.randomUUID()),[titulo,setTitulo]=useState(''),[necesidad,setNecesidad]=useState(''),[asesor,setAsesor]=useState(registro?.asesor??''),[ocupado,setOcupado]=useState(false)
 const [os,setOs]=useState(''),[numero,setNumero]=useState(''),[origen,setOrigen]=useState<DatosOrigenOportunidad>({intervencion_id:registro?.id??null,cliente:registro?.cliente??'',referencia:registro?.referencia??'',serial:registro?.serial??'',tipo_origen:registro?.tipo??''})
 async function guardar(e:React.FormEvent){e.preventDefault();if(ocupado||!user||!permiso.permisos.oportunidades_crear)return;setOcupado(true);try{const r=await crearOportunidad({id,...origen,os,numero_oportunidad:numero,titulo,necesidad,asesor},user.id,displayName||user.email||user.id);await qc.invalidateQueries({queryKey:['oportunidades-in-situ']});toast.success('Oportunidad creada. Ya puedes registrar cotización, monto o rechazo.');onClose();onCreated?.(r)}catch(error){toast.error((error as Error).message)}finally{setOcupado(false)}}
 return <Modal open title="Nueva oportunidad de negocio" onClose={()=>{if(!ocupado)onClose()}} width={850}><form className="gestion-form" onSubmit={guardar}><div className="reporte-campos"><label>OS · cuatro cifras<input style={INP} required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="Ej. 0042" value={os} onChange={e=>setOs(e.target.value)}/></label><label>Número de oportunidad<input style={INP} required maxLength={100} value={numero} onChange={e=>setNumero(e.target.value)}/></label></div><SelectorOrigenOportunidad datos={origen} onChange={setOrigen} ocupado={ocupado}/><label>Oportunidad detectada<input style={INP} required minLength={3} maxLength={200} value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ej. Reemplazo de electrodo"/></label><label>Necesidad y lo que debe cotizarse<textarea style={INP} required minLength={10} maxLength={3000} rows={3} value={necesidad} onChange={e=>setNecesidad(e.target.value)}/></label><label>Asesor responsable<input style={INP} required maxLength={200} value={asesor} onChange={e=>setAsesor(e.target.value)}/></label><p className="reporte-ayuda">La cotización se crea en la intranet principal de HANNA. Aquí registras su número y el seguimiento; también puedes rechazar la oportunidad antes de cotizar.</p><Button type="submit" disabled={ocupado||!permiso.permisos.oportunidades_crear}>{ocupado?'Guardando…':'Crear oportunidad'}</Button></form></Modal>
}
