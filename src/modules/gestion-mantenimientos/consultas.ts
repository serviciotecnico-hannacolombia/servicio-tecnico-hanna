export interface DatosConsulta {modulo:'normal'|'regional',origen:string,destino_codigo:string,departamento:string,municipio:string,equipos:{referencia:string,nombre:string,cantidad:number}[],total:number,dias:number}
export interface RegistroConsulta extends DatosConsulta {id:string,razon_social:string,zona:string,usuario_id:string,usuario_nombre:string,usuario_email:string,created_at:string}
export function validarConsulta(c:DatosConsulta,razon:string) {
 if(razon.trim().length<2||razon.trim().length>200)throw Error('Ingresa la razón social del cliente (entre 2 y 200 caracteres).')
 if(!['normal','regional'].includes(c.modulo)||!c.origen.trim()||!c.destino_codigo||!c.departamento||!c.municipio||!c.equipos.length||!c.equipos.every(e=>e.referencia&&Number.isSafeInteger(e.cantidad)&&e.cantidad>0)||!Number.isFinite(c.total)||c.total<=0||!Number.isSafeInteger(c.dias)||c.dias<1)throw Error('Completa el destino y los equipos antes de consultar el valor.')
}
export function firmaConsulta(c:DatosConsulta|null,razon:string) {return JSON.stringify([c?{modulo:c.modulo,origen:c.origen,destino_codigo:c.destino_codigo,departamento:c.departamento,municipio:c.municipio,equipos:c.equipos,total:c.total,dias:c.dias}:null,razon.trim()])}
