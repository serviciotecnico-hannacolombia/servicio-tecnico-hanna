import {colorEstadoGestion} from './temaGestion'
import {nombreCiudad,nombreDepartamento,claveLugar,opcionesLugar} from './lugaresReporte'
import {usePermisosInSitu} from './usePermisosInSitu'
import {useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import {Mailbox,Settings2,Search} from 'lucide-react'
import {toast} from './toastGestion'
import {useUser} from '../../hooks/useUser'
import {Button} from './uiGestion'
import {Modal} from '../../components/ui/Modal'
import {INP} from '../mant-in-situ/ui'
import {listarIntervenciones} from './almacenIntervenciones'
import {useAlertasInSitu} from './useAlertasInSitu'
import {programar,estadosProgramacion,tiempoServicio,type EstadoProgramacion} from './programacion'
import {CONFIGURACION_ALERTAS,type ConfiguracionAlertas} from './configuracionAlertas'
import {normalizar,type Intervencion} from './intervenciones'
export function BuzonInSitu({verEquipo,compacto=false}:{compacto?:boolean;verEquipo:(r:Intervencion)=>void}) {
 const {user}=useUser(),alertas=useAlertasInSitu(),acceso=usePermisosInSitu()
 const consulta=useQuery({queryKey:['intervenciones',user?.id],enabled:!!user&&acceso.permisos.buzon,queryFn:()=>listarIntervenciones(user!.id)})
 const c=alertas.config.data??CONFIGURACION_ALERTAS,estados=estadosProgramacion(c)
 const [abierto,setAbierto]=useState(false),[configurar,setConfigurar]=useState(false),[ocupado,setOcupado]=useState(false)
 const [lectura,setLectura]=useState<'nuevos'|'leidos'|'todos'>('nuevos'),[buscar,setBuscar]=useState(''),[ano,setAno]=useState(''),[prioridad,setPrioridad]=useState(''),[departamento,setDepartamento]=useState(''),[ciudad,setCiudad]=useState('')
 const [orden,setOrden]=useState('prioridad'),[agrupar,setAgrupar]=useState('prioridad'),[pagina,setPagina]=useState(1),[tamano,setTamano]=useState(8)
 const destinatario=acceso.permisos.buzon,registros=consulta.data??[]
 const cargando=consulta.isLoading||alertas.leidos.isLoading||alertas.config.isLoading,error=consulta.error||alertas.leidos.error||alertas.config.error
 const clavesLeidas=new Set(alertas.leidos.data??[])
 const mensajes=programar(registros,undefined,c).filter(x=>['vencido','urgente','proximo','anticipado'].includes(x.estado)).map(x=>({...x,clave:`${x.registro.id}:${x.proximo!.fecha}:${x.estado}`}))
 const noLeidos=mensajes.filter(x=>!clavesLeidas.has(x.clave))
 const rango:Partial<Record<EstadoProgramacion,number>>={vencido:0,urgente:1,proximo:2,anticipado:3}
 type Mensaje=typeof mensajes[number]
 function grupo(x:Mensaje){return agrupar==='cliente'?x.registro.cliente:agrupar==='ciudad'?nombreCiudad(x.registro.ciudad):agrupar==='ano'?x.proximo!.fecha.slice(0,4):agrupar==='prioridad'?estados[x.estado].label:'Avisos'}
 function comparar(a:Mensaje,b:Mensaje){
  if(agrupar!=='ninguna'){
   const g=agrupar==='prioridad'?(rango[a.estado]??9)-(rango[b.estado]??9):agrupar==='ano'?grupo(b).localeCompare(grupo(a)):normalizar(grupo(a)).localeCompare(normalizar(grupo(b)),'es')
   if(g)return g
  }
  if(orden==='cliente')return a.registro.cliente.localeCompare(b.registro.cliente,'es')||a.proximo!.fecha.localeCompare(b.proximo!.fecha)
  if(orden==='retraso')return a.proximo!.fecha.localeCompare(b.proximo!.fecha)
  if(orden==='recientes')return b.proximo!.fecha.localeCompare(a.proximo!.fecha)
  return (rango[a.estado]??9)-(rango[b.estado]??9)||(a.estado==='vencido'?b.proximo!.fecha.localeCompare(a.proximo!.fecha):a.proximo!.fecha.localeCompare(b.proximo!.fecha))
 }
 const filtrados=mensajes.filter(x=>(lectura==='todos'||(lectura==='leidos'?clavesLeidas.has(x.clave):!clavesLeidas.has(x.clave)))&&(!ano||x.proximo!.fecha.startsWith(ano))&&(!prioridad||x.estado===prioridad)&&(!departamento||claveLugar(x.registro.departamento)===departamento)&&(!ciudad||claveLugar(x.registro.ciudad)===ciudad)&&normalizar([x.registro.referencia,x.registro.serial,x.registro.cliente,nombreCiudad(x.registro.ciudad),nombreDepartamento(x.registro.departamento)].join(' ')).includes(normalizar(buscar))).sort(comparar)
 const paginas=Math.max(1,Math.ceil(filtrados.length/tamano)),actual=Math.min(pagina,paginas),visibles=filtrados.slice((actual-1)*tamano,actual*tamano)
 const grupos=new Map<string,Mensaje[]>()
 for(const x of visibles){const k=grupo(x);grupos.set(k,[...(grupos.get(k)??[]),x])}
 const anosCargados=[...new Set(registros.map(r=>r.fecha.slice(0,4)))].sort().reverse(),anosPrevistos=[...new Set(mensajes.map(x=>x.proximo!.fecha.slice(0,4)))].sort().reverse()
 const pendientesPagina=visibles.filter(x=>!clavesLeidas.has(x.clave)).map(x=>x.clave)
 async function marcar(claves:string[],leer=true){if(!claves.length||ocupado)return;setOcupado(true);try{if(leer)await alertas.marcar(claves);else await alertas.marcarSinLeer(claves);toast.success(leer?(claves.length===1?'Aviso marcado como leído':`${claves.length} avisos marcados como leídos`):'Aviso marcado sin leer')}catch(e){toast.error((e as Error).message)}finally{setOcupado(false)}}
 function limpiar(){setBuscar('');setAno('');setPrioridad('');setDepartamento('');setCiudad('');setPagina(1)}
 return <section className={'reporte-buzon reporte-buzon-compacto'+(compacto?' buzon-en-cabecera':'')} aria-label="Buzón de mantenimiento">
  <div className="reporte-buzon-cabecera"><button type="button" className="buzon-abrir" title="Abrir buzón de mantenimientos" aria-label={`Abrir buzón: ${noLeidos.length} avisos sin leer`} aria-haspopup="dialog" aria-expanded={abierto} disabled={!destinatario} onClick={()=>setAbierto(true)}><span className="buzon-icono"><Mailbox size={25} aria-hidden="true"/></span><span><strong>Buzón de mantenimientos</strong><small>{!destinatario?'Sin acceso al buzón':cargando?'Cargando avisos…':error?'No se pudo actualizar el buzón':'Abrir, buscar y organizar avisos'}</small></span>{destinatario&&!cargando&&!error&&<span className="buzon-contador">{noLeidos.length} sin leer</span>}</button><div className="buzon-cabecera-acciones">{destinatario&&!cargando&&!error&&anosCargados.length>0&&<small title={anosCargados.join(', ')}>Historial cargado: {anosCargados.slice(0,4).join(', ')}{anosCargados.length>4?` +${anosCargados.length-4}`:''}</small>}{alertas.puedeConfigurarSemaforo&&!compacto&&<Button variant="ghost" size="sm" onClick={()=>{setAbierto(false);setConfigurar(true)}}><Settings2 size={15} aria-hidden="true"/> Configuración</Button>}</div></div>
  {abierto&&destinatario&&<Modal open title="Buzón de mantenimientos" onClose={()=>setAbierto(false)} width={1160}><div className="buzon-contenido">
   <div className="buzon-contexto"><Mailbox size={23} aria-hidden="true"/><div><strong>{cargando?'Actualizando buzón…':error?'Buzón sin actualizar':`${noLeidos.length} avisos sin leer · ${mensajes.length} avisos en total`}</strong><p>Años de intervención cargados: {cargando?'Cargando…':anosCargados.join(', ')||'Sin registros'}. Los avisos se calculan con este historial; al cargar servicios posteriores se actualiza la programación del equipo.</p></div></div>
   {cargando?<p role="status">Cargando avisos…</p>:error?<p role="alert">No se pudo cargar el buzón. <Button variant="ghost" onClick={()=>{consulta.refetch();alertas.config.refetch();alertas.leidos.refetch()}}>Reintentar</Button></p>:<>
    {alertas.puedeConfigurarSemaforo&&<div className="buzon-accion-semaforo"><Button variant="link" size="sm" onClick={()=>{setAbierto(false);setConfigurar(true)}}><Settings2 size={15} aria-hidden="true"/> Configurar semáforo</Button></div>}<nav className="regional-tabs" aria-label="Estado de lectura del buzón">{([['nuevos','Sin leer',noLeidos.length],['leidos','Leídos',mensajes.length-noLeidos.length],['todos','Todos',mensajes.length]] as const).map(([k,n,total])=><button key={k} aria-pressed={lectura===k} onClick={()=>{setLectura(k);setPagina(1)}}>{n} <span>{total}</span></button>)}</nav>
    <div className="buzon-busqueda"><label><span className="sr-only">Buscar en el buzón</span><Search size={16} aria-hidden="true"/><input style={INP} value={buscar} onChange={e=>{setBuscar(e.target.value);setPagina(1)}} placeholder="Buscar cliente, equipo, serial o ciudad"/></label><label>Año del servicio previsto<select style={INP} value={ano} onChange={e=>{setAno(e.target.value);setPagina(1)}}><option value="">Todos los años</option>{anosPrevistos.map(a=><option key={a}>{a}</option>)}</select></label></div>
    <details className="buzon-organizar"><summary>Filtros y organización</summary><div className="buzon-filtros"><label>Prioridad<select style={INP} value={prioridad} onChange={e=>{setPrioridad(e.target.value);setPagina(1)}}><option value="">Todas las prioridades</option>{(['vencido','urgente','proximo','anticipado'] as const).map(k=><option key={k} value={k}>{estados[k].label}</option>)}</select></label><label>Departamento<select style={INP} value={departamento} onChange={e=>{setDepartamento(e.target.value);setCiudad('');setPagina(1)}}><option value="">Todos</option>{opcionesLugar(mensajes.map(x=>x.registro.departamento),'departamento').map(d=><option key={d.clave} value={d.clave}>{d.nombre}</option>)}</select></label><label>Ciudad<select style={INP} value={ciudad} onChange={e=>{setCiudad(e.target.value);setPagina(1)}}><option value="">Todas</option>{opcionesLugar(mensajes.filter(x=>!departamento||claveLugar(x.registro.departamento)===departamento).map(x=>x.registro.ciudad)).map(d=><option key={d.clave} value={d.clave}>{d.nombre}</option>)}</select></label><label>Organizar por<select style={INP} value={agrupar} onChange={e=>{setAgrupar(e.target.value);setPagina(1)}}><option value="prioridad">Prioridad</option><option value="cliente">Cliente</option><option value="ciudad">Ciudad</option><option value="ano">Año del servicio previsto</option><option value="ninguna">Sin agrupación</option></select></label><label>Orden dentro del grupo<select style={INP} value={orden} onChange={e=>{setOrden(e.target.value);setPagina(1)}}><option value="prioridad">Prioridad y fecha</option><option value="retraso">Fecha más antigua primero</option><option value="recientes">Fecha más reciente primero</option><option value="cliente">Cliente A–Z</option></select></label><Button variant="link" onClick={limpiar}>Limpiar filtros</Button></div></details>
    <div className="buzon-resultados"><span>{filtrados.length} coincidencias · {visibles.length} en esta página</span><Button variant="link" size="sm" disabled={ocupado||!pendientesPagina.length} onClick={()=>marcar(pendientesPagina)}>Marcar esta página como leída</Button></div>
    <div className="buzon-listado">{[...grupos].map(([nombre,items])=><section key={nombre} className="buzon-grupo"><h3>{nombre} <span>{items.length} en esta página</span></h3><ul className="reporte-mensajes">{items.map(x=>{const leido=clavesLeidas.has(x.clave);return <li key={x.clave} className={leido?'buzon-leido':'buzon-no-leido'}><div className="buzon-mensaje"><span className="gestion-semaforo" style={{color:colorEstadoGestion(estados[x.estado].color)}}><span/>{tiempoServicio(x.proximo!.dias)}</span><strong>{x.registro.referencia} <small>SN {x.registro.serial||'Sin serial'}</small></strong><p>{x.registro.cliente} · {nombreCiudad(x.registro.ciudad)}</p><small>Servicio previsto: {x.proximo!.fecha} · Última intervención: {x.registro.fecha}</small></div><div className="buzon-mensaje-acciones"><Button size="sm" variant="ghost" onClick={()=>{setAbierto(false);verEquipo(x.registro)}}>Ver hoja de vida</Button>{leido?<Button size="sm" variant="link" disabled={ocupado} onClick={()=>marcar([x.clave],false)}>Marcar sin leer</Button>:<Button size="sm" variant="link" disabled={ocupado} onClick={()=>marcar([x.clave])}>Marcar leído</Button>}</div></li>})}</ul></section>)}{!visibles.length&&<div className="buzon-vacio"><Mailbox size={35} aria-hidden="true"/><strong>{lectura==='nuevos'?'No hay avisos sin leer con estos filtros':'No hay avisos con estos filtros'}</strong><p>Puedes cambiar el año, la prioridad o el estado de lectura.</p></div>}</div>
    <div className="buzon-paginacion"><label>Avisos por página<select style={INP} value={tamano} onChange={e=>{setTamano(Number(e.target.value));setPagina(1)}}><option value={8}>8</option><option value={15}>15</option><option value={25}>25</option></select></label><div><Button variant="ghost" size="sm" disabled={actual===1} onClick={()=>setPagina(actual-1)}>Anterior</Button><span>{actual} / {paginas}</span><Button variant="ghost" size="sm" disabled={actual===paginas} onClick={()=>setPagina(actual+1)}>Siguiente</Button></div></div><p className="buzon-nota">La programación se actualiza al registrar una nueva intervención; marcar un aviso como leído sólo organiza tu buzón.</p>
   </>}
  </div></Modal>}
  {configurar&&<Configurador key={JSON.stringify(c)} config={c} alertas={alertas} onClose={()=>setConfigurar(false)}/>}
 </section>
}
function Configurador({config,alertas,onClose}:{config:ConfiguracionAlertas;alertas:ReturnType<typeof useAlertasInSitu>;onClose:()=>void}) {
 const [c,setC]=useState(structuredClone(config)),[ocupado,setOcupado]=useState(false)
 return <Modal open title="Configuración de alertas in situ" onClose={()=>{if(!ocupado)onClose()}} width={760}><form className="gestion-form" onSubmit={async e=>{e.preventDefault();setOcupado(true);try{await alertas.guardar(c);toast.success('Configuración guardada');onClose()}catch(err){toast.error((err as Error).message)}finally{setOcupado(false)}}}>
  <p>Rojo: vencidos y menos del límite urgente. Amarillo: desde ese límite hasta el próximo. Verde: primera alerta hasta el límite anticipado; después continúa verde sin alerta.</p><div className="reporte-campos">{([['anticipado','Primera alerta verde hasta (días)'],['proximo','Amarillo hasta (días)'],['urgente','Rojo con menos de (días)']] as const).map(([k,label])=><label key={k}>{label}<input style={INP} type="number" min={0} max={365} required value={c[k]} onChange={e=>setC({...c,[k]:Number(e.target.value)})}/></label>)}</div>
  <p>Los destinatarios se administran desde Gestión de mantenimientos → Perfiles y accesos.</p>
  <p className="reporte-ayuda">Las notificaciones se consultan en este buzón al abrir Gestión. Los correos automáticos requieren configurar y desplegar su servicio de envío; todavía no están activos.</p><Button type="submit" disabled={ocupado||alertas.config.isLoading||!!alertas.config.error}>{ocupado?'Guardando…':'Guardar configuración'}</Button>
 </form></Modal>
}
