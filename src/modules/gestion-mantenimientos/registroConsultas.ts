import {supabase,fetchAllRows} from '../../lib/supabase'
import {VISTA_PREVIA_LOCAL} from './almacenamiento'
import {validarConsulta,firmaConsulta,type DatosConsulta,type RegistroConsulta} from './consultas'
const KEY='hanna-consultas-mantenimiento-preview-v1'
export async function guardarConsulta(c:DatosConsulta,razon:string,zona:string,id:string,usuario:{id:string,nombre:string,email:string}) {
 validarConsulta(c,razon,zona)
 if(VISTA_PREVIA_LOCAL) {
  const filas:RegistroConsulta[]=JSON.parse(localStorage.getItem(KEY)??'[]')
  const existente=filas.find(f=>f.id===id);if(existente){if(existente.usuario_id!==usuario.id||firmaConsulta(existente,existente.razon_social,existente.zona)!==firmaConsulta(c,razon,zona))throw Error('El identificador corresponde a otra consulta');return existente}
  const r:RegistroConsulta={...structuredClone(c),id,razon_social:razon.trim(),zona:zona.trim(),usuario_id:usuario.id,usuario_nombre:usuario.nombre,usuario_email:usuario.email,created_at:new Date().toISOString()}
  localStorage.setItem(KEY,JSON.stringify([r,...filas]));return r
 }
 const {data,error}=await supabase.rpc('mantenimiento_registrar_consulta',{p_id:id,p_consulta:c,p_razon_social:razon.trim(),p_zona:zona.trim()})
 if(error)throw Error(['PGRST202','42P01'].includes(error.code)?'Falta instalar el SQL del registro de consultas. No se pudo registrar ni revelar el valor.':error.message)
 return data as RegistroConsulta
}
export async function leerConsultas() {
 if(VISTA_PREVIA_LOCAL)return JSON.parse(localStorage.getItem(KEY)??'[]') as RegistroConsulta[]
 return fetchAllRows<RegistroConsulta>('mantenimiento_consultas',q=>q.order('created_at',{ascending:false}))
}
