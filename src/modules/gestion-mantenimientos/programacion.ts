import {normalizar,proximoServicio,type Intervencion} from './intervenciones'
import {CONFIGURACION_ALERTAS,type ConfiguracionAlertas} from './configuracionAlertas'
export const ESTADOS_PROGRAMACION={vencido:{label:'Vencidos',color:'#c53030'},urgente:{label:'Menos de 30 días',color:'#c53030'},proximo:{label:'30–60 días',color:'#ac7800'},anticipado:{label:'61–90 días · Primera alerta',color:'#17804c'},vigente:{label:'Más de 90 días',color:'#17804c'},sin_fecha:{label:'Sin programación',color:'#64748b'},historico:{label:'Historial anterior',color:'#64748b'}} as const
export type EstadoProgramacion=keyof typeof ESTADOS_PROGRAMACION
export function tiempoServicio(dias:number|null,estado?:EstadoProgramacion) {
 if(estado==='historico')return 'Historial anterior'
 if(dias===null)return 'Sin programación'
 if(dias===0)return 'Vence hoy'
 const cantidad=Math.abs(dias),unidad=cantidad===1?'día':'días'
 return dias<0?`Vencido hace ${cantidad} ${unidad}`:`${cantidad===1?'Falta':'Faltan'} ${cantidad} ${unidad}`
}
export function claveEquipo(r:Intervencion) {
 const serial=normalizar(r.serial)
 return !serial||['-','n/a','na','ing no asocia'].includes(serial)?r.id:[normalizar(r.referencia),serial].join('|')
}
export function historialEquipo(registros:Intervencion[],equipo:Intervencion) {
 const clave=claveEquipo(equipo)
 return registros.filter(r=>claveEquipo(r)===clave).sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.id.localeCompare(a.id))
}
export function ultimoPreventivo(registros:Intervencion[],equipo:Intervencion) {
 return historialEquipo(registros,equipo).find(r=>r.tipo==='preventivo')
}
export function nuevaVisitaEquipo(equipo:Intervencion,periodicidad:number|null=365):Intervencion {
 return {...equipo,id:crypto.randomUUID(),fecha:new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'}),tipo:'preventivo',motivo_atencion:null,periodicidad,documento:'',informe:'',observaciones:'',historial:[],revision:1}
}
export function sugerirEquipos(registros:Intervencion[],serie:string,referencia='') {
 const buscar=normalizar(serie),ref=normalizar(referencia)
 if(!buscar||['-','n/a','na','ing no asocia'].includes(buscar))return []
 const equipos=new Map<string,Intervencion>()
 for(const r of registros){
  if(claveEquipo(r)===r.id||!normalizar(r.serial).includes(buscar))continue
  const k=claveEquipo(r),actual=equipos.get(k)
  if(!actual||r.fecha>actual.fecha||(r.fecha===actual.fecha&&r.id>actual.id))equipos.set(k,r)
 }
 return [...equipos.values()].sort((a,b)=>Number(normalizar(b.serial)===buscar)-Number(normalizar(a.serial)===buscar)||Number(normalizar(b.referencia)===ref)-Number(normalizar(a.referencia)===ref)||b.fecha.localeCompare(a.fecha)||a.referencia.localeCompare(b.referencia)).slice(0,8)
}
export function usarDatosEquipo(borrador:Intervencion,equipo:Intervencion,registros:Intervencion[]):Intervencion {
 const ultimo=ultimoPreventivo(registros,equipo)
 return {...borrador,referencia:equipo.referencia,serial:equipo.serial,cliente:equipo.cliente||borrador.cliente,nit:equipo.nit||borrador.nit,asesor:equipo.asesor||borrador.asesor,contacto:equipo.contacto||borrador.contacto,telefono:equipo.telefono||borrador.telefono,departamento:equipo.departamento||borrador.departamento,ciudad:equipo.ciudad||borrador.ciudad,ubicacion:equipo.ubicacion||borrador.ubicacion,zona:equipo.zona||borrador.zona,periodicidad:borrador.tipo==='preventivo'?(ultimo?ultimo.periodicidad:365):borrador.periodicidad}
}
export function programar(registros:Intervencion[],hoy=new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'}),config:ConfiguracionAlertas=CONFIGURACION_ALERTAS) {
 const ultimos=new Map<string,Intervencion>()
 for(const r of registros)if(r.tipo==='preventivo'){const k=claveEquipo(r),actual=ultimos.get(k);if(!actual||actual.fecha<r.fecha||(actual.fecha===r.fecha&&actual.id<r.id))ultimos.set(k,r)}
 return registros.map(r=>{
  const anterior=r.tipo==='preventivo'&&r.id!==ultimos.get(claveEquipo(r))?.id
  // Un servicio posterior sustituye la programación anterior: no genera deudas por años intermedios.
  const p=anterior?null:proximoServicio(r,hoy)
  const estado:EstadoProgramacion=anterior?'historico':!p?'sin_fecha':p.dias<0?'vencido':p.dias<config.urgente?'urgente':p.dias<=config.proximo?'proximo':p.dias<=config.anticipado?'anticipado':'vigente'
  return {registro:r,proximo:p,estado}
 })
}
export function estadosProgramacion(config:ConfiguracionAlertas=CONFIGURACION_ALERTAS) {
 return {...ESTADOS_PROGRAMACION,urgente:{...ESTADOS_PROGRAMACION.urgente,label:`Menos de ${config.urgente} días`},proximo:{...ESTADOS_PROGRAMACION.proximo,label:`${config.urgente}–${config.proximo} días`},anticipado:{...ESTADOS_PROGRAMACION.anticipado,label:`${config.proximo+1}–${config.anticipado} días · Primera alerta`},vigente:{...ESTADOS_PROGRAMACION.vigente,label:`Más de ${config.anticipado} días`}}
}
