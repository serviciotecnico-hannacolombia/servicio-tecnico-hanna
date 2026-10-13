import { SelectorBuscable } from './SelectorBuscable'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { INP } from '../mant-in-situ/ui'
import { fmtCOP, fmtHoras } from '../mant-in-situ/hooks/useMantInSitu'
import { descargarCSV } from '../mant-in-situ/csv'
import { useInvalidarRegional, type useRegional } from './datos'

type Datos=NonNullable<ReturnType<typeof useRegional>['data']>
export function EquiposRegionalesPanel({data,onEditar}:{data:Datos;onEditar:(ref:string,codigo:string)=>void}) {
  const [buscar,setBuscar]=useState(''),[familia,setFamilia]=useState(''),[codigo,setCodigo]=useState('')
  const [seleccion,setSeleccion]=useState<string[]>([]),[nuevo,setNuevo]=useState(''),[saving,setSaving]=useState(false)
  const invalidar=useInvalidarRegional()
  const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  const filas=data.equipos.filter(e=>normal(e.referencia+' '+e.nombre+' '+e.codigo).includes(normal(buscar))&&(!familia||e.familia===familia)&&(!codigo||e.codigo===codigo))
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
  return <>
    <div className="regional-table-toolbar"><p>Catálogo regional · {data.equipos.length} referencias. Selecciona una fila para editar o varias para asignar un servicio.</p><Button variant="ghost" onClick={()=>descargarCSV('equipos-regionales',['referencia','equipo','familia','codigo_regional','horas','precio'],filas.map(e=>[e.referencia,e.nombre,e.familia,e.codigo,e.horas,e.precio]))}>Descargar CSV</Button></div>
    <div className="regional-table-filters"><input style={INP} aria-label="Buscar equipos" placeholder="Referencia, nombre o código" value={buscar} onChange={e=>setBuscar(e.target.value)}/><SelectorBuscable style={INP} aria-label="Familia" value={familia} onChange={e=>setFamilia(e.target.value)}><option value="">Familia: todas</option>{[...new Set(data.equipos.map(e=>e.familia))].filter(Boolean).sort().map(f=><option key={f}>{f}</option>)}</SelectorBuscable><SelectorBuscable style={INP} aria-label="Código regional" value={codigo} onChange={e=>setCodigo(e.target.value)}><option value="">Código regional: todos</option>{data.codigos.map(c=><option key={c.codigo}>{c.codigo}</option>)}</SelectorBuscable></div>
    <div className="regional-selection"><strong>{seleccion.length} seleccionadas</strong><Button variant="ghost" disabled={saving} onClick={()=>setSeleccion(filas.map(e=>e.referencia))}>Seleccionar los {filas.length} filtrados</Button><Button variant="ghost" disabled={saving} onClick={()=>setSeleccion([])}>Limpiar</Button>{!!seleccion.length&&<><SelectorBuscable style={INP} aria-label="Asignar código en bloque" value={nuevo} onChange={e=>setNuevo(e.target.value)}><option value="">Asignar servicio</option>{data.codigos.map(c=><option key={c.codigo}>{c.codigo}</option>)}</SelectorBuscable><Button disabled={saving||!nuevo} onClick={guardar}>Guardar asignación</Button></>}</div>
    <div className="regional-table-scroll"><table className="regional-table"><thead><tr><th>Seleccionar</th><th>Referencia</th><th>Equipo</th><th>Código regional</th><th>Horas</th><th>Precio base</th><th>Editar</th></tr></thead><tbody>{filas.map(e=><tr key={e.referencia}><td><input type="checkbox" disabled={saving} aria-label={'Seleccionar '+e.referencia} checked={seleccion.includes(e.referencia)} onChange={ev=>setSeleccion(s=>ev.target.checked?[...s,e.referencia]:s.filter(r=>r!==e.referencia))}/></td><td><strong>{e.referencia}</strong></td><td>{e.nombre}<small>{e.familia}</small></td><td><span className="regional-status">{e.codigo}</span></td><td>{fmtHoras(e.horas ?? 0)}</td><td>{fmtCOP(e.precio)}</td><td><Button variant="ghost" size="sm" onClick={()=>onEditar(e.referencia,e.codigo ?? '')}>Editar</Button></td></tr>)}</tbody></table>{!filas.length&&<p className="regional-empty">No hay equipos con estos filtros.</p>}</div>
  </>
}
