import {SlidersHorizontal} from 'lucide-react'
import type {ComponentProps} from 'react'
import {SelectorTipoServicio} from './SelectorTipoServicio'
import {useLocation,useSearchParams} from 'react-router-dom'
import {leerRutaGestion} from './rutasGestion'
import {NuevaOportunidadInSitu} from './NuevaOportunidadInSitu'
import {listarOportunidades} from './almacenOportunidades'
import {ESTADOS_OPORTUNIDAD,type EstadoOportunidad} from './oportunidades'
import {ResolverCodigoEstadisticas,CLAVE_CODIGOS_PREVIEW} from './ResolverCodigoEstadisticas'
import {GraficoIntervenciones as GraficoBase} from './GraficoIntervenciones'
import {useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import {useUser} from '../../hooks/useUser'
import {supabase} from '../../lib/supabase'
import {Header} from './uiGestion'
import {Card} from './uiGestion'
import {Button} from './uiGestion'
import {Modal} from '../../components/ui/Modal'
import {INP} from '../mant-in-situ/ui'
import {usePermisosInSitu} from './usePermisosInSitu'
import {listarIntervenciones} from './almacenIntervenciones'
import {normalizar,TIPOS_INTERVENCION,MOTIVOS_ATENCION,type Intervencion} from './intervenciones'
import {claveLugar,nombreCiudad,nombreDepartamento,opcionesLugar} from './lugaresReporte'
import {claveEquipo} from './programacion'
import {agruparIntervenciones,catalogoEstadisticas,codigoServicio,type CodigoEstadistica} from './estadisticas'
export function EstadisticasIntervenciones({onVerEquipo}:{onVerEquipo?:(r:Intervencion)=>void}={}) {
 const {user}=useUser(),acceso=usePermisosInSitu(),location=useLocation()
 const [params,setParams]=useSearchParams()
 const agrupacionGeografica=params.get('agrupar')==='departamento'?'departamento':'ciudad'
 const tipo=leerRutaGestion(location.pathname).tipo
 const consulta=useQuery({queryKey:['intervenciones',user?.id],enabled:!!user&&acceso.permisos.estadisticas,queryFn:()=>listarIntervenciones(user!.id)})
 const catalogo=useQuery({queryKey:['estadisticas-catalogo-in-situ',user?.id],enabled:!!user&&acceso.permisos.estadisticas,staleTime:300000,queryFn:async()=>{
  const filas:CodigoEstadistica[]=[]
  for(let desde=0;;desde+=1000){const {data,error}=await supabase.from('codigos_inet').select('codigo,familia,codigo_mantenimiento_insitu').order('codigo').range(desde,desde+999);if(error)throw Error('No se pudo consultar el catálogo de códigos de mantenimiento.');filas.push(...data);if(data.length<1000)break}
  if(import.meta.env.DEV){const cambios=JSON.parse(localStorage.getItem(CLAVE_CODIGOS_PREVIEW)??'{}');return filas.map(r=>cambios[r.codigo]?{...r,codigo_mantenimiento_insitu:cambios[r.codigo]}:r)}
  return filas
 }})
 const [ano,setAno]=useState(''),[departamento,setDepartamento]=useState(''),[ciudad,setCiudad]=useState(''),[zona,setZona]=useState(''),[buscar,setBuscar]=useState(''),[limite,setLimite]=useState(12)
 const oportunidades=useQuery({queryKey:['oportunidades-in-situ',user?.id],enabled:!!user&&acceso.permisos.estadisticas&&acceso.permisos.comercial,queryFn:()=>listarOportunidades(user!.id)})
 const [origenOportunidad,setOrigenOportunidad]=useState<Intervencion|null>(null),[detalleNegocio,setDetalleNegocio]=useState<EstadoOportunidad|null>(null)
 const [resolver,setResolver]=useState<Intervencion|null>(null)
 const [detalle,setDetalle]=useState<{titulo:string;filas:Intervencion[]}|null>(null)
 const registros=consulta.data??[],codigos=catalogoEstadisticas(catalogo.data??[])
 const filas=registros.filter(r=>(!ano||r.fecha.startsWith(ano))&&(!tipo||r.tipo===tipo)&&(!departamento||claveLugar(r.departamento)===departamento)&&(!ciudad||claveLugar(r.ciudad)===ciudad)&&(!zona||r.zona===zona)&&normalizar([r.referencia,r.serial,r.cliente,...(tipo==='preventivo'?[codigoServicio(r,codigos)]:[])].join(' ')).includes(normalizar(buscar)))
 const idsOrigen=new Set(filas.map(r=>r.id)),negocios=(oportunidades.data??[]).filter(o=>o.intervencion_id!==null&&idsOrigen.has(o.intervencion_id))
 const refs=(r:Intervencion)=>r.referencia.trim().toUpperCase(),servicios=(r:Intervencion)=>codigoServicio(r,codigos),ubicaciones=(r:Intervencion)=>agrupacionGeografica==='departamento'?(nombreDepartamento(r.departamento)||'Sin departamento'):(nombreCiudad(r.ciudad)||'Sin ciudad'),clientes=(r:Intervencion)=>r.cliente,motivos=(r:Intervencion)=>r.motivo_atencion?MOTIVOS_ATENCION[r.motivo_atencion]:'Sin clasificar',periodos=(r:Intervencion)=>r.periodicidad?`Cada ${r.periodicidad} días`:'Sin periodicidad',anos=(r:Intervencion)=>r.fecha.slice(0,4)
 const meses=Array.from({length:12},(_,i)=>({nombre:new Intl.DateTimeFormat('es-CO',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2025,i,1))),cantidad:filas.filter(r=>Number(r.fecha.slice(5,7))===i+1).length,mes:String(i+1).padStart(2,'0')}))
 const contexto=[TIPOS_INTERVENCION[tipo],ano?'Año '+ano:'Todos los años de intervención',departamento||'Todos los departamentos',ciudad||'Todas las ciudades',zona||'Todas las zonas',buscar?'Búsqueda: '+buscar:''].filter(Boolean).join(' · ')
 const conocidos=filas.filter(r=>claveEquipo(r)!==r.id),equipos=new Set(conocidos.map(claveEquipo)).size
 function abrir(titulo:string,filtro:(r:Intervencion)=>boolean){setDetalle({titulo,filas:filas.filter(filtro).sort((a,b)=>b.fecha.localeCompare(a.fecha))})}
 if(!acceso.permisos.estadisticas)return <Card>{acceso.isLoading?'Verificando permisos…':'No tienes acceso a las estadísticas de visitas in situ.'}</Card>
 return <div className="gestion-page reporte-visitas gm-analytics"><Header title="Estadísticas de intervenciones" subtitle="Equipos y códigos atendidos: distribución, volumen y trazabilidad de los servicios registrados" actions={<SelectorTipoServicio tipo={tipo} reporte="estadisticas"/>}/>

  <p className="reporte-ayuda">{tipo==='preventivo'?'Preventivos: referencias, códigos in situ y periodicidad acordada.':tipo==='correctivo'?'Correctivos: equipos atendidos, clientes y recurrencia de intervenciones.':'Informes de atención: funcionamiento, orientación al cliente y oportunidades comerciales.'}</p>
  <Card><details className="gm-analysis-filters"><summary><SlidersHorizontal size={17} aria-hidden="true"/><strong>Filtrar el análisis</strong><span>{[ano,departamento,ciudad,zona,buscar].filter(Boolean).length?`${[ano,departamento,ciudad,zona,buscar].filter(Boolean).length} filtros activos`:"Todos los años y ubicaciones"}</span><small>Editar filtros</small></summary><div className="gestion-toolbar reporte-filtros"><label>{tipo==='preventivo'?'Buscar equipo, serial, cliente o código':'Buscar equipo, serial o cliente'}<input style={INP} value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Ej. HI2020 o código de mantenimiento"/></label><label>Año de intervención<select style={INP} value={ano} onChange={e=>setAno(e.target.value)}><option value="">Todos los años</option>{[...new Set(registros.map(r=>r.fecha.slice(0,4)))].sort().reverse().map(a=><option key={a}>{a}</option>)}</select></label><label>Zona / hoja de origen<select style={INP} value={zona} onChange={e=>setZona(e.target.value)}><option value="">Todas</option>{[...new Set(registros.map(r=>r.zona))].sort().map(z=><option key={z}>{z}</option>)}</select></label><label>Departamento<select style={INP} value={departamento} onChange={e=>{setDepartamento(e.target.value);setCiudad('')}}><option value="">Todos</option>{opcionesLugar(registros.map(r=>r.departamento),'departamento').map(d=><option key={d.clave} value={d.clave}>{d.nombre}</option>)}</select></label><label>Ciudad<select style={INP} value={ciudad} onChange={e=>setCiudad(e.target.value)}><option value="">Todas</option>{opcionesLugar(registros.filter(r=>!departamento||claveLugar(r.departamento)===departamento).map(r=>r.ciudad)).map(c=><option key={c.clave} value={c.clave}>{c.nombre}</option>)}</select></label><label>Categorías por gráfico<select style={INP} value={limite} onChange={e=>setLimite(Number(e.target.value))}><option value={12}>Primeras 12</option><option value={20}>Primeras 20</option><option value={40}>Primeras 40</option></select></label><Button variant="link" onClick={()=>{setAno('');setDepartamento('');setCiudad('');setZona('');setBuscar('')}}>Limpiar filtros</Button></div></details></Card>
  {consulta.isLoading?<Card><p role="status">Cargando estadísticas…</p></Card>:consulta.error?<Card><p role="alert">No se pudieron cargar las intervenciones. <Button onClick={()=>consulta.refetch()}>Reintentar</Button></p></Card>:!filas.length?<Card><p className="gestion-empty">No hay intervenciones con estos filtros.</p></Card>:<>
   <dl className="reporte-metricas gm-analysis-metrics"><div><dt>Intervenciones</dt><dd>{filas.length}</dd></div><div><dt>Equipos identificados</dt><dd>{equipos}</dd><small>{filas.length-conocidos.length} registros sin serial identificable</small></div><div><dt>Referencias atendidas</dt><dd>{new Set(filas.map(r=>normalizar(r.referencia))).size}</dd></div><div><dt>Ciudades</dt><dd>{new Set(filas.filter(r=>claveLugar(r.ciudad)).map(r=>claveLugar(r.ciudad))).size}</dd></div></dl>
   <p className="reporte-ayuda">Cada barra cuenta intervenciones realizadas, no equipos únicos ni próximos vencimientos. Selecciona una barra o una categoría de su tabla para ver los registros que la componen.</p>
   <div className="reporte-graficos">
    <Grafico contexto={contexto} tema={tipo} indicador="referencias" titulo="Referencias de equipos intervenidos" datos={agruparIntervenciones(filas,refs)} limite={limite} elegir={n=>abrir('Referencia · '+n,r=>normalizar(refs(r))===normalizar(n))}/>
    {tipo==='preventivo'&&<Grafico contexto={contexto} tema={tipo} indicador="codigos" titulo="Códigos de mantenimiento in situ" datos={catalogo.error||catalogo.isLoading?[]:agruparIntervenciones(filas,servicios)} limite={limite} aviso={catalogo.isLoading?'Consultando catálogo…':catalogo.error?'Catálogo no disponible. Los otros gráficos siguen mostrando las intervenciones registradas.':'Cada referencia se compara con el código asignado actualmente en Mantenimiento in situ. Las referencias con el mismo código se suman en una barra.'} elegir={n=>abrir('Código del catálogo · '+n,r=>normalizar(servicios(r))===normalizar(n))}/>}
    {tipo==='preventivo'?<Grafico contexto={contexto} tema={tipo} indicador="periodicidad" titulo="Periodicidad de los preventivos" datos={agruparIntervenciones(filas,periodos)} limite={limite} elegir={n=>abrir(n,r=>periodos(r)===n)}/>:<Grafico contexto={contexto} tema={tipo} indicador="clientes" titulo={tipo==='atencion'?'Clientes con informes de atención':'Clientes con correctivos'} datos={agruparIntervenciones(filas,clientes)} limite={limite} elegir={n=>abrir(n,r=>normalizar(clientes(r))===normalizar(n))}/>}
    {tipo==='atencion'&&<Grafico contexto={contexto} tema={tipo} indicador="motivos" titulo="Motivos de los informes de atención" datos={agruparIntervenciones(filas,motivos)} limite={limite} elegir={n=>abrir(n,r=>motivos(r)===n)}/>}
    {tipo==='correctivo'&&<Grafico contexto={contexto} tema={tipo} indicador="recurrencia" titulo="Equipos con correctivos repetidos" datos={agruparIntervenciones(conocidos,r=>r.referencia+' · '+r.serial).filter(g=>g.cantidad>1)} limite={limite} elegir={n=>abrir(n,r=>r.referencia+' · '+r.serial===n)}/>}
    <Grafico contexto={contexto} tema={tipo} indicador="ubicacion" titulo={agrupacionGeografica==='departamento'?'Intervenciones por departamento':'Intervenciones por ciudad'} controles={<select style={INP} aria-label="Agrupar intervenciones por ciudad o departamento" value={agrupacionGeografica} onChange={e=>{const valor=e.target.value;setParams(prev=>{const p=new URLSearchParams(prev);if(valor==='departamento')p.set('agrupar','departamento');else p.delete('agrupar');return p})}}><option value="ciudad">Ciudades</option><option value="departamento">Departamentos</option></select>} datos={agruparIntervenciones(filas,ubicaciones)} limite={limite} elegir={n=>abrir((agrupacionGeografica==='departamento'?'Departamento':'Ciudad')+' · '+n,r=>normalizar(ubicaciones(r))===normalizar(n))}/>
    <Grafico contexto={contexto} tema={tipo} indicador="anos" titulo="Intervenciones por año" datos={agruparIntervenciones(filas,anos).sort((a,b)=>a.nombre.localeCompare(b.nombre))} limite={40} elegir={n=>abrir('Año · '+n,r=>anos(r)===n)}/>
    <Grafico contexto={contexto} tema={tipo} indicador="meses" titulo={'Intervenciones por mes · '+(ano||'todos los años')} datos={meses} limite={12} elegir={n=>abrir('Mes · '+n,r=>r.fecha.slice(5,7)===meses.find(m=>m.nombre===n)?.mes)}/>
    {acceso.permisos.comercial&&<Grafico contexto={contexto} tema="comercial" indicador="oportunidades" titulo="Oportunidades comerciales y cierres" datos={agruparIntervenciones(negocios,o=>ESTADOS_OPORTUNIDAD[o.estado])} limite={5} aviso={oportunidades.error?'No se pudo cargar el seguimiento comercial. Verifica su instalación SQL.':'Oportunidades originadas en las intervenciones filtradas, de cualquier tipo de servicio.'} elegir={n=>setDetalleNegocio(Object.entries(ESTADOS_OPORTUNIDAD).find(([,v])=>v===n)?.[0] as EstadoOportunidad)}/>}
   </div>
  </>}
  {detalleNegocio&&<Modal open title={'Oportunidades · '+ESTADOS_OPORTUNIDAD[detalleNegocio]} onClose={()=>setDetalleNegocio(null)} width={900}><div className="gestion-form"><p>El seguimiento y los cierres se actualizan en «Seguimiento comercial».</p><table className="gestion-table"><thead><tr><th>Oportunidad</th><th>Cliente / asesor</th><th>Cotización HANNA</th></tr></thead><tbody>{negocios.filter(o=>o.estado===detalleNegocio).map(o=><tr key={o.id}><td>{o.titulo}<small>{o.referencia} · {o.serial}</small></td><td>{o.cliente}<small>{o.asesor}</small></td><td>{o.cotizacion||'Pendiente'}</td></tr>)}</tbody></table></div></Modal>}
  {resolver&&<ResolverCodigoEstadisticas registro={resolver} catalogo={catalogo.data??[]} onClose={()=>setResolver(null)} onSaved={async()=>{const actual=await consulta.refetch();setDetalle(prev=>prev?{...prev,filas:prev.filas.map(r=>actual.data?.find(n=>n.id===r.id)??r)}:null)}}/>}
  {origenOportunidad&&<NuevaOportunidadInSitu registro={origenOportunidad} onClose={()=>setOrigenOportunidad(null)}/>}
  {detalle&&!resolver&&!origenOportunidad&&<Modal open title={detalle.titulo} onClose={()=>setDetalle(null)} width={1200}><div className="gestion-form reporte-detalle-estadisticas"><p>{detalle.filas.length} intervenciones · Se muestran hasta 100 registros.</p><div className="gestion-table-scroll"><table className="gestion-table"><thead><tr><th>Fecha</th><th>Referencia / serial</th><th>Razón social</th><th>Ciudad</th><th>Tipo / informe</th><th>Código in situ</th><th>Acciones</th></tr></thead><tbody>{detalle.filas.slice(0,100).map(r=><tr key={r.id}><td>{r.fecha}</td><td>{r.referencia}<small>{r.serial||'Sin serial'}</small></td><td>{r.cliente}</td><td>{nombreCiudad(r.ciudad)}<small>{nombreDepartamento(r.departamento)}</small></td><td>{TIPOS_INTERVENCION[r.tipo]}<small>Informe {r.informe||'—'}</small></td><td>{r.tipo==='preventivo'?codigoServicio(r,codigos):'No aplica'}</td><td>{onVerEquipo&&<Button variant="link" size="sm" onClick={()=>onVerEquipo(r)}>Ver / editar intervención</Button>}{acceso.permisos.oportunidades_crear&&<Button variant="link" size="sm" onClick={()=>setOrigenOportunidad(r)}>Crear oportunidad</Button>}{r.tipo==='preventivo'&&acceso.permisos.editar&&<Button variant="ghost" size="sm" onClick={()=>setResolver(r)}>{codigoServicio(r,codigos)==='Sin código asociado'?'Resolver código':'Editar código'}</Button>}</td></tr>)}</tbody></table></div></div></Modal>}
 </div>
}

function Grafico({indicador,...props}:ComponentProps<typeof GraficoBase>&{indicador:string}) {
 const [params]=useSearchParams()
 if(params.get('indicador')!==indicador)return null
 return <GraficoBase {...props} presentacionInicial={indicador==='meses'||indicador==='anos'?'columnas':'barras'}/>
}
