import {useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import {useUser} from '../../hooks/useUser'
import {Card} from '../../components/ui/Card'
import {Spinner} from '../../components/ui/Spinner'
import {Button} from '../../components/ui/Button'
import {INP} from '../mant-in-situ/ui'
import {fmtCOP} from '../mant-in-situ/hooks/useMantInSitu'
import {descargarCSV} from '../mant-in-situ/csv'
import {useAccesoConsultas} from './useAccesoConsultas'
import {leerConsultas} from './registroConsultas'
import {VISTA_PREVIA_LOCAL} from './almacenamiento'
export function ReporteConsultas() {
 const autorizado=useAccesoConsultas(),{user}=useUser()
 const consulta=useQuery({queryKey:['mantenimiento-consultas',user?.id,VISTA_PREVIA_LOCAL],enabled:autorizado,queryFn:leerConsultas})
 const [buscar,setBuscar]=useState(''),[modulo,setModulo]=useState(''),[desde,setDesde]=useState(''),[hasta,setHasta]=useState('')
 const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 const fechaLocal=(s:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s))
 const filas=(consulta.data??[]).filter(r=>(!modulo||r.modulo===modulo)&&(!desde||fechaLocal(r.created_at)>=desde)&&(!hasta||fechaLocal(r.created_at)<=hasta)&&norm([r.razon_social,r.usuario_nombre,r.usuario_email,r.departamento,r.municipio,...r.equipos.map(e=>e.referencia+' '+e.nombre)].join(' ')).includes(norm(buscar)))
 function exportar() {
  const seguro=(s:string)=>/^[=+@\-\t\r]/.test(s)?"'"+s:s
  descargarCSV('consultas-mantenimientos',['consulta_id','fecha_utc','fecha_bogota','calculadora','razon_social','usuario','correo','origen','codigo_destino','departamento','municipio','referencia','equipo','cantidad','dias','total_consulta_antes_iva'],filas.flatMap(r=>r.equipos.map(e=>[r.id,r.created_at,fechaLocal(r.created_at),r.modulo,seguro(r.razon_social),seguro(r.usuario_nombre),seguro(r.usuario_email),seguro(r.origen),r.destino_codigo,seguro(r.departamento),seguro(r.municipio),seguro(e.referencia),seguro(e.nombre),e.cantidad,r.dias,r.total])))
 }
 if(!autorizado)return <Card>No tienes permiso para ver los registros de consultas.</Card>
 return <div className="gestion-page"><h2>Registro de consultas · Normal y regional</h2>
 {VISTA_PREVIA_LOCAL&&<p className="gestion-preview">Vista previa: este registro reúne solo consultas realizadas en este navegador. El registro compartido requiere aplicar el SQL preparado.</p>}
 <Card><div className="gestion-toolbar"><label>Buscar<input style={INP} placeholder="Razón social, usuario, equipo o ciudad" value={buscar} onChange={e=>setBuscar(e.target.value)}/></label><label>Calculadora<select style={INP} value={modulo} onChange={e=>setModulo(e.target.value)}><option value="">Todas</option><option value="normal">Normal · Bogotá</option><option value="regional">Regional</option></select></label><label>Desde<input style={INP} type="date" value={desde} onChange={e=>setDesde(e.target.value)}/></label><label>Hasta<input style={INP} type="date" min={desde} value={hasta} onChange={e=>setHasta(e.target.value)}/></label><Button variant="ghost" disabled={!filas.length} onClick={exportar}>Descargar CSV</Button></div>
 <p className="regional-note">{filas.length} consultas. El CSV contiene una fila por equipo: el total de la consulta se repite, no debe sumarse por fila.</p>
 {consulta.isLoading?<Spinner/>:consulta.error?<p role="alert">No se pudo cargar el registro. Verifica la instalación del SQL. <Button onClick={()=>consulta.refetch()}>Reintentar</Button></p>:<div className="gestion-table-scroll"><table className="gestion-table"><thead><tr><th>Fecha / usuario</th><th>Razón social</th><th>Calculadora</th><th>Ciudad consultada</th><th>Equipos</th><th>Total antes de IVA</th></tr></thead><tbody>{filas.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})}<small>{r.usuario_nombre}</small><small>{r.usuario_email}</small></td><td>{r.razon_social}</td><td>{r.modulo==='normal'?'Normal · Bogotá':'Regional'}<small>Desde {r.origen}</small></td><td>{r.municipio} · {r.departamento}<small>DANE {r.destino_codigo}</small></td><td>{r.equipos.map(e=><p key={e.referencia}>{e.referencia} · {e.nombre} × {e.cantidad}</p>)}</td><td>{fmtCOP(r.total)}</td></tr>)}</tbody></table>{!filas.length&&<p className="gestion-empty">Aún no hay consultas registradas con estos filtros.</p>}</div>}
 </Card></div>
}
