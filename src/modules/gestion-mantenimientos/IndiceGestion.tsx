import {Link,useLocation} from 'react-router-dom'
import {Header} from './uiGestion'
import {rutaGestion,type TipoRuta} from './rutasGestion'
import type {PermisosInSitu} from './permisosInSitu'
import {ArrowUpRight,BookOpen,ChartNoAxesCombined,ClipboardList,History,BriefcaseBusiness} from 'lucide-react'
export function IndiceGestion({solicitudes,consultas,permisos:p,soloIndicadores=false}:{solicitudes:boolean;consultas:boolean;permisos:PermisosInSitu;soloIndicadores?:boolean}) {
 const location=useLocation(),seleccion=new URLSearchParams(location.search).get('servicio')
 const tipos:{tipo:TipoRuta;nombre:string}[]=[{tipo:'preventivo',nombre:'Mantenimiento preventivo'},{tipo:'correctivo',nombre:'Mantenimiento correctivo'},{tipo:'atencion',nombre:'Informes de atención'}]
 function indicadores(tipo:TipoRuta){return [
  ['referencias','Referencias de equipos intervenidos'],
  ...(tipo==='preventivo'?[['codigos','Códigos de mantenimiento in situ'],['periodicidad','Periodicidad de los servicios']]:[['clientes','Clientes atendidos']]),
  ...(tipo==='correctivo'?[['recurrencia','Equipos con correctivos repetidos']]:tipo==='atencion'?[['motivos','Motivos de atención']]:[]),
  ['ubicacion','Intervenciones por ciudad o departamento'],['anos','Intervenciones por año'],['meses','Intervenciones por mes'],
  ...(p.comercial?[['oportunidades','Oportunidades y cierres comerciales']]:[])]}
 const tareas=[
  {visible:p.ver, titulo:'Historial de equipos', descripcion:'Encuentra un equipo o cliente y consulta sus servicios, fechas y próximos mantenimientos.', detalle:'Referencia · Serial · Ubicación · Año', icono:BookOpen, to:rutaGestion('reportes','visitas','preventivo')+'?vista=historial'},
  {visible:solicitudes, titulo:'Solicitudes y cotizaciones', descripcion:'Organiza las solicitudes y consulta la decisión del cliente en cada etapa.', detalle:'Solicitudes · Estados · Costos de viaje', icono:ClipboardList, to:rutaGestion('solicitudes')},
  {visible:p.comercial, titulo:'Oportunidades comerciales', descripcion:'Relaciona las necesidades detectadas con oportunidades, cotizaciones y cierres.', detalle:'OS · Cotización · Seguimiento', icono:BriefcaseBusiness, to:rutaGestion('comercial')},
  {visible:consultas, titulo:'Consultas de mantenimiento', descripcion:'Revisa las consultas realizadas en los cotizadores, sus usuarios y equipos.', detalle:'Usuario · Razón social · Equipo', icono:History, to:rutaGestion('reportes','consultas')},
  {visible:p.estadisticas, titulo:'Indicadores y reportes', descripcion:'Explora tendencias, distribución geográfica y servicios por tipo de intervención.', detalle:'Preventivo · Correctivo · Atención', icono:ChartNoAxesCombined, to:rutaGestion('reportes','estadisticas')},
  {visible:p.estadisticas, titulo:'Facturación in situ', descripcion:'Facturas, notas crédito y neto para la meta.', detalle:'Valores facturados · No recaudo', icono:ChartNoAxesCombined, to:rutaGestion('en-hanna')+'?vista=facturacion&segmento=in-situ&origen=in-situ'},
  {visible:p.ver, titulo:'Trazabilidad del equipo', descripcion:'Consulta los servicios OTST e in situ por referencia, serial y cliente.', detalle:'Historial entre ambos segmentos', icono:History, to:rutaGestion('en-hanna')+'?vista=trazabilidad&origen=in-situ'},
 ]
 return <div className={soloIndicadores?'gestion-indice gm-analysis-index':'gestion-indice'}><Header title={soloIndicadores?'Indicadores de mantenimiento in situ':'Mantenimiento in situ'} subtitle={soloIndicadores?"Primero elige el tipo de servicio. Después, el indicador que responde a tu consulta.":"¿Qué necesitas gestionar hoy? Accede al historial o elige una tarea para continuar."}/>
  {!soloIndicadores&&<nav className="gm-tareas" aria-label="Tareas de mantenimiento in situ">{tareas.filter(t=>t.visible).map(t=><Link key={t.to} to={t.to} className="gm-tarea"><div className="gm-tarea-icono"><t.icono size={23} aria-hidden="true"/></div><div><h2>{t.titulo}</h2><p>{t.descripcion}</p><small>{t.detalle}</small></div><ArrowUpRight className="gm-tarea-flecha" size={19} aria-hidden="true"/></Link>)}</nav>}
  {soloIndicadores&&p.estadisticas&&!tipos.some(t=>t.tipo===seleccion)&&<div className="gestion-indice-indicadores">{tipos.map(t=><section key={t.tipo}><h2>{t.nombre}</h2><p>{t.tipo==='preventivo'?'Equipos atendidos, códigos y frecuencia del servicio.':t.tipo==='correctivo'?'Equipos atendidos y repetición de correctivos.':'Revisiones de funcionamiento y orientación al cliente.'}</p><ul><li><Link to={rutaGestion('reportes','estadisticas',t.tipo)+'?servicio='+t.tipo}>Elegir indicadores →</Link></li></ul></section>)}</div>}
  {soloIndicadores&&p.estadisticas&&tipos.some(t=>t.tipo===seleccion)&&<div className="gestion-indice-indicadores">{tipos.filter(t=>t.tipo===seleccion).map(t=><section key={t.tipo}><h2>Indicadores · {t.nombre.toLowerCase()}</h2><ul>{indicadores(t.tipo).map(([id,nombre])=><li key={id}><Link to={rutaGestion('reportes','estadisticas',t.tipo)+'?indicador='+id}>{nombre}<span aria-hidden="true"> →</span></Link></li>)}</ul></section>)}</div>}
 </div>
}
