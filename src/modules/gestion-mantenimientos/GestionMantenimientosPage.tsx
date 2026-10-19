import {ReporteConsultas} from './ReporteConsultas'
import {useAccesoConsultas} from './useAccesoConsultas'
import {useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {Download} from 'lucide-react'
import {toast} from 'sonner'
import {Header} from '../../components/layout/Header'
import {Card} from '../../components/ui/Card'
import {Button} from '../../components/ui/Button'
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
 return <span className="gestion-semaforo" style={{color:e.color}}><span aria-hidden="true"/>{e.label}</span>
}
export function GestionMantenimientosPage() {
 const {autorizado}=useGestionMantenimientos(),reportes=useAccesoConsultas()
 const [seccion,setSeccion]=useState<'solicitudes'|'consultas'>('solicitudes')
 if(!autorizado&&!reportes)return <Card>No tienes acceso a Gestión de mantenimientos.</Card>
 const actual=autorizado?seccion:'consultas'
 return <div className="gestion-page"><nav className="regional-tabs" aria-label="Secciones de Gestión de mantenimientos">{autorizado&&<button aria-pressed={actual==='solicitudes'} onClick={()=>setSeccion('solicitudes')}>Solicitudes y seguimiento</button>}{reportes&&<button aria-pressed={actual==='consultas'} onClick={()=>setSeccion('consultas')}>Registro de consultas</button>}</nav>{actual==='consultas'?<ReporteConsultas/>:<SolicitudesMantenimientos/>}</div>
}
function SolicitudesMantenimientos() {
  const consulta=useGestionMantenimientos()
  const [params,setParams]=useSearchParams()
  const [buscar,setBuscar]=useState(''),[estado,setEstado]=useState('')
  const registros=consulta.data??[]
  const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  const filas=registros.filter(r=>(!estado||r.estado===estado)&&norm([r.id,r.cliente,r.origen,r.destino,r.cotizacion??''].join(' ')).includes(norm(buscar)))
  const seleccion=registros.find(r=>r.id===params.get('solicitud'))
  function exportar() {
    const seguro=(v:string)=>/^[=+@\-\t\r]/.test(v)?"'"+v:v
    descargarCSV('gestion-mantenimientos',['id','creado','cliente','origen','origen_codigo_dane','origen_departamento','destino','destino_codigo_dane','destino_departamento','cotizacion','estado','transporte','dias','subtotal','margen_5_pct','total_antes_iva','creado_por'],filas.map(r=>[r.id,r.created_at,seguro(r.cliente),seguro(r.origen),r.calculo.ubicaciones?.origen.codigo??'',r.calculo.ubicaciones?.origen.departamento??'',seguro(r.destino),r.calculo.ubicaciones?.destino.codigo??'',r.calculo.ubicaciones?.destino.departamento??'',seguro(r.cotizacion??''),ESTADOS_MANTENIMIENTO[r.estado].label,r.calculo.transporte.viaje,r.calculo.dias,r.calculo.subtotal,r.calculo.margen,r.calculo.total,seguro(r.creado_por_nombre)]))
  }
  function respaldo() {
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,exportado_at:new Date().toISOString(),vista_previa:VISTA_PREVIA_LOCAL,solicitudes:registros},null,2)],{type:'application/json'}))
    const a=document.createElement('a');a.href=url;a.download='gestion-mantenimientos-respaldo.json';a.click();URL.revokeObjectURL(url)
  }
  if(!consulta.autorizado)return <Card>Este apartado está disponible para Servicio Técnico con acceso a Gestión de mantenimientos.</Card>
  return <div className="gestion-page">
    <Header title="Gestión de mantenimientos" subtitle="Solicitudes, cotizaciones y seguimiento de la decisión del cliente" actions={<Link to="/mant-in-situ-regional">Nueva solicitud desde Personalizado →</Link>}/>
    {VISTA_PREVIA_LOCAL&&<p className="gestion-preview">{AVISO_GESTION_LOCAL}</p>}
    <div className="gestion-counts">{Object.entries(ESTADOS_MANTENIMIENTO).map(([k,v])=><button key={k} onClick={()=>setEstado(estado===k?'':k)} aria-pressed={estado===k}><Semaforo estado={k as EstadoMantenimiento}/><strong>{registros.filter(r=>r.estado===k).length}</strong><span className="sr-only">{v.label}</span></button>)}</div>
    <Card><div className="gestion-toolbar"><label>Buscar<input style={INP} placeholder="Cliente, cotización, origen o destino" value={buscar} onChange={e=>setBuscar(e.target.value)}/></label><label>Estado<select style={INP} value={estado} onChange={e=>setEstado(e.target.value)}><option value="">Todos</option>{Object.entries(ESTADOS_MANTENIMIENTO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><Button variant="ghost" disabled={!filas.length} onClick={exportar}><Download size={16}/> Exportar CSV</Button><Button variant="ghost" disabled={!registros.length} onClick={respaldo}>Respaldo JSON</Button></div>
    {consulta.isLoading?<Spinner/>:consulta.error?<p role="alert">{consulta.error instanceof Error?consulta.error.message:'No se pudieron cargar las solicitudes.'} <Button variant="ghost" onClick={()=>consulta.refetch()}>Reintentar</Button></p>:<div className="gestion-table-scroll"><table className="gestion-table"><thead><tr><th>Cliente / creación</th><th>Trayecto</th><th>Cotización</th><th>Estado</th><th>Total antes de IVA</th><th>Seguimiento</th></tr></thead><tbody>{filas.map(r=><tr key={r.id}><td><strong>{r.cliente}</strong><small>{fecha(r.created_at)}</small></td><td>{r.origen}<small>→ {r.destino}</small></td><td>{r.cotizacion||'Por asociar'}</td><td><Semaforo estado={r.estado}/></td><td>{fmtCOP(r.calculo.total)}</td><td><Button variant="ghost" size="sm" onClick={()=>setParams({solicitud:r.id})}>Ver / actualizar</Button></td></tr>)}</tbody></table>{!filas.length&&<p className="gestion-empty">No hay solicitudes con estos filtros. Guarda una desde el cálculo personalizado.</p>}</div>}
    </Card>
    {seleccion&&<Detalle key={seleccion.id+'-'+seleccion.revision} solicitud={seleccion} onClose={()=>setParams({})} actualizar={consulta.actualizar}/>}
  </div>
}
function Detalle({solicitud:s,onClose,actualizar}:{solicitud:SolicitudMantenimiento,onClose:()=>void,actualizar:(s:SolicitudMantenimiento,e:EstadoMantenimiento,c:string,n:string)=>Promise<SolicitudMantenimiento>}) {
  const [estado,setEstado]=useState(s.estado),[cotizacion,setCotizacion]=useState(s.cotizacion??''),[nota,setNota]=useState(''),[saving,setSaving]=useState(false)
  async function guardar(e:React.FormEvent) {
    e.preventDefault();if(saving)return;setSaving(true)
    try {await actualizar(s,estado,cotizacion,nota);toast.success('Seguimiento actualizado');onClose()}catch(e){toast.error(e instanceof Error?e.message:'No se pudo actualizar')}finally{setSaving(false)}
  }
  const d=s.calculo.desglose
  return <Modal open onClose={()=>{if(!saving)onClose()}} title={'Solicitud · '+s.cliente} width={800}>
    <div className="gestion-form"><Semaforo estado={s.estado}/><p><strong>Origen:</strong> {s.origen}<br/><strong>Destino final:</strong> {s.destino}<br/><strong>Solicitante:</strong> {s.creado_por_nombre}<br/><strong>Creada:</strong> {fecha(s.created_at)}<br/><strong>ID:</strong> {s.id}</p>
      <details><summary>Ver cálculo guardado</summary><p>Transporte: {s.calculo.transporte.viaje} · {s.calculo.dias} día(s)</p><ul>{s.calculo.items.map(i=><li key={i.referencia}>{i.referencia} · {i.nombre} × {i.cantidad} · base {fmtCOP(Number(i.precio))} c/u</li>)}</ul><dl className="gestion-breakdown">{Object.entries({Base:d.base,Tiquetes:d.tiquetes,Depreciación:d.depreciacion,Gasolina:d.gasolina,Peajes:d.peajes,'Desplazamiento terrestre':d.desplazamiento,Hospedaje:d.hospedaje,Alimentación:d.alimentacion,Otros:d.otros,Subtotal:s.calculo.subtotal,'Margen de error (5 %)':s.calculo.margen,'Total antes de IVA':s.calculo.total}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{fmtCOP(v)}</dd></div>)}</dl></details>
      <form onSubmit={guardar} className="gestion-form-fields"><label>Número de cotización<input style={INP} maxLength={100} value={cotizacion} onChange={e=>setCotizacion(e.target.value)}/></label><label>Estado<select style={INP} value={estado} onChange={e=>setEstado(e.target.value as EstadoMantenimiento)}>{Object.entries(ESTADOS_MANTENIMIENTO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><label>Observación / motivo<textarea style={INP} rows={3} maxLength={2000} required={['rechazada','cancelada'].includes(estado)} value={nota} onChange={e=>setNota(e.target.value)}/></label><p>Para marcar cotizada, aprobada, rechazada, programada o realizada, asocia la cotización. El rechazo y la cancelación requieren motivo.</p><Button type="submit" disabled={saving}>{saving?'Guardando…':'Guardar seguimiento'}</Button></form>
      <h3>Historial de seguimiento</h3><ol className="gestion-history">{[...s.historial].reverse().map((h,i)=><li key={i}><Semaforo estado={h.estado}/><small>{fecha(h.fecha)} · {h.usuario}</small><p>{h.nota}</p>{h.cotizacion&&<p>Cotización: {h.cotizacion}</p>}</li>)}</ol>
    </div>
  </Modal>
}
