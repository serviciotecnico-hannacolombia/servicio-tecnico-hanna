import type {UbicacionSolicitud} from './ciudades'
import type { ItemPersonalizado, TransportePersonalizado, EstadiaPersonalizada } from '../mant-in-situ-regional/personalizado'
export const ESTADOS_MANTENIMIENTO = {
  pendiente: {label:'Pendiente de cotizar',color:'#64748b'},
  cotizada: {label:'Cotizada · esperando cliente',color:'#b77908'},
  aprobada: {label:'Aprobada por el cliente',color:'#16834b'},
  rechazada: {label:'Rechazada por el cliente',color:'#c13535'},
  programada: {label:'Programada',color:'#176bb0'},
  realizada: {label:'Realizada',color:'#16834b'},
  cancelada: {label:'Cancelada',color:'#64748b'},
} as const
export type EstadoMantenimiento = keyof typeof ESTADOS_MANTENIMIENTO
export interface CalculoGuardado {
  ubicaciones?: {origen:UbicacionSolicitud,destino:UbicacionSolicitud}
  version: 1
  items: ItemPersonalizado[]
  transporte: TransportePersonalizado
  estadia: EstadiaPersonalizada
  dias: number
  tarifas: {costo_km:number,rendimiento_km_galon:number,precio_galon:number,sede:string}
  desglose: {base:number,tiquetes:number,depreciacion:number,gasolina:number,peajes:number,desplazamiento:number,hospedaje:number,alimentacion:number,otros:number}
  subtotal: number
  margen_pct: 5
  margen: number
  total: number
}
export interface EventoSeguimiento {fecha:string,usuario:string,estado:EstadoMantenimiento,cotizacion:string|null,nota:string}
export interface SolicitudMantenimiento {
  id:string
  cliente:string
  origen:string
  destino:string
  cotizacion:string|null
  estado:EstadoMantenimiento
  calculo:CalculoGuardado
  historial:EventoSeguimiento[]
  creado_por:string
  creado_por_nombre:string
  created_at:string
  updated_at:string
  revision:number
}
export interface NuevaSolicitud {cliente:string,origen:string,destino:string,cotizacion:string,nota:string,calculo:CalculoGuardado}
export function validarSeguimiento(estado:EstadoMantenimiento,cotizacion:string,nota:string) {
  if (!Object.hasOwn(ESTADOS_MANTENIMIENTO,estado)) throw Error('Estado no válido')
  if (['cotizada','aprobada','programada','realizada','rechazada'].includes(estado) && !cotizacion.trim()) throw Error('Asigna primero el número de cotización asociado.')
  if(cotizacion.length>100||nota.length>2000)throw Error('La cotización u observación excede la longitud permitida.')
  if (['rechazada','cancelada'].includes(estado) && !nota.trim()) throw Error('Registra el motivo del rechazo o cancelación.')
}
export function validarNuevaSolicitud(s:NuevaSolicitud) {
  if (s.cliente.length>200 || s.origen.length>300 || s.destino.length>300 || s.cotizacion.length>100 || s.nota.length>2000) throw Error('Los datos ingresados exceden la longitud permitida.')
  if (!s.cliente.trim() || !s.origen.trim() || !s.destino.trim()) throw Error('Completa cliente, origen y destino final.')
  const c=s.calculo
  const importes=Object.values(c.desglose)
  const suma=importes.reduce((a,b)=>a+b,0)
  const base=c.items.reduce((s,i)=>s+Number(i.precio)*Number(i.cantidad),0)
  if(importes.length!==9 || !importes.every(v=>Number.isFinite(v)&&v>=0) || !c.items.every(i=>i.referencia.trim()&&Number(i.precio)>0&&Number.isFinite(Number(i.precio))&&Number.isSafeInteger(Number(i.cantidad))&&Number(i.cantidad)>0) || Math.abs(base-c.desglose.base)>.01 || c.desglose.otros!==c.dias*300000 || c.desglose.alimentacion!==c.dias*60000) throw Error('El cálculo está incompleto o sus importes no coinciden.')
  if (!c.items.length || !Number.isSafeInteger(c.dias) || c.dias<1 || !Number.isFinite(suma) || Math.round(suma)!==c.subtotal || c.margen_pct!==5 || c.margen!==Math.round(c.subtotal*.05) || c.total!==c.subtotal+c.margen || !Number.isSafeInteger(c.total) || c.total<=0) throw Error('El cálculo está incompleto o sus importes no coinciden.')
}
