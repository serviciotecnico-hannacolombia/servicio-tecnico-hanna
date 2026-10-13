import { useState } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { normalizarColumna, leerNumero, leerSiNo } from '../mant-in-situ/csv'
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
      const detallado=csv.meta.fields?.includes('actualizar')
      for (const c of detallado?['sede','codigo_destino','observacion','ida_1_nombre','ida_1_valor','ida_2_nombre','ida_2_valor','ida_3_nombre','ida_3_valor','regreso_1_nombre','regreso_1_valor','regreso_2_nombre','regreso_2_valor','regreso_3_nombre','regreso_3_valor']:['sede','codigo_destino','total_peajes_cop','fuente']) {
        if (!csv.meta.fields?.includes(c)) throw new Error(`Falta la columna ${c}. Usa la plantilla descargable.`)
      }
      const cambios: Cambio[] = [], vistos = new Set<string>()
      for (const [i,r] of csv.data.entries()) {
        if(detallado){const si=leerSiNo(r.actualizar);if(si===null)throw new Error('Fila '+(i+2)+': actualizar debe ser sí o no');if(!si)continue}else if (!r.total_peajes_cop?.trim()) continue
        const codigo=r.codigo_destino?.trim(), destino=destinos.find(d=>d.codigo===codigo)
        let total=leerNumero(r.total_peajes_cop,true), fuente=r.fuente?.trim()
        if(detallado){
          const detalle:{ida:{nombre:string;valor:string}[];regreso:{nombre:string;valor:string}[];observacion:string}={ida:[],regreso:[],observacion:r.observacion?.trim()??''}
          for(const sentido of ['ida','regreso'] as const){
            for(let n=1;n<=3;n++){
              const nombre=r[sentido+'_'+n+'_nombre']?.trim()??'',celda=r[sentido+'_'+n+'_valor']?.trim()??''
              if(!nombre&&!celda)continue
              const valor=leerNumero(celda,true)
              if(!nombre||valor==null||!Number.isSafeInteger(valor)||valor<0)throw new Error('Fila '+(i+2)+': peaje '+sentido+' '+n+' inválido')
              if(detalle[sentido].some(p=>p.nombre.toLowerCase()===nombre.toLowerCase()))throw new Error('Fila '+(i+2)+': peaje repetido en '+sentido)
              detalle[sentido].push({nombre,valor:String(valor)})
            }
          }
          if(!detalle.observacion)throw new Error('Fila '+(i+2)+': agrega una observación')
          if(r.total_manual_cop?.trim()){
            total=leerNumero(r.total_manual_cop,true);fuente=detalle.observacion
          }else{
            total=[...detalle.ida,...detalle.regreso].reduce((n,p)=>n+Number(p.valor),0)
            fuente='detalle_peajes:'+JSON.stringify(detalle)
          }
        }
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
      <div style={{maxHeight:240,overflow:'auto'}}><table><thead><tr><th>Destino</th><th>Total COP</th><th>Fuente</th></tr></thead><tbody>{filas.map(r=><tr key={r.codigo}><td>{r.municipio}</td><td>{r.total.toLocaleString('es-CO')}</td><td>{r.fuente.startsWith('detalle_peajes:')?JSON.parse(r.fuente.slice(15)).observacion:r.fuente}</td></tr>)}</tbody></table></div>
      <Button disabled={saving} onClick={guardar}>Confirmar y guardar importación</Button>
      <Button variant="ghost" disabled={saving} onClick={()=>setFilas([])}>Cancelar</Button>
    </>}
  </div>
}
