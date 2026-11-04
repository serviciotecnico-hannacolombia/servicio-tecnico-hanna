import {ObservacionesST} from './ObservacionesST'
import {ReflexionesGestion} from './ReflexionesGestion'
import {CentroOTST} from './otst/CentroOTST'
import {textoSeguimientoPozo} from './modeloPozo'
import {PozoImprevistos} from './PozoImprevistos'
import {AnalisisCostosSolicitudes} from './AnalisisCostosSolicitudes'
import {AparienciaGestion} from './AparienciaGestion'
import {colorEstadoGestion} from './temaGestion'
import {GraficoIntervenciones} from './GraficoIntervenciones'
import {IndiceGestion} from './IndiceGestion'
import {validarExportacionGestion} from './exportarGestion'
import {leerRutaGestion,rutaGestion,regresoGestion} from './rutasGestion'
import {OportunidadesInSitu} from './OportunidadesInSitu'
import {EstadisticasIntervenciones} from './EstadisticasIntervenciones'
import {usePermisosInSitu} from './usePermisosInSitu'
import {PerfilesAccesosInSitu} from './PerfilesAccesosInSitu'
import {useAlertasInSitu} from './useAlertasInSitu'
import {BuzonInSitu} from './BuzonInSitu'
import type {Intervencion} from './intervenciones'
import {ReporteInSitu} from './ReporteInSitu'
import {ReporteConsultas} from './ReporteConsultas'
import {useAccesoConsultas} from './useAccesoConsultas'
import {useState,type ReactNode} from 'react'
import {Link,useSearchParams,useLocation,useNavigate} from 'react-router-dom'
import {ChevronRight,MessageSquareText,Download,CalendarClock,ClipboardList,KeyRound,ArrowLeft,FileUp} from 'lucide-react'
import {toast} from './toastGestion'
import {Header} from './uiGestion'
import {Card} from './uiGestion'
import {Button} from './uiGestion'
import {Modal} from '../../components/ui/Modal'
import {Spinner} from '../../components/ui/Spinner'
import {INP} from '../mant-in-situ/ui'
import {fmtCOP} from '../mant-in-situ/hooks/useMantInSitu'
import {descargarCSV} from '../mant-in-situ/csv'
import {useGestionMantenimientos} from './useGestionMantenimientos'
import {ESTADOS_MANTENIMIENTO,type EstadoMantenimiento,type SolicitudMantenimiento} from './modelo'
import {VISTA_PREVIA_LOCAL,AVISO_GESTION_LOCAL} from './almacenamiento'
import './gestion.css'
const fecha=(s:string)=>new Date(s).toLocaleString('es-CO',{timeZone:'America/Bogota'})
function Semaforo({estado}:{estado:EstadoMantenimiento}) {
 const e=ESTADOS_MANTENIMIENTO[estado]
 return <span className="gestion-semaforo" style={{color:colorEstadoGestion(e.color)}}><span aria-hidden="true"/>{e.label}</span>
}
export function GestionMantenimientosPage() {
 return <AparienciaGestion>{selector=><ContenidoGestion selectorTema={selector}/>}</AparienciaGestion>
}
function ContenidoGestion({selectorTema}:{selectorTema:ReactNode}) {
 const {autorizado}=useGestionMantenimientos(),consultas=useAccesoConsultas()
 const visitas=usePermisosInSitu()
 const accesos=useAlertasInSitu(visitas.permisos.ver||visitas.permisos.gestionar_accesos)
 const location=useLocation(),navigate=useNavigate(),ruta=leerRutaGestion(location.pathname)
 if(!autorizado&&!consultas&&!visitas.permisos.ver&&!visitas.permisos.gestionar_accesos&&!visitas.permisos.observaciones_ver&&!visitas.permisos.observaciones_crear)return <Card>{visitas.isLoading?'Verificando acceso…':'No tienes acceso a Gestión de mantenimientos.'}</Card>
 const actual=ruta.seccion
 const reporteActual=ruta.seccion==='inicio'||location.pathname.replace(/\/+$/,'').endsWith('/reportes')?(consultas?'consultas':'visitas'):ruta.reporte
 const abrirEquipo=(r:Intervencion)=>navigate(rutaGestion('reportes','visitas',r.tipo)+'?equipo='+encodeURIComponent(r.id))
 const regreso=regresoGestion(location.pathname,location.search)
 return <div className="gestion-page gestion-directa">
  <header className="gestion-cabecera-directa"><div><span className="gm-eyebrow">HANNA / Servicio técnico</span><strong>Gestión de mantenimientos</strong><p>Centro de operaciones · Equipos, servicios y seguimiento</p></div><div className="gestion-acciones-cabecera">
   {selectorTema}
   {visitas.permisos.importar&&<Link className="gestion-llave" to={rutaGestion('en-hanna')+'?vista=configuracion'} title="Actualizar reportes: OTST, facturación y DB MANT IN SITU" aria-label="Actualizar reportes"><FileUp size={21} aria-hidden="true"/></Link>}
   {visitas.permisos.ver&&<BuzonInSitu compacto verEquipo={abrirEquipo}/>}
   {accesos.puedeAdministrarAccesos&&<Link className="gestion-llave" aria-label="Configurar perfiles y accesos" title="Perfiles, permisos y configuración" aria-current={actual==='accesos'?'page':undefined} to={rutaGestion('accesos')}><KeyRound size={21} aria-hidden="true"/></Link>}
  </div></header>
  {regreso&&<Link className="gm-regresar" to={regreso}><ArrowLeft size={17} aria-hidden="true"/>Regresar</Link>}
  {!ruta.valida?<Card>Este apartado de Gestión no existe.</Card>:actual==='inicio'?<SeleccionAmbitoGestion/>:actual==='observaciones'?<ObservacionesST/>:actual==='en-hanna'?<CentroOTST/>:actual==='in-situ'?<IndiceGestion solicitudes={autorizado} consultas={consultas} permisos={visitas.permisos}/>:actual==='comercial'?<OportunidadesInSitu/>:actual==='accesos'?<PerfilesAccesosInSitu/>:actual==='solicitudes'?<SolicitudesMantenimientos/>:<>
   {reporteActual==='estadisticas'?(new URLSearchParams(location.search).has('indicador')?<EstadisticasIntervenciones key={location.pathname} onVerEquipo={abrirEquipo}/>:<IndiceGestion soloIndicadores solicitudes={autorizado} consultas={consultas} permisos={visitas.permisos}/>):reporteActual==='visitas'?<ReporteInSitu key={location.pathname}/>:<ReporteConsultas/>}
  </>}

 </div>
}
function SeleccionAmbitoGestion() {
 const {permisos}=usePermisosInSitu()
 const apartados = [
  { ruta: 'in-situ', titulo: 'Mantenimiento in situ', detalle: 'Visitas, equipos y solicitudes en las instalaciones del cliente.', Icono: CalendarClock },
  { ruta: 'en-hanna', titulo: 'Mantenimiento en HANNA', detalle: 'Órdenes OTST, calibraciones y facturación en taller.', Icono: ClipboardList },
  { ruta: 'observaciones', titulo: 'Novedades OTST', detalle: 'Notas de servicio y justificaciones mensuales de OTST vencidas.', Icono: MessageSquareText },
 ] as const
 return (
  <section className="gm-selector-servicios">
   <Header title="Áreas de mantenimiento" />
   <nav aria-label="Áreas de mantenimiento">
    {apartados.filter(({ruta}) => ruta !== 'observaciones' || permisos.observaciones_ver || permisos.observaciones_crear).map(({ruta, titulo, detalle, Icono}) => (
     <Link key={ruta} to={rutaGestion(ruta)} data-area={ruta}>
      <Icono className="gm-area-icono" size={20} aria-hidden="true" />
      <div><h2>{titulo}</h2><p>{detalle}</p></div>
      <ChevronRight size={17} aria-hidden="true" />
     </Link>
    ))}
   </nav>
   <ReflexionesGestion/>
  </section>
 )
}
function SolicitudesMantenimientos() {
  const consulta=useGestionMantenimientos()
  const [params,setParams]=useSearchParams()
  const indicadores=params.get('vista')==='indicadores',personalizado=params.get('detalle')==='personalizado'
  function cambiarVista(valor:boolean){setParams(prev=>{const p=new URLSearchParams(prev);if(valor)p.set('vista','indicadores');else p.delete('vista');p.delete('solicitud');return p})}
  function abrirSolicitud(id:string){setParams(prev=>{const p=new URLSearchParams(prev);p.set('solicitud',id);return p})}
  function cerrarSolicitud(){setParams(prev=>{const p=new URLSearchParams(prev);p.delete('solicitud');return p})}
  const [buscar,setBuscar]=useState(''),[estado,setEstado]=useState(''),[clase,setClase]=useState('reales')
  const registros=consulta.data??[]
  const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  const universo=registros.filter(r=>clase==='todas'||(clase==='pruebas'?!!r.es_prueba:!r.es_prueba))
  const reales=registros.filter(r=>!r.es_prueba)
  const filas=universo.filter(r=>(!estado||r.estado===estado)&&norm([r.id,r.cliente,r.origen,r.destino,r.cotizacion??''].join(' ')).includes(norm(buscar)))
  const seleccion=registros.find(r=>r.id===params.get('solicitud'))
  async function exportar() {
   try{if(!consulta.puedeExportar)throw Error('No tienes permiso para exportar solicitudes.');await validarExportacionGestion('solicitudes')
    const seguro=(v:string)=>/^[=+@\-\t\r]/.test(v)?"'"+v:v
    descargarCSV('gestion-mantenimientos',['id','tipo_solicitud','creado','cliente','origen','origen_codigo_dane','origen_departamento','destino','destino_codigo_dane','destino_departamento','cotizacion','estado','transporte','dias','subtotal','margen_5_pct','total_antes_iva','creado_por'],filas.map(r=>[r.id,r.es_prueba?'Prueba':'Real',r.created_at,seguro(r.cliente),seguro(r.origen),r.calculo.ubicaciones?.origen.codigo??'',r.calculo.ubicaciones?.origen.departamento??'',seguro(r.destino),r.calculo.ubicaciones?.destino.codigo??'',r.calculo.ubicaciones?.destino.departamento??'',seguro(r.cotizacion??''),ESTADOS_MANTENIMIENTO[r.estado].label,r.calculo.transporte.viaje,r.calculo.dias,r.calculo.subtotal,r.calculo.margen,r.calculo.total,seguro(r.creado_por_nombre)]))
   }catch(error){toast.error((error as Error).message)}
  }
  async function respaldo() {
   try{if(!consulta.puedeExportar)throw Error('No tienes permiso para exportar solicitudes.');await validarExportacionGestion('solicitudes')
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,exportado_at:new Date().toISOString(),vista_previa:VISTA_PREVIA_LOCAL,solicitudes:registros},null,2)],{type:'application/json'}))
    const a=document.createElement('a');a.href=url;a.download='gestion-mantenimientos-respaldo.json';a.click();URL.revokeObjectURL(url)
   }catch(error){toast.error((error as Error).message)}
  }
  if(!consulta.autorizado)return <Card>Este apartado está disponible para Servicio Técnico con acceso a Gestión de mantenimientos.</Card>
  return <div className="gestion-page">
    <Header title="Control de solicitudes in situ" subtitle="Libro de trabajo de solicitudes, cotizaciones asociadas y seguimiento del cliente" actions={consulta.puedeCrear?<Link to="/mant-in-situ-regional">Nueva solicitud desde Personalizado →</Link>:undefined}/>
    {VISTA_PREVIA_LOCAL&&<p className="gestion-preview">{AVISO_GESTION_LOCAL}</p>}
    <div className="solicitudes-cambio-vista">{!indicadores&&<Button variant="ghost" onClick={()=>cambiarVista(true)}>Ver indicadores y análisis de costos →</Button>}<p className="reporte-ayuda">{indicadores?'Estadísticas de solicitudes reales. Las pruebas no se incluyen.':'Busca una solicitud o filtra por estado para gestionar su seguimiento.'}</p></div>
    {indicadores?<div className="gestion-page">
    {!consulta.isLoading&&!consulta.error&&<PozoImprevistos registros={registros} abrir={abrirSolicitud}/>}
    <label className="solicitudes-detalles">¿Qué detalles quieres consultar?<select style={INP} value={personalizado?'personalizado':'basico'} onChange={e=>{const valor=e.target.value;setParams(prev=>{const p=new URLSearchParams(prev);if(valor==='personalizado')p.set('detalle',valor);else p.delete('detalle');return p})}}><option value="basico">Detalles básicos · estados y avance</option><option value="personalizado">Detalles personalizados · costos y viajes</option></select></label>
    {personalizado?<AnalisisCostosSolicitudes registros={registros} abrir={abrirSolicitud}/>:<>

    <dl className="reporte-metricas"><div><dt>Solicitudes reales</dt><dd>{reales.length}</dd></div><div><dt>Esperando cotización</dt><dd>{reales.filter(r=>r.estado==='pendiente').length}</dd></div><div><dt>Esperando cliente</dt><dd>{reales.filter(r=>r.estado==='cotizada').length}</dd></div><div><dt>Aprobadas / en ejecución</dt><dd>{reales.filter(r=>['aprobada','programada'].includes(r.estado)).length}</dd></div></dl>
    <section className="solicitudes-graficas"><h3>Indicadores de seguimiento</h3><div className="reporte-graficos"><GraficoIntervenciones contexto="Todos los años de creación · Solicitudes reales · Estado actual · Pruebas excluidas" tema="comercial" titulo="Solicitudes reales por estado" datos={Object.entries(ESTADOS_MANTENIMIENTO).map(([k,v])=>({nombre:v.label,cantidad:reales.filter(r=>r.estado===k).length}))} limite={7} elegir={nombre=>{const clave=Object.entries(ESTADOS_MANTENIMIENTO).find(([,v])=>v.label===nombre)?.[0];if(clave){setClase('reales');setEstado(clave);cambiarVista(false)}}}/><Card><h3>Cotizaciones y avance</h3><dl className="gestion-breakdown"><div><dt>Con cotización asociada</dt><dd>{reales.filter(r=>r.cotizacion).length}</dd></div><div><dt>Sin cotización asociada</dt><dd>{reales.filter(r=>!r.cotizacion).length}</dd></div><div><dt>Valor estimado aprobado / programado</dt><dd>{fmtCOP(reales.filter(r=>['aprobada','programada'].includes(r.estado)).reduce((n,r)=>n+r.calculo.total,0))}</dd></div><div><dt>Margen 5 % aprobado / programado / realizado</dt><dd>{fmtCOP(reales.filter(r=>['aprobada','programada','realizada'].includes(r.estado)).reduce((n,r)=>n+r.calculo.margen,0))}</dd></div><div><dt>Servicios realizados</dt><dd>{reales.filter(r=>r.estado==='realizada').length}</dd></div></dl><p className="reporte-ayuda">Los importes son estimaciones de las solicitudes antes de IVA; no representan facturación ni recaudo.</p><p>Selecciona un estado de la gráfica para revisar sus solicitudes y números de cotización en el libro de trabajo.</p></Card></div></section>
    </>}
    </div>:<>
    <Card><div className="gestion-toolbar"><label>Mostrar<select style={INP} value={clase} onChange={e=>setClase(e.target.value)}><option value="reales">Solicitudes reales</option><option value="pruebas">Solicitudes de prueba</option><option value="todas">Todas las solicitudes</option></select></label><label>Buscar<input style={INP} placeholder="Cliente, cotización, origen o destino" value={buscar} onChange={e=>setBuscar(e.target.value)}/></label><label>Estado<select style={INP} value={estado} onChange={e=>setEstado(e.target.value)}><option value="">Todos</option>{Object.entries(ESTADOS_MANTENIMIENTO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>{consulta.puedeExportar&&<Button variant="ghost" disabled={!filas.length} onClick={exportar}><Download size={16}/> Exportar CSV</Button>}{consulta.puedeExportar&&<Button variant="ghost" disabled={!registros.length} onClick={respaldo}>Respaldo JSON</Button>}</div>
    {consulta.isLoading?<Spinner/>:consulta.error?<p role="alert">{consulta.error instanceof Error?consulta.error.message:'No se pudieron cargar las solicitudes.'} <Button variant="ghost" onClick={()=>consulta.refetch()}>Reintentar</Button></p>:<div className="gestion-table-scroll"><table className="gestion-table"><thead><tr><th>Cliente / creación</th><th>Trayecto</th><th>Cotización</th><th>Estado</th><th>Total antes de IVA</th><th>Seguimiento</th></tr></thead><tbody>{filas.map(r=><tr key={r.id}><td><strong>{r.cliente}</strong>{r.es_prueba&&<small className="solicitud-prueba">Solicitud de prueba</small>}<small>{fecha(r.created_at)}</small></td><td>{r.origen}<small>→ {r.destino}</small></td><td>{r.cotizacion||'Por asociar'}</td><td><Semaforo estado={r.estado}/></td><td>{fmtCOP(r.calculo.total)}</td><td><Button variant="ghost" size="sm" onClick={()=>abrirSolicitud(r.id)}>{consulta.puedeEditar?'Ver / actualizar':'Ver detalle'}</Button></td></tr>)}</tbody></table>{!filas.length&&<p className="gestion-empty">No hay solicitudes con estos filtros. Guarda una desde el cálculo personalizado.</p>}</div>}
    </Card>
    </>}
    {seleccion&&<Detalle key={seleccion.id+'-'+seleccion.revision} solicitud={seleccion} editar={consulta.puedeEditar} onClose={cerrarSolicitud} actualizar={consulta.actualizar} clasificar={consulta.clasificar}/>}
  </div>
}
function Detalle({solicitud:s,onClose,actualizar,editar,clasificar}:{clasificar:(s:SolicitudMantenimiento,prueba:boolean)=>Promise<SolicitudMantenimiento>;editar:boolean,solicitud:SolicitudMantenimiento,onClose:()=>void,actualizar:(s:SolicitudMantenimiento,e:EstadoMantenimiento,c:string,n:string)=>Promise<SolicitudMantenimiento>}) {
  const [prueba,setPrueba]=useState(!!s.es_prueba)
  const [estado,setEstado]=useState(s.estado),[cotizacion,setCotizacion]=useState(s.cotizacion??''),[nota,setNota]=useState(''),[saving,setSaving]=useState(false)
  async function guardar(e:React.FormEvent) {
    e.preventDefault();if(saving)return;setSaving(true)
    try {await actualizar(s,estado,cotizacion,nota);toast.success('Seguimiento actualizado');onClose()}catch(e){toast.error(e instanceof Error?e.message:'No se pudo actualizar')}finally{setSaving(false)}
  }
  const d=s.calculo.desglose
  return <Modal open onClose={()=>{if(!saving)onClose()}} title={'Solicitud · '+s.cliente} width={800}>
    <div className="gestion-form"><Semaforo estado={s.estado}/><p><strong>Origen:</strong> {s.origen}<br/><strong>Destino final:</strong> {s.destino}<br/><strong>Solicitante:</strong> {s.creado_por_nombre}<br/><strong>Creada:</strong> {fecha(s.created_at)}<br/><strong>ID:</strong> {s.id}</p>
      <details><summary>Ver cálculo guardado</summary><p>Transporte: {s.calculo.transporte.viaje} · {s.calculo.dias} día(s)</p><ul>{s.calculo.items.map(i=><li key={i.referencia}>{i.referencia} · {i.nombre} × {i.cantidad} · base {fmtCOP(Number(i.precio))} c/u</li>)}</ul><dl className="gestion-breakdown">{Object.entries({Base:d.base,Tiquetes:d.tiquetes,Depreciación:d.depreciacion,Gasolina:d.gasolina,Peajes:d.peajes,'Desplazamiento terrestre':d.desplazamiento,Hospedaje:d.hospedaje,Alimentación:d.alimentacion,Otros:d.otros,Subtotal:s.calculo.subtotal,'Margen de error (5 %)':s.calculo.margen,'Total antes de IVA':s.calculo.total}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{fmtCOP(v)}</dd></div>)}</dl></details>
      {editar&&<form onSubmit={guardar} className="gestion-form-fields"><label>Número de cotización<input style={INP} maxLength={100} value={cotizacion} onChange={e=>setCotizacion(e.target.value)}/></label><label>Estado<select style={INP} value={estado} onChange={e=>setEstado(e.target.value as EstadoMantenimiento)}>{Object.entries(ESTADOS_MANTENIMIENTO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><label>Observación / motivo<textarea style={INP} rows={3} maxLength={2000} required={['rechazada','cancelada'].includes(estado)} value={nota} onChange={e=>setNota(e.target.value)}/></label><p>Para marcar cotizada, aprobada, rechazada, programada o realizada, asocia la cotización. El rechazo y la cancelación requieren motivo.</p><Button type="submit" disabled={saving}>{saving?'Guardando…':'Guardar seguimiento'}</Button></form>}
      {editar&&<section className="solicitud-clasificacion"><h3>Tipo de solicitud</h3><label><input type="checkbox" checked={prueba} onChange={e=>setPrueba(e.target.checked)} disabled={saving}/> Solicitud de prueba / ejemplo</label><p>Se conserva el registro y su historial. Las pruebas no cuentan en los indicadores de gestión real.</p><Button variant="ghost" disabled={saving||prueba===!!s.es_prueba} onClick={async()=>{setSaving(true);try{await clasificar(s,prueba);toast.success('Clasificación guardada');onClose()}catch(e){toast.error((e as Error).message)}finally{setSaving(false)}}}>Guardar clasificación</Button></section>}
      <h3>Historial de seguimiento</h3><ol className="gestion-history">{[...s.historial].reverse().map((h,i)=><li key={i}><Semaforo estado={h.estado}/><small>{fecha(h.fecha)} · {h.usuario}</small><p>{textoSeguimientoPozo(h.nota)}</p>{h.cotizacion&&<p>Cotización: {h.cotizacion}</p>}</li>)}</ol>
    </div>
  </Modal>
}
