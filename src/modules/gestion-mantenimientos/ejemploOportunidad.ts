import {guardarIntervenciones} from './almacenIntervenciones'
import {listarOportunidades,crearOportunidad,actualizarOportunidad} from './almacenOportunidades'
import type {Intervencion} from './intervenciones'
import type {Oportunidad} from './oportunidades'
const ID_SERVICIO='d64ca022-ecec-4d24-bb93-752df3306574',ID_OPORTUNIDAD='9ec83ad4-1a4e-4b43-8501-bad352f84182'
const pendientes=new Map<string,Promise<Oportunidad>>()
export function cargarEjemploOportunidad(usuario:string,nombre:string):Promise<Oportunidad>{
 if(!import.meta.env.DEV)throw Error('El ejemplo sólo está disponible en localhost.')
 const pendiente=pendientes.get(usuario);if(pendiente)return pendiente
 const tarea=crearEjemplo(usuario,nombre).finally(()=>pendientes.delete(usuario));pendientes.set(usuario,tarea);return tarea
}
async function crearEjemplo(usuario:string,nombre:string){
 const existente=(await listarOportunidades(usuario)).find(o=>o.id===ID_OPORTUNIDAD)
 if(existente)return existente
 const servicio:Intervencion={id:ID_SERVICIO,referencia:'HI-DEMO',serial:'DEMO-001',cliente:'[EJEMPLO] Laboratorio Demostración',nit:'',asesor:'Asesor de demostración',contacto:'',telefono:'',fecha:new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'}),departamento:'CUNDINAMARCA',ciudad:'BOGOTÁ, D.C.',ubicacion:'Instalaciones ficticias del cliente',documento:'DEMO-0042',periodicidad:365,informe:'DEMO-0042',observaciones:'DEMOSTRACIÓN LOCAL. Datos ficticios para revisar una oportunidad vinculada a un preventivo. No corresponde a un cliente ni servicio real.',zona:'Demostración local',tipo:'preventivo',historial:[],revision:1}
 await guardarIntervenciones([servicio],usuario,nombre,'registrar')
 const creada=await crearOportunidad({id:ID_OPORTUNIDAD,intervencion_id:ID_SERVICIO,os:'0042',numero_oportunidad:'EJEMPLO-PREVENTIVO-DEMO',titulo:'[EJEMPLO] Reemplazo de electrodo',necesidad:'Durante el mantenimiento preventivo ficticio se detecta desgaste del electrodo. Se recomienda cotizar su reemplazo. Este registro es únicamente una demostración local.',asesor:servicio.asesor},usuario,nombre)
 const cotizada=await actualizarOportunidad(creada,'cotizada','COT-EJEMPLO-001','DEMOSTRACIÓN: se simula una cotización por reemplazo de electrodo; no se ha creado en la intranet principal.',450000,usuario,nombre)
 return actualizarOportunidad(cotizada,'ganada','COT-EJEMPLO-001','DEMOSTRACIÓN: se simula la aprobación del cliente para mostrar el historial y el monto en los reportes. No es una aprobación real.',450000,usuario,nombre)
}
