import type {SolicitudMantenimiento} from './modelo'
export const ESTADOS_ACEPTADOS=['aprobada','programada','realizada']
export function departamentoSolicitud(r:SolicitudMantenimiento){return r.calculo.ubicaciones?.destino.departamento?.trim()||'Sin departamento registrado'}
export function resumirCostosSolicitudes(registros:SolicitudMantenimiento[]) {
 const filas=registros.filter(r=>!r.es_prueba)
 const suma=(f:(r:SolicitudMantenimiento)=>number)=>filas.reduce((n,r)=>n+f(r),0)
 const hoteles=filas.filter(r=>r.calculo.estadia.hospedaje==='si'&&Number(r.calculo.estadia.noches)>0)
 const noches=hoteles.reduce((n,r)=>n+Number(r.calculo.estadia.noches),0)
 const hospedaje=hoteles.reduce((n,r)=>n+r.calculo.desglose.hospedaje,0)
 const porNoche=(r:SolicitudMantenimiento)=>r.calculo.desglose.hospedaje/Number(r.calculo.estadia.noches)
 const ordenHoteles=[...hoteles].sort((a,b)=>porNoche(a)-porNoche(b))
 const dias=suma(r=>r.calculo.dias),margen=suma(r=>r.calculo.margen)
 const aereos=filas.filter(r=>r.calculo.transporte.viaje==='aereo')
 const totalTiquetes=aereos.reduce((n,r)=>n+r.calculo.desglose.tiquetes,0)
 const aprobadas=filas.filter(r=>ESTADOS_ACEPTADOS.includes(r.estado))
 const departamentos=[...new Set(filas.map(departamentoSolicitud))].map(nombre=>{
  const grupo=filas.filter(r=>departamentoSolicitud(r)===nombre)
  const aereos=grupo.filter(r=>r.calculo.transporte.viaje==='aereo'),hoteles=grupo.filter(r=>r.calculo.estadia.hospedaje==='si'&&Number(r.calculo.estadia.noches)>0)
  const tiquetes=aereos.reduce((n,r)=>n+r.calculo.desglose.tiquetes,0),hospedaje=hoteles.reduce((n,r)=>n+r.calculo.desglose.hospedaje,0),noches=hoteles.reduce((n,r)=>n+Number(r.calculo.estadia.noches),0),dias=grupo.reduce((n,r)=>n+r.calculo.dias,0)
  return {nombre,solicitudes:grupo.length,aereos:aereos.length,tiquetes,tiquetePromedio:aereos.length?tiquetes/aereos.length:null,hospedaje,noches,promedioNoche:noches?hospedaje/noches:null,dias,diasPromedio:grupo.length?dias/grupo.length:null,margen:grupo.reduce((n,r)=>n+r.calculo.margen,0),total:grupo.reduce((n,r)=>n+r.calculo.total,0)}
 }).sort((a,b)=>b.total-a.total)
 return {cantidad:filas.length,dias,diasPromedio:filas.length?dias/filas.length:null,tiquetes:totalTiquetes,tiquetePromedio:aereos.length?totalTiquetes/aereos.length:null,aereos:aereos.length,hospedaje,noches,viajesConHotel:hoteles.length,promedioNoche:noches?hospedaje/noches:null,promedioHotelViaje:hoteles.length?hospedaje/hoteles.length:null,menorHotel:ordenHoteles[0]??null,mayorHotel:ordenHoteles.at(-1)??null,margen,margenAprobado:aprobadas.reduce((n,r)=>n+r.calculo.margen,0),alimentacion:suma(r=>r.calculo.desglose.alimentacion),total:suma(r=>r.calculo.total),departamentos}
}
