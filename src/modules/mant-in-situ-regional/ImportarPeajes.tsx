import { useState } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { normalizarColumna, leerNumero } from '../mant-in-situ/csv'
import { useInvalidarRegional, type SedeRegional, type DestinoRegional } from './datos'

interface Cambio { codigo: string; municipio: string; total: number; fuente: string }
export function ImportarPeajes({ sede, destinos }: { sede: SedeRegional; destinos: DestinoRegional[] }) {
  const [filas, setFilas] = useState<Cambio[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const invalidar = useInvalidarRegional()
  async function leer(file: File) {
    setFilas([]); setError('')
    try {
      const csv = Papa.parse<Record<string,string>>(await file.text(), { header: true, skipEmptyLines: 'greedy', transformHeader: normalizarColumna })
      if (csv.errors.length) throw new Error('El CSV tiene columnas o filas mal formadas.')
      for (const c of ['sede','codigo_destino','total_peajes_cop','fuente']) {
        if (!csv.meta.fields?.includes(c)) throw new Error(`Falta la columna ${c}. Usa la plantilla descargable.`)
      }
      const cambios: Cambio[] = [], vistos = new Set<string>()
      for (const [i,r] of csv.data.entries()) {
        if (!r.total_peajes_cop?.trim()) continue
        const codigo=r.codigo_destino?.trim(), destino=destinos.find(d=>d.codigo===codigo)
        const total=leerNumero(r.total_peajes_cop,true), fuente=r.fuente?.trim()
        if (r.sede?.trim()!==sede.id || !destino || codigo===sede.codigo) throw new Error(`Fila ${i+2}: sede o destino incorrectos.`)
        if (vistos.has(codigo)) throw new Error(`Fila ${i+2}: destino duplicado.`)
        if (total==null || !Number.isSafeInteger(total) || total<0 || !fuente) throw new Error(`Fila ${i+2}: informa un total entero válido y su fuente.`)
        vistos.add(codigo); cambios.push({codigo,municipio:destino.municipio,total,fuente})
      }
      if (!cambios.length) throw new Error('No hay filas con total de peajes informado.')
      setFilas(cambios)
    } catch(e) { setError(e instanceof Error?e.message:'No se pudo leer el archivo.') }
  }
  async function guardar() {
    setSaving(true); setError('')
    let guardados=0
    try {
      for (const r of filas) {
        const {data,error}=await supabase.from('mant_regional_destinos').update({peaje_manual_valor:r.total,peaje_manual_motivo:r.fuente,peajes_confirmados:true,updated_at:new Date().toISOString()})
          .eq('sede_id',sede.id).eq('codigo',r.codigo).select('codigo')
        if (error) throw error
        if (data?.length!==1) throw new Error('No se pudo actualizar el destino; verifica tus permisos.')
        guardados++
      }
      toast.success(`${guardados} destinos actualizados`)
    } catch(e) {
      setError(`${guardados} destinos guardados. ${e instanceof Error?e.message:'No se completó la importación. Puedes reintentar los pendientes.'}`)
    } finally {
      setFilas(f=>f.slice(guardados)); await invalidar(); setSaving(false)
    }
  }
  return <div style={{marginTop:12}}>
    <label>Seleccionar CSV <input type="file" accept=".csv,text/csv" disabled={saving} onChange={e=>{const f=e.target.files?.[0];if(f)void leer(f);e.target.value=''}} /></label>
    {error && <p role="alert" style={{color:'var(--red)',marginTop:12}}>{error}</p>}
    {!!filas.length && <>
      <p style={{marginTop:12}}>Se confirmarán {filas.length} destinos de {sede.nombre}. El total reemplaza los peajes automáticos.</p>
      <div style={{maxHeight:240,overflow:'auto'}}><table><thead><tr><th>Destino</th><th>Total COP</th><th>Fuente</th></tr></thead><tbody>{filas.map(r=><tr key={r.codigo}><td>{r.municipio}</td><td>{r.total.toLocaleString('es-CO')}</td><td>{r.fuente}</td></tr>)}</tbody></table></div>
      <Button disabled={saving} onClick={guardar}>Confirmar y guardar importación</Button>
      <Button variant="ghost" disabled={saving} onClick={()=>setFilas([])}>Cancelar</Button>
    </>}
  </div>
}
