export const MOTIVOS_ATENCION={funcionamiento:'Revisión de funcionamiento',orientacion:'Orientación al cliente',otro:'Otra atención'} as const
export type MotivoAtencion=keyof typeof MOTIVOS_ATENCION
export const TIPOS_INTERVENCION = {preventivo:'Mantenimiento preventivo',correctivo:'Mantenimiento correctivo',atencion:'Informe de atención'} as const
export type TipoIntervencion = keyof typeof TIPOS_INTERVENCION
export interface Intervencion {
 id:string; referencia:string; serial:string; cliente:string; nit:string; asesor:string; contacto:string; telefono:string;
 fecha:string; departamento:string; ciudad:string; ubicacion:string; documento:string; periodicidad:number|null;
 informe:string; observaciones:string; zona:string; tipo:TipoIntervencion;
 historial:{fecha:string; usuario:string; tipo:TipoIntervencion; nota:string; cambios?:{campo:string;antes:unknown;despues:unknown}[]}[];
 revision:number; motivo_atencion?:MotivoAtencion|null;
}
export const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
export function validarIntervencion(r:Intervencion) {
 if(r.motivo_atencion!=null&&!(r.motivo_atencion in MOTIVOS_ATENCION))throw Error('Motivo de atención no válido.')
 if(!r.referencia.trim()||!r.cliente.trim()||!r.ciudad.trim())throw Error('Referencia, razón social y ciudad son obligatorias.')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(r.fecha)||!Number.isFinite(Date.parse(r.fecha))||new Date(r.fecha+'T12:00:00Z').toISOString().slice(0,10)!==r.fecha)throw Error('La fecha de intervención no es válida.')
 if(!(r.tipo in TIPOS_INTERVENCION))throw Error('Tipo de intervención no válido.')
 if(r.periodicidad!==null&&(!Number.isInteger(r.periodicidad)||r.periodicidad<1||r.periodicidad>3650))throw Error('La periodicidad debe estar entre 1 y 3650 días.')
}
export function identidadIntervencion(r:Intervencion) {
 // El tipo no forma parte de la identidad: reclasificar no permite duplicar una importación.
 return [r.fecha,r.referencia,r.serial,r.cliente,r.ciudad,r.informe,r.documento].map(normalizar).join('|')
}
export function proximoServicio(r:Intervencion,hoy=new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'})) {
 if(r.tipo!=='preventivo'||!r.periodicidad)return null
 const d=new Date(r.fecha+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+r.periodicidad)
 const fecha=d.toISOString().slice(0,10),dias=Math.round((Date.parse(fecha)-Date.parse(hoy))/86400000)
 return {fecha,dias,estado:dias<0?'Vencido':dias<=30?'Próximo a vencer':'Vigente',color:dias<0?'#cf3030':dias<=30?'#bb7b00':'#118548'}
}
