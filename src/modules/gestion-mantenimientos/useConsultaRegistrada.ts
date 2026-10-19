import {useRef,useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {useUser} from '../../hooks/useUser'
import {firmaConsulta,type DatosConsulta} from './consultas'
import {guardarConsulta} from './registroConsultas'
export function useConsultaRegistrada(datos:DatosConsulta|null) {
 const {user,displayName}=useUser(),qc=useQueryClient()
 const [razon,setRazon]=useState(''),[zona,setZona]=useState(''),[mostrada,setMostrada]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('')
 const claves=useRef(new Map<string,string>()),firma=JSON.stringify([user?.id,firmaConsulta(datos,razon,zona)])
 const visible=!!datos&&mostrada===firma
 async function consultar() {
  if(!datos||!user||saving||visible)return
  setSaving(true);setError('')
  try {
   const id=claves.current.get(firma)??crypto.randomUUID();claves.current.set(firma,id)
   await guardarConsulta(datos,razon,zona,id,{id:user.id,nombre:displayName||user.email||user.id,email:user.email??''})
   setMostrada(firma);await qc.invalidateQueries({queryKey:['mantenimiento-consultas']})
  }catch(e){const mensaje=e instanceof Error?e.message:'No se pudo registrar la consulta';setError(mensaje);toast.error(mensaje)}finally{setSaving(false)}
 }
 function reiniciar(){setRazon('');setZona('');setMostrada('');setError('');claves.current.clear()}
 return {razon,setRazon,zona,setZona,visible,saving,error,consultar,reiniciar,disponible:!!datos}
}
