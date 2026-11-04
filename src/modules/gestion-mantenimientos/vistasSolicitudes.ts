export const BLOQUES_VISTA=['tiquetes','hospedaje','alimentacion','margen','extremos','destinos'] as const
export const METRICAS_VISTA=['tiquetePromedio','promedioNoche','diasPromedio','margen','total'] as const
export interface ConfigVistaSolicitud {ano:string;departamento:string;alcance:'aceptadas'|'todas';bloques:(typeof BLOQUES_VISTA)[number][];metrica:(typeof METRICAS_VISTA)[number];vista:'tabla'|'barras'|'columnas'}
export interface VistaSolicitud {id:string;nombre:string;config:ConfigVistaSolicitud;creada:string}
const clave=(usuario:string)=>'hanna-vistas-solicitudes-v1:'+usuario
export function validarConfigVista(v:unknown):v is ConfigVistaSolicitud {
 if(!v||typeof v!=='object')return false
 const c=v as ConfigVistaSolicitud
 return typeof c.ano==='string'&&/^(|\d{4})$/.test(c.ano)&&typeof c.departamento==='string'&&c.departamento.length<=200&&['aceptadas','todas'].includes(c.alcance)&&Array.isArray(c.bloques)&&c.bloques.length<=6&&new Set(c.bloques).size===c.bloques.length&&c.bloques.every(b=>BLOQUES_VISTA.includes(b))&&METRICAS_VISTA.includes(c.metrica)&&['tabla','barras','columnas'].includes(c.vista)
}
export function leerVistasSolicitudes(usuario:string,storage:Pick<Storage,'getItem'>=localStorage):VistaSolicitud[] {
 if(!usuario)return []
 const raw=storage.getItem(clave(usuario));if(!raw)return []
 const vistas:unknown=JSON.parse(raw)
 if(!Array.isArray(vistas)||vistas.length>15||!vistas.every(v=>v&&typeof v.id==='string'&&typeof v.nombre==='string'&&v.nombre.trim().length>0&&v.nombre.length<=60&&typeof v.creada==='string'&&validarConfigVista(v.config)))throw Error('No se pudieron leer las vistas guardadas de este navegador.')
 return vistas
}
export function guardarVistaSolicitud(usuario:string,nombre:string,config:ConfigVistaSolicitud,storage:Pick<Storage,'getItem'|'setItem'>=localStorage) {
 if(!usuario||!nombre.trim()||nombre.trim().length>60||!validarConfigVista(config))throw Error('Escribe un nombre de hasta 60 caracteres y una configuración válida.')
 const vistas=leerVistasSolicitudes(usuario,storage)
 if(vistas.length>=15)throw Error('Puedes guardar hasta 15 vistas. Quita una antes de añadir otra.')
 const vista={id:crypto.randomUUID(),nombre:nombre.trim(),config:structuredClone(config),creada:new Date().toISOString()}
 storage.setItem(clave(usuario),JSON.stringify([...vistas,vista]));return vista
}
export function quitarVistaSolicitud(usuario:string,id:string,storage:Pick<Storage,'getItem'|'setItem'>=localStorage) {if(!usuario)throw Error('Inicia sesión para administrar tus vistas.');storage.setItem(clave(usuario),JSON.stringify(leerVistasSolicitudes(usuario,storage).filter(v=>v.id!==id)))}
