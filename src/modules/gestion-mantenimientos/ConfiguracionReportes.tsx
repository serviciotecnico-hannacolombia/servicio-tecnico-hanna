import {useState} from 'react'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {useUser} from '../../hooks/useUser'
import {usePermisosInSitu} from './usePermisosInSitu'
import {Header,Card,Button} from './uiGestion'
import {toast} from './toastGestion'
import {leerBase,cambiarBase,filasArchivo} from './otst/almacenOTST'
import {leerOTST,leerFacturacion,combinarReportes,planificarReporte,type FilaOTST,type FacturaLinea} from './otst/modeloOTST'
import {leerIntervenciones} from './importarIntervenciones'
import {listarIntervenciones,guardarIntervenciones} from './almacenIntervenciones'
import {identidadIntervencion,type Intervencion} from './intervenciones'
import {INP} from '../mant-in-situ/ui'
const TIPOS={otst:'Reporte general OTST',facturacion:'Facturación general · OTST e in situ',insitu:'DB MANT IN SITU'}
type Tipo=keyof typeof TIPOS
type Carga={tipo:Tipo;archivo:string;corte:string;errores:string[];desde:string;hasta:string;otst:FilaOTST[];facturacion:FacturaLinea[];insitu:Intervencion[];repetidos:number;hojas:{nombre:string;registros:number;errores:number}[];resumen:{nuevos:number;modificados:number;identicos:number}|null}
const fechaActual=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'})
export function ConfiguracionReportes(){
 const {user,displayName}=useUser(),{permisos:p}=usePermisosInSitu(),qc=useQueryClient()
 const [tipo,setTipo]=useState<Tipo>('otst'),[corte,setCorte]=useState(fechaActual),[carga,setCarga]=useState<Carga|null>(null),[ocupado,setOcupado]=useState(false)
 const q=useQuery({queryKey:['reportes-otst',user?.id],enabled:!!user&&p.importar,queryFn:()=>leerBase(user!.id)})
 const fuentes=q.data?.fuentes??[]
 async function preparar(file:File){
  if(!user||!p.importar||ocupado)return
  setOcupado(true);setCarga(null)
  try{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(corte)||!Number.isFinite(Date.parse(corte))||corte>fechaActual())throw Error('Indica la fecha de corte del reporte; no puede ser futura.')
   const c:Carga={tipo,archivo:file.name,corte,errores:[],desde:'',hasta:'',otst:[],facturacion:[],insitu:[],repetidos:0,hojas:[],resumen:null}
   if(tipo==='insitu'){
    const lectura=await leerIntervenciones(file);c.errores=lectura.errores;c.hojas=lectura.hojas
    const previos=await listarIntervenciones(user.id),claves=new Set(previos.map(identidadIntervencion))
    for(const r of lectura.registros){const k=identidadIntervencion(r);if(claves.has(k)){c.repetidos++;continue}claves.add(k);c.insitu.push(r)}
   }else{
    const rows=await filasArchivo(file)
    const previos=await leerBase(user.id)
    if(tipo==='otst'){c.otst=leerOTST(rows);c.resumen=planificarReporte(previos.otst,c.otst,r=>r.otst)}else{c.facturacion=leerFacturacion(rows);c.resumen=planificarReporte(previos.facturacion,c.facturacion,r=>r.tipo+':'+r.documento)}
   }
   const fechas=[...c.otst,...c.facturacion,...c.insitu].map(r=>r.fecha.slice(0,10)).sort();c.desde=fechas[0]??'';c.hasta=fechas.at(-1)??''
   if(!fechas.length&&!c.repetidos&&!c.errores.length)throw Error('El archivo no contiene registros para importar.')
   setCarga(c)
  }catch(e){toast.error((e as Error).message)}finally{setOcupado(false)}
 }
 async function confirmar(){
  if(!user||!p.importar||!carga||ocupado||carga.errores.length||(carga.resumen&&!carga.resumen.nuevos&&!carga.resumen.modificados))return
  setOcupado(true)
  let guardados=0,datosGuardados=false,aplicados=false
  try{
   if(carga.tipo==='insitu'){
    guardados=await guardarIntervenciones(carga.insitu,user.id,displayName||user.email||user.id,'importar');datosGuardados=true
   }
   await cambiarBase(user.id,b=>{
    const po=planificarReporte(b.otst,carga.otst,r=>r.otst),pf=planificarReporte(b.facturacion,carga.facturacion,r=>r.tipo+':'+r.documento)
    const cambios=carga.tipo==='otst'?po.cambios.length:carga.tipo==='facturacion'?pf.cambios.length:guardados
    if(!cambios)return b
    aplicados=true
    return {...b,otst:carga.tipo==='otst'?combinarReportes(b.otst,po.cambios,r=>r.otst):b.otst,facturacion:carga.tipo==='facturacion'?combinarReportes(b.facturacion,pf.cambios,r=>r.tipo+':'+r.documento):b.facturacion,fuentes:[...b.fuentes,{tipo:carga.tipo,corte:carga.corte,nombre:carga.archivo,fecha:new Date().toISOString(),filas:cambios}]}
   })
   toast.success(!aplicados?'Sin novedades: los registros ya están guardados':carga.tipo==='insitu'?`${guardados} servicios nuevos incorporados`:'Novedades actualizadas; registros idénticos y revisiones se conservan')
   setCarga(null)
  }catch(e){if(datosGuardados){setCarga(null);toast.error(`Los servicios se guardaron, pero no se pudo registrar el historial de carga: ${(e as Error).message}`)}else toast.error((e as Error).message)}finally{await qc.invalidateQueries({queryKey:['reportes-otst',user.id]});await qc.invalidateQueries({queryKey:['intervenciones',user.id]});setOcupado(false)}
 }
 if(!p.importar)return <Card>No tienes permiso para actualizar reportes.</Card>
 const ultimas=(t:Tipo)=>fuentes.filter(f=>f.tipo===t||(!f.tipo&&(t==='facturacion'?/factura/i.test(f.nombre):t==='otst'?/general/i.test(f.nombre):false))).at(-1)
 return <div className="gestion-page"><Header title="Configuración · Actualizar reportes" subtitle="Carga los archivos exportados de la intranet para incorporar nuevas fechas y años."/>
 <p className="otst-aviso">OTST, facturación e historial de cargas se guardan en este navegador y usuario. {import.meta.env.DEV?'DB MANT IN SITU también utiliza la vista previa local.':'DB MANT IN SITU utiliza la base de datos configurada y sus permisos.'}</p>
 {q.error&&<p role="alert">No se pudo leer el historial de cargas. <Button onClick={()=>q.refetch()}>Reintentar</Button></p>}
 <Card><div className="otst-filtros">{(Object.keys(TIPOS) as Tipo[]).map(t=>{const u=ultimas(t);return <section key={t}><h3>{TIPOS[t]}</h3>{u?<><p>{u.nombre}</p><small>Corte del reporte: {u.corte||'No registrado'}<br/>Cargado: {new Date(u.fecha).toLocaleString('es-CO',{timeZone:'America/Bogota'})}<br/>{u.filas} registros en esa carga</small></>:<p>Sin cargas registradas desde este apartado.</p>}</section>})}</div></Card>
 <Card><div className="otst-filtros"><label>Archivo que vas a actualizar<select style={INP} disabled={ocupado} value={tipo} onChange={e=>{setTipo(e.target.value as Tipo);setCarga(null)}}>{Object.entries(TIPOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Fecha de corte del reporte<input style={INP} type="date" max={fechaActual()} value={corte} disabled={ocupado} onChange={e=>{setCorte(e.target.value);setCarga(null)}}/></label><label>Seleccionar Excel<input type="file" accept={tipo==='insitu'?'.xlsx':'.xls,.xlsx'} disabled={ocupado||q.isLoading||!!q.error} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void preparar(f)}}/></label></div>
 <p>{tipo==='insitu'?'Puedes incluir varias hojas, como 2025 y 2026, en un solo DB MANT IN SITU. Se leen todas; conserva las columnas del formato original en cada una. El año se toma de la fecha del servicio y se conserva la hoja de origen. Los servicios nuevos ingresan como preventivos; puedes reclasificarlos después. Los registros ya existentes no se sobrescriben.':'Usa el reporte completo de las OTST o facturas incluidas, no extractos de sus líneas. Se reconocen los documentos anteriores: los idénticos se omiten, los modificados se actualizan y los nuevos se agregan. Se conservan los demás años y las revisiones manuales.'}</p>
 {ocupado&&<p role="status">Procesando archivo…</p>}
 {carga&&<section><h3>Revisar antes de actualizar</h3><p>{carga.archivo} · corte {carga.corte}</p>{carga.hojas.length>0&&<div><h4>Hojas encontradas ({carga.hojas.length})</h4><ul>{carga.hojas.map(h=><li key={h.nombre}>{h.nombre}: {h.registros} registros válidos{h.errores?` · ${h.errores} errores`:null}</li>)}</ul></div>}<p>{carga.otst.length+carga.facturacion.length+carga.insitu.length} registros leídos{carga.repetidos?` · ${carga.repetidos} registros existentes o repetidos omitidos`:''}.</p>{carga.resumen&&<p>{carga.tipo==='otst'?'OTST':'Documentos'}: <strong>{carga.resumen.nuevos} nuevos</strong> · <strong>{carga.resumen.modificados} modificados</strong> · <strong>{carga.resumen.identicos} idénticos, sin cambios</strong>.</p>}{(carga.resumen?carga.resumen.nuevos+carga.resumen.modificados===0:carga.insitu.length===0)&&!carga.errores.length&&<p role="status">Sin novedades. El archivo ya está representado en el historial; no se duplicará ni se registrará otra actualización.</p>}{carga.desde&&<p>Fechas de los registros: {carga.desde} a {carga.hasta}.</p>}{carga.hasta>carga.corte&&<p role="status">El archivo contiene registros posteriores a la fecha de corte indicada. Revisa el corte antes de continuar.</p>}{ultimas(carga.tipo)?.corte&&carga.corte<ultimas(carga.tipo)!.corte!&&<p role="status">Este corte es anterior al último registrado. Las OTST o documentos incluidos volverán a los datos de este archivo.</p>}
 {carga.errores.length>0?<><p role="alert">Corrige {carga.errores.length} errores antes de guardar. No se ha aplicado ningún cambio.</p><ul>{carga.errores.slice(0,20).map((e,i)=><li key={i}>{e}</li>)}</ul></>:<Button disabled={ocupado||carga.hasta>carga.corte||(carga.resumen?carga.resumen.nuevos+carga.resumen.modificados===0:carga.insitu.length===0)} onClick={confirmar}>Confirmar actualización</Button>} <Button variant="ghost" disabled={ocupado} onClick={()=>setCarga(null)}>Descartar archivo</Button></section>}
 </Card>
 <Card><details><summary>Historial de actualizaciones ({fuentes.length})</summary><div className="gestion-table-scroll"><table className="gestion-table"><thead><tr><th>Archivo</th><th>Corte</th><th>Cargado</th><th>Registros</th></tr></thead><tbody>{fuentes.slice().reverse().map((f,i)=><tr key={i}><td>{f.nombre}</td><td>{f.corte||'No registrado'}</td><td>{new Date(f.fecha).toLocaleString('es-CO',{timeZone:'America/Bogota'})}</td><td>{f.filas}</td></tr>)}</tbody></table></div></details></Card>
 </div>
}
