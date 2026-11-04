export const BASE_GESTION='/gestion-mantenimientos'
export type SeccionGestion='observaciones'|'inicio'|'in-situ'|'en-hanna'|'solicitudes'|'reportes'|'comercial'|'accesos'
export type ReporteGestion='consultas'|'visitas'|'estadisticas'
export type TipoRuta='preventivo'|'correctivo'|'atencion'
export function rutaGestion(seccion:Exclude<SeccionGestion,'inicio'>,reporte:ReporteGestion='consultas',tipo:TipoRuta='preventivo') {
 if(seccion==='reportes')return `${BASE_GESTION}/reportes/${reporte}${reporte==='consultas'?'':'/'+tipo}`
 return BASE_GESTION+'/'+(seccion==='accesos'?'perfiles-y-accesos':seccion)
}
export function leerRutaGestion(pathname:string):{valida:boolean;seccion:SeccionGestion;reporte:ReporteGestion;tipo:TipoRuta} {
 const base={valida:true,seccion:'inicio' as SeccionGestion,reporte:'consultas' as ReporteGestion,tipo:'preventivo' as TipoRuta}
 const ruta=pathname.replace(/\/+$/,'')
 if(ruta===BASE_GESTION)return base
 if(ruta===rutaGestion('observaciones'))return {...base,seccion:'observaciones'}
 if(ruta===rutaGestion('in-situ'))return {...base,seccion:'in-situ'}
 if(ruta===rutaGestion('en-hanna'))return {...base,seccion:'en-hanna'}
 if(ruta===rutaGestion('solicitudes'))return {...base,seccion:'solicitudes'}
 if(ruta===rutaGestion('comercial'))return {...base,seccion:'comercial'}
 if(ruta===rutaGestion('accesos'))return {...base,seccion:'accesos'}
 if(ruta===BASE_GESTION+'/reportes')return {...base,seccion:'reportes'}
 const m=ruta.match(/^\/gestion-mantenimientos\/reportes\/(consultas|visitas|estadisticas)(?:\/(preventivo|correctivo|atencion))?$/)
 if(m&&!(m[1]==='consultas'&&m[2]))return {...base,seccion:'reportes',reporte:m[1] as ReporteGestion,tipo:(m[2]??'preventivo') as TipoRuta}
 return {...base,valida:false}
}
export function retornoGestion(value:unknown):string|undefined {
 if(typeof value!=='string'||!value.startsWith('/'))return
 try{const u=new URL(value,'http://gestion.local');if(u.origin!=='http://gestion.local'||!leerRutaGestion(u.pathname).valida)return;return u.pathname+u.search+u.hash}catch{return}
}

// Deterministic parent navigation also works after reloading or opening a direct link.
export function regresoGestion(pathname:string,search=''):string|undefined {
 const ruta=leerRutaGestion(pathname),params=new URLSearchParams(search)
 if(!ruta.valida)return BASE_GESTION
 if(ruta.seccion==='inicio')return
 if(ruta.seccion==='en-hanna'&&params.has('vista'))return params.get('origen')==='in-situ'?rutaGestion('in-situ'):rutaGestion('en-hanna')
 if(['in-situ','en-hanna','accesos','observaciones'].includes(ruta.seccion))return BASE_GESTION
 if(ruta.seccion==='reportes'&&ruta.reporte==='estadisticas'){
  const indice=rutaGestion('reportes','estadisticas',ruta.tipo)
  if(params.has('indicador'))return indice+'?servicio='+ruta.tipo
  if(params.has('servicio'))return indice
 }
 if(['solicitudes','comercial'].includes(ruta.seccion)&&params.get('vista')==='indicadores'){
  for(const clave of ['vista','solicitud','oportunidad','ejemplo'])params.delete(clave)
  const query=params.toString()
  return pathname+(query?'?'+query:'')
 }
 return rutaGestion('in-situ')
}
