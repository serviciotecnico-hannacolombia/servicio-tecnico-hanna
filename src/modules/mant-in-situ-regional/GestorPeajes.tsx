import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { FG, INP } from '../mant-in-situ/ui'
import { fmtCOP } from '../mant-in-situ/hooks/useMantInSitu'
import { SelectorBuscable } from './SelectorBuscable'
import { useInvalidarRegional, type useRegional, type SedeRegional, type DestinoRegional } from './datos'

type Datos=NonNullable<ReturnType<typeof useRegional>['data']>
type Fila={nombre:string;valor:string}
type Detalle={ida:Fila[];regreso:Fila[];observacion:string}
const PREFIJO='detalle_peajes:'
function cargar(data:Datos,d:DestinoRegional):Detalle {
  if(d.peaje_manual_motivo?.startsWith(PREFIJO)) {
    try {const v=JSON.parse(d.peaje_manual_motivo.slice(PREFIJO.length));if(['ida','regreso'].every(k=>Array.isArray(v[k])&&v[k].every((r:Fila)=>typeof r.nombre==='string'&&typeof r.valor==='string'))&&typeof v.observacion==='string')return v} catch { /* usar datos existentes */ }
  }
  const filas=(s:string)=>data.pasos.filter(p=>p.destino_codigo===d.codigo&&p.sentido===s).map(p=>({nombre:p.peaje_id,valor:String(data.peajes.find(t=>t.nombre===p.peaje_id)?.tarifa_categoria_i??'')}))
  return {ida:filas('ida'),regreso:filas('regreso'),observacion:d.peaje_manual_motivo??''}
}
export function GestorPeajes({data,sede}:{data:Datos;sede:SedeRegional}) {
  const [codigo,setCodigo]=useState(''),[soloPendientes,setSoloPendientes]=useState(false)
  const hoy=new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'})
  const rutas=data.destinos.filter(d=>d.codigo!==sede.codigo)
  const pendiente=(d:DestinoRegional)=>!d.peajes_confirmados&&(!d.peajes_ruta_verificados||data.pasos.some(s=>s.destino_codigo===d.codigo&&data.peajes.some(p=>p.nombre===s.peaje_id&&p.vigencia_hasta&&p.vigencia_hasta<hoy)))
  const pendientes=rutas.filter(pendiente)
  const visibles=soloPendientes?pendientes:rutas
  const destino=visibles.find(d=>d.codigo===codigo)??visibles[0]
  return <>
    <h3>Peajes por ciudad — {sede.nombre}</h3>
    <p className="regional-note">Elige la ciudad, revisa los peajes de ida y regreso y guarda. Los datos actuales se conservan hasta guardar; una lista vacía significa 0 COP para ese sentido.</p>
    <div className="regional-table-toolbar"><strong>{pendientes.length} de {rutas.length} rutas pendientes</strong><label><input type="checkbox" checked={soloPendientes} onChange={e=>{setSoloPendientes(e.target.checked);setCodigo('')}}/> Mostrar solo pendientes</label></div>
    <FG label="Ciudad o municipio"><SelectorBuscable style={INP} value={destino?.codigo??''} onChange={e=>setCodigo(e.target.value)}>{visibles.map(d=><option key={d.codigo} value={d.codigo}>{d.municipio} — {d.departamento} · {pendiente(d)?'Pendiente':'Confirmada'}</option>)}</SelectorBuscable></FG>
    {destino?<Editor key={destino.codigo+'-'+destino.updated_at} data={data} destino={destino} pendiente={pendiente(destino)}/>:<p className="regional-empty">No hay rutas pendientes en esta sede.</p>}
  </>
}
function Editor({data,destino,pendiente}:{data:Datos;destino:DestinoRegional;pendiente:boolean}) {
  const [detalle,setDetalle]=useState<Detalle>(()=>cargar(data,destino)),[saving,setSaving]=useState(false),[confirmado,setConfirmado]=useState(false)
  const [usarTotal,setUsarTotal]=useState(destino.peajes_confirmados&&!destino.peaje_manual_motivo?.startsWith(PREFIJO)),[totalAnterior,setTotalAnterior]=useState(String(destino.peaje_manual_valor??''))
  const invalidar=useInvalidarRegional()
  const total=(s:'ida'|'regreso')=>detalle[s].reduce((n,f)=>n+(Number(f.valor)||0),0)
  const modificar=(s:'ida'|'regreso',i:number,c:Partial<Fila>)=>{setConfirmado(false);setDetalle(d=>({...d,[s]:d[s].map((f,j)=>j===i?{...f,...c}:f)}))}
  async function guardar() {
    const filas=[...detalle.ida,...detalle.regreso]
    if(!confirmado||!detalle.observacion.trim()){toast.error('Añade una observación y confirma que revisaste la ruta');return}
    if(usarTotal?(!totalAnterior.trim()||!Number.isSafeInteger(Number(totalAnterior))||Number(totalAnterior)<0):filas.some(f=>!f.nombre.trim()||!f.valor.trim()||!Number.isSafeInteger(Number(f.valor))||Number(f.valor)<0)){toast.error('Revisa los nombres y valores de los peajes');return}
    if(!usarTotal&&(['ida','regreso'] as const).some(s=>new Set(detalle[s].map(f=>f.nombre.trim().toLocaleLowerCase())).size!==detalle[s].length)){toast.error('Un peaje no puede repetirse dentro del mismo sentido');return}
    setSaving(true)
    try {
      const valor=usarTotal?Number(totalAnterior):total('ida')+total('regreso')
      const {data:rows,error}=await supabase.from('mant_regional_destinos').update({peaje_manual_valor:valor,peaje_manual_motivo:usarTotal?detalle.observacion:PREFIJO+JSON.stringify(detalle),peajes_confirmados:true,updated_at:new Date().toISOString()}).eq('sede_id',destino.sede_id).eq('codigo',destino.codigo).select('codigo')
      if(error||rows?.length!==1)throw error
      await invalidar();toast.success('Peajes de esta ciudad guardados y confirmados')
    } catch {toast.error('No se pudo guardar la ruta. Tus cambios siguen en el formulario.')}
    finally {setSaving(false)}
  }
  return <fieldset disabled={saving} style={{border:0,padding:0,marginTop:18,minWidth:0}}>
    <p className="regional-note">{pendiente?'Esta ruta necesita revisión.':'Esta ruta ya está confirmada.'} {pendiente&&destino.revision_ruta?.pendientes?.map(p=>p.nombre+' ('+p.sentido+'): '+p.motivo).join(' · ')}</p>
    {destino.peajes_confirmados&&!destino.peaje_manual_motivo?.startsWith(PREFIJO)&&<label className="regional-note"><input type="checkbox" checked={usarTotal} onChange={e=>{setUsarTotal(e.target.checked);setConfirmado(false)}}/> Conservar el total manual existente en lugar de usar los peajes detallados</label>}
    {usarTotal?<FG label="Total manual de ida y regreso (COP)"><input style={INP} type="number" min={0} value={totalAnterior} onChange={e=>{setTotalAnterior(e.target.value);setConfirmado(false)}}/></FG>:<div className="regional-peajes-sentidos">{(['ida','regreso'] as const).map(s=><section key={s}><h4>{s==='ida'?'Ida':'Regreso'} · {fmtCOP(total(s))}</h4>{!detalle[s].length&&<p className="regional-note">Sin peajes: 0 COP. Agrega uno si aplica.</p>}{detalle[s].map((f,i)=><div className="regional-peaje-fila" key={i}><FG label={'Peaje '+(i+1)}><input style={INP} list={'peajes-'+s} value={f.nombre} placeholder="Elige o escribe el nombre" onChange={e=>{const p=data.peajes.find(p=>p.nombre===e.target.value);modificar(s,i,{nombre:e.target.value,...(p?{valor:String(p.tarifa_categoria_i)}:{})})}}/><datalist id={'peajes-'+s}>{data.peajes.map(p=><option key={p.nombre}>{p.nombre}</option>)}</datalist></FG><FG label="Valor (COP)"><input style={INP} type="number" min={0} value={f.valor} onChange={e=>modificar(s,i,{valor:e.target.value})}/></FG><Button variant="ghost" onClick={()=>{setConfirmado(false);setDetalle(d=>({...d,[s]:d[s].filter((_,j)=>j!==i)}))}}>No aplica</Button></div>)}<Button variant="ghost" disabled={detalle[s].length>=Math.max(3,cargar(data,destino)[s].length)} onClick={()=>{setConfirmado(false);setDetalle(d=>({...d,[s]:[...d[s],{nombre:'',valor:''}]}))}}>+ Agregar peaje</Button></section>)}</div>}
    <div style={{marginTop:16}}><FG label="Observación o fuente de revisión"><textarea style={INP} value={detalle.observacion} onChange={e=>{setConfirmado(false);setDetalle(d=>({...d,observacion:e.target.value}))}}/></FG></div>
    <p><strong>Total por visita: {fmtCOP(usarTotal?Number(totalAnterior)||0:total('ida')+total('regreso'))}</strong></p>
    <label className="regional-note"><input type="checkbox" checked={confirmado} onChange={e=>setConfirmado(e.target.checked)}/> Revisé ida y regreso; los sentidos sin peajes tienen valor cero</label>
    <div style={{marginTop:12}}><Button disabled={saving||!confirmado} onClick={guardar}>Guardar y confirmar esta ciudad</Button></div>
  </fieldset>
}
