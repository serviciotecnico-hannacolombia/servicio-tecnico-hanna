import { SelectorBuscable } from './SelectorBuscable'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { INP } from '../mant-in-situ/ui'
import { fmtCOP, fmtHoras } from '../mant-in-situ/hooks/useMantInSitu'
import { CsvAcciones } from '../mant-in-situ/CsvAcciones'
import type { PlanImportacion } from '../mant-in-situ/importaciones'
import { descargarCSV, leerNumero, type CsvLeido } from '../mant-in-situ/csv'
import { useInvalidarRegional, type useRegional } from './datos'

type Datos=NonNullable<ReturnType<typeof useRegional>['data']>
export function EquiposRegionalesPanel({data,onEditar}:{data:Datos;onEditar:(ref:string,codigo:string)=>void}) {
  const [codigoNormal,setCodigoNormal]=useState(''),[estado,setEstado]=useState('todos')
  const [buscar,setBuscar]=useState(''),[familia,setFamilia]=useState(''),[codigo,setCodigo]=useState('')
  const [seleccion,setSeleccion]=useState<string[]>([]),[nuevo,setNuevo]=useState(''),[saving,setSaving]=useState(false)
  const invalidar=useInvalidarRegional()
  const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  const filas=data.equipos.filter(e=>normal(e.referencia+' '+e.nombre+' '+e.codigo+' '+e.codigoNormal).includes(normal(buscar))&&(!familia||e.familia===familia)&&(!codigoNormal||e.codigoNormal===codigoNormal)&&(!codigo||(codigo==='__sin__'?!e.codigo:e.codigo===codigo))&&(estado==='todos'||(estado==='pendientes'?!e.completo:e.tieneExcepcion)))
  async function guardar() {
    if(!nuevo||!seleccion.length)return
    setSaving(true)
    try {
      const {data:actualizados,error}=await supabase.from('mant_regional_referencias').update({codigo:nuevo}).in('referencia',seleccion).select('referencia')
      if(error)throw error
      if(actualizados?.length!==seleccion.length)throw new Error('No se actualizaron todas las referencias')
      await invalidar();setSeleccion([]);toast.success('Asignaciones regionales actualizadas')
    } catch {toast.error('No se pudieron actualizar las asignaciones')}
    finally {setSaving(false)}
  }
  function planificar(csv:CsvLeido):PlanImportacion {
    const errores:PlanImportacion['errores']=[],cambios:PlanImportacion['cambios']=[],actualizar:{referencia:string;codigo:string;horas:number|null;precio:number|null}[]=[],vistas=new Set<string>()
    for(const [i,r] of csv.filas.entries()) {
      const ref=r.referencia?.trim(),e=data.equipos.find(e=>e.referencia===ref),a=data.asignaciones.find(a=>a.referencia===ref)
      const cod=r.codigo_in_situ?.trim(),h=leerNumero(r.horas),p=leerNumero(r.precio_individual,true)
      if(!e||!a||vistas.has(ref)||!data.codigos.some(c=>c.codigo===cod)||h!==null&&(!Number.isFinite(h)||h<=0)||p!==null&&(!Number.isFinite(p)||p<=0)) {errores.push({fila:i+2,mensaje:'Referencia duplicada o desconocida, código inválido o valores no positivos.'});continue}
      vistas.add(ref)
      actualizar.push({referencia:ref,codigo:cod!,horas:h,precio:p})
      cambios.push({clave:ref,campos:[{campo:'Código in situ',antes:e.codigo??'',despues:cod!},{campo:'Horas propias',antes:String(a.horas??'del código'),despues:String(h??'del código')},{campo:'Precio propio',antes:String(a.precio??'del código'),despues:String(p??'del código')}]})
    }
    if(!['referencia','codigo_in_situ','horas','precio_individual'].every(c=>csv.columnas.includes(c)))errores.push({fila:1,mensaje:'Usa la plantilla descargada; faltan columnas editables.'})
    return {cambios,errores,sinCambio:0,camposIgnorados:[],aplicar:async()=>{
      if(errores.length)return 'Corrige los errores antes de importar'
      const {error}=await supabase.from('mant_regional_referencias').upsert(actualizar,{onConflict:'referencia'})
      if(error)return error.message
      await invalidar();return null
    }}
  }
  return <>
    <div className="regional-table-toolbar"><p>Catálogo regional · {data.equipos.length} referencias. Selecciona una fila para editar o varias para asignar un servicio.</p><CsvAcciones titulo="Equipos y servicios regionales" ayuda="Solo referencias existentes. Horas y precio individual vacíos utilizan los del código regional. Los datos de Bogotá permanecen independientes." planificar={planificar} onExportar={()=>descargarCSV('equipos-regionales',['referencia','equipo','familia','codigo_normal','codigo_in_situ','horas','precio_individual'],filas.map(e=>{const a=data.asignaciones.find(a=>a.referencia===e.referencia);return [e.referencia,e.nombre,e.familia,e.codigoNormal,e.codigo,a?.horas,a?.precio]}))}/></div>
    <div className="regional-table-filters regional-equipment-filters"><input style={INP} aria-label="Buscar equipos" placeholder="Referencia, nombre o código" value={buscar} onChange={e=>setBuscar(e.target.value)}/><SelectorBuscable style={INP} aria-label="Familia" value={familia} onChange={e=>setFamilia(e.target.value)}><option value="">Familia: todas</option>{[...new Set(data.equipos.map(e=>e.familia))].filter(Boolean).sort().map(f=><option key={f}>{f}</option>)}</SelectorBuscable><SelectorBuscable style={INP} aria-label="Código normal" value={codigoNormal} onChange={e=>setCodigoNormal(e.target.value)}><option value="">Código normal: todos</option>{[...new Set(data.equipos.map(e=>e.codigoNormal))].filter(Boolean).sort().map(c=><option key={c}>{c}</option>)}</SelectorBuscable><SelectorBuscable style={INP} aria-label="Código regional" value={codigo} onChange={e=>setCodigo(e.target.value)}><option value="">Código in situ: todos</option><option value="__sin__">Sin asignar</option>{data.codigos.map(c=><option key={c.codigo}>{c.codigo}</option>)}</SelectorBuscable><SelectorBuscable style={INP} aria-label="Estado" value={estado} onChange={e=>setEstado(e.target.value)}><option value="todos">Estado: todos</option><option value="pendientes">Información pendiente</option><option value="excepciones">Con precio u horas propios</option></SelectorBuscable></div>
    <div className="regional-selection"><strong>{seleccion.length} seleccionadas</strong><Button variant="ghost" disabled={saving} onClick={()=>setSeleccion(filas.map(e=>e.referencia))}>Seleccionar los {filas.length} filtrados</Button><Button variant="ghost" disabled={saving} onClick={()=>setSeleccion([])}>Limpiar</Button>{!!seleccion.length&&<><SelectorBuscable style={INP} aria-label="Asignar código en bloque" value={nuevo} onChange={e=>setNuevo(e.target.value)}><option value="">Asignar servicio</option>{data.codigos.map(c=><option key={c.codigo}>{c.codigo}</option>)}</SelectorBuscable><Button disabled={saving||!nuevo} onClick={guardar}>Guardar asignación</Button></>}</div>
    <div className="regional-table-scroll"><table className="regional-table"><thead><tr><th><input type="checkbox" aria-label="Seleccionar los equipos filtrados" disabled={saving||!filas.length} checked={filas.length>0&&filas.every(e=>seleccion.includes(e.referencia))} onChange={e=>setSeleccion(e.target.checked?filas.map(e=>e.referencia):[])} /></th><th>Referencia</th><th>Equipo</th><th>Código normal</th><th>Código in situ</th><th>Horas</th><th>Precio base</th><th>Editar</th></tr></thead><tbody>{filas.map(e=><tr key={e.referencia}><td><input type="checkbox" disabled={saving} aria-label={'Seleccionar '+e.referencia} checked={seleccion.includes(e.referencia)} onChange={ev=>setSeleccion(s=>ev.target.checked?[...s,e.referencia]:s.filter(r=>r!==e.referencia))}/></td><td><strong>{e.referencia}</strong></td><td>{e.nombre}<small>{e.familia}</small></td><td>{e.codigoNormal||'—'}</td><td><span className="regional-status">{e.codigo||'Sin asignar'}</span></td><td>{fmtHoras(e.horas ?? 0)}</td><td>{fmtCOP(e.precio)}</td><td><Button variant="ghost" size="sm" onClick={()=>onEditar(e.referencia,e.codigo ?? '')}>Editar</Button></td></tr>)}</tbody></table>{!filas.length&&<p className="regional-empty">No hay equipos con estos filtros.</p>}</div>
  </>
}
