import {mismoDestinatario} from './configuracionAlertas'
export const PERMISOS_IN_SITU={personalizado_regional:'Usar cotizador Personalizado (equipos y viajes)',observaciones_crear:'Crear novedades OTST',observaciones_ver:'Ver novedades OTST registradas',administrar_observaciones_st:'Eliminar novedades OTST',ver:'Ver visitas y hojas de vida',registrar:'Registrar visitas',editar:'Editar y reclasificar visitas',importar:'Importar históricos',exportar:'Exportar visitas',estadisticas:'Ver estadísticas y gráficos',comercial:'Ver seguimiento comercial',oportunidades_crear:'Crear oportunidades',oportunidades_editar:'Actualizar cotizaciones y cierres',buzon:'Recibir y organizar avisos',semaforo:'Configurar semáforo',catalogo_editar:'Asignar códigos de mantenimiento',solicitudes_ver:'Ver solicitudes y cotizaciones',solicitudes_crear:'Crear solicitudes',solicitudes_editar:'Actualizar solicitudes',solicitudes_exportar:'Exportar solicitudes y respaldos',consultas_ver:'Ver consultas de cotizadores',consultas_exportar:'Exportar consultas',gestionar_accesos:'Dar o quitar accesos de Gestión'} as const
export type PermisoInSitu=keyof typeof PERMISOS_IN_SITU
export type PermisosInSitu=Record<PermisoInSitu,boolean>
export interface AccesoInSitu extends PermisosInSitu {administrador:boolean;configurado:boolean}
const claves=Object.keys(PERMISOS_IN_SITU) as PermisoInSitu[]
export const SIN_PERMISOS=Object.fromEntries(claves.map(k=>[k,false])) as PermisosInSitu
export const ACCESO_COMPLETO=Object.fromEntries(claves.map(k=>[k,k!=='gestionar_accesos'])) as PermisosInSitu
export const ACCESO_PROPIETARIO={...ACCESO_COMPLETO,gestionar_accesos:true}
export const CLAVE_PERMISOS='hanna-permisos-in-situ-preview-v1'
export const GRUPOS_PERMISOS:{titulo:string;claves:PermisoInSitu[]}[]=[{titulo:'Mantenimiento in situ regional',claves:['personalizado_regional']},{titulo:'Visitas y equipos',claves:['ver','registrar','editar','importar','exportar','catalogo_editar']},{titulo:'Solicitudes y cotizaciones',claves:['solicitudes_ver','solicitudes_crear','solicitudes_editar','solicitudes_exportar']},{titulo:'Análisis y consultas',claves:['estadisticas','consultas_ver','consultas_exportar']},{titulo:'Seguimiento comercial',claves:['comercial','oportunidades_crear','oportunidades_editar']},{titulo:'Novedades OTST',claves:['observaciones_crear','observaciones_ver','administrar_observaciones_st']},{titulo:'Buzón y configuración',claves:['buzon','semaforo','gestionar_accesos']}]
const DEPENDENCIAS:Partial<Record<PermisoInSitu,PermisoInSitu[]>>={administrar_observaciones_st:['observaciones_ver'],registrar:['ver'],editar:['ver'],importar:['ver'],exportar:['ver'],estadisticas:['ver'],comercial:['ver'],oportunidades_crear:['comercial'],oportunidades_editar:['comercial'],buzon:['ver'],semaforo:['buzon'],catalogo_editar:['editar'],solicitudes_crear:['solicitudes_ver'],solicitudes_editar:['solicitudes_ver'],solicitudes_exportar:['solicitudes_ver'],consultas_exportar:['consultas_ver']}
export function ajustarPermiso(p:PermisosInSitu,k:PermisoInSitu,valor:boolean):PermisosInSitu {
 const nuevo={...p,[k]:valor}
 if(valor){for(const padre of DEPENDENCIAS[k]??[])Object.assign(nuevo,ajustarPermiso(nuevo,padre,true))}
 else {for(const hijo of claves)if(DEPENDENCIAS[hijo]?.includes(k)&&nuevo[hijo])Object.assign(nuevo,ajustarPermiso(nuevo,hijo,false))}
 return nuevo
}
export function normalizarPermisos(p:Partial<PermisosInSitu>):PermisosInSitu {
 return {...SIN_PERMISOS,observaciones_ver:p.ver??false,observaciones_crear:p.registrar??false,estadisticas:p.ver??false,comercial:p.ver??false,oportunidades_crear:p.registrar??false,oportunidades_editar:p.editar??false,...p}
}
export function permisosIniciales(nombre:string):PermisosInSitu {
 if(mismoDestinatario(nombre,'Andrés Latorre'))return {...ACCESO_PROPIETARIO}
 return ['Brayan Galeano','Juan Camilo Peñuela'].some(n=>mismoDestinatario(nombre,n))?normalizarPermisos({ver:true,buzon:true}):{...SIN_PERMISOS}
}
export function accesoCompleto(p:PermisosInSitu){return claves.filter(k=>k!=='gestionar_accesos').every(k=>p[k])}
export function validarPermisos(p:PermisosInSitu) {
 if(claves.some(k=>typeof p[k]!=='boolean'))throw Error('Los permisos deben ser casillas activadas o desactivadas.')
 for(const k of claves)if(p[k]&&(DEPENDENCIAS[k]??[]).some(padre=>!p[padre]))throw Error('Los permisos de una acción requieren la lectura de su apartado.')
}
