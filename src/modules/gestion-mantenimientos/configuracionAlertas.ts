export interface DestinatarioAlerta {id:string|null;nombre:string}
export interface ConfiguracionAlertas {administrador_id?:string|null;anticipado:number;proximo:number;urgente:number;destinatarios:DestinatarioAlerta[]}
export const CONFIGURACION_ALERTAS:ConfiguracionAlertas={anticipado:90,proximo:60,urgente:30,destinatarios:[{id:null,nombre:'Andrés Latorre'},{id:null,nombre:'Brayan Galeano'},{id:null,nombre:'Juan Camilo Peñuela'}]}
export function validarConfiguracion(c:ConfiguracionAlertas) {
 if(![c.anticipado,c.proximo,c.urgente].every(n=>Number.isInteger(n)&&n>=0&&n<=365)||!(c.urgente<c.proximo&&c.proximo<c.anticipado))throw Error('Los plazos deben cumplir: urgente < próximo < anticipado, entre 0 y 365 días.')
 if(!Array.isArray(c.destinatarios)||c.destinatarios.length>50)throw Error('La lista de destinatarios no es válida.')
}
export function mismoDestinatario(nombre:string,objetivo:string) {
 const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().split(/\s+/)
 const palabras=norm(nombre)
 return norm(objetivo).every(p=>palabras.includes(p))
}

export function actualizarUmbralesIniciales(c:ConfiguracionAlertas):ConfiguracionAlertas {
 return c.anticipado===90&&c.proximo===30&&c.urgente===7?{...c,proximo:60,urgente:30}:c
}
