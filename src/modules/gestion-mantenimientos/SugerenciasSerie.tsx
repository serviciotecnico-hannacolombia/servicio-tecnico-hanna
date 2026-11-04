import {nombreCiudad} from './lugaresReporte'
import {useId,useState} from 'react'
import {INP} from '../mant-in-situ/ui'
import {normalizar,type Intervencion} from './intervenciones'
import {historialEquipo,sugerirEquipos,ultimoPreventivo,claveEquipo} from './programacion'
export function SugerenciasSerie({valor,referencia,registros,onChange,elegir,habilitado,ocupado}:{valor:string;referencia:string;registros:Intervencion[];onChange:(v:string)=>void;elegir:(r:Intervencion)=>void;habilitado:boolean;ocupado:boolean}) {
 const id=useId(),[seleccion,setSeleccion]=useState<string|null>(null)
 const coincidencias=habilitado?sugerirEquipos(registros,valor,referencia):[]
 const elegido=coincidencias.find(r=>claveEquipo(r)===seleccion&&normalizar(r.serial)===normalizar(valor)&&normalizar(r.referencia)===normalizar(referencia))
 return <div className="reporte-serie"><label htmlFor={id}>Número de serie<input id={id} style={INP} value={valor} maxLength={300} autoComplete="off" aria-describedby={habilitado?id+'-ayuda':undefined} onChange={e=>{setSeleccion(null);onChange(e.target.value)}}/></label>
 {habilitado&&<div id={id+'-ayuda'} aria-live="polite">{elegido?<p className="reporte-serie-vinculada">Equipo existente seleccionado. Esta visita se añadirá a su hoja de vida.</p>:valor.trim()?coincidencias.length?<div className="reporte-serie-sugerencias"><p>Equipos registrados · selecciona el correspondiente</p><ul>{coincidencias.map(r=>{const n=historialEquipo(registros,r).length,ultimo=ultimoPreventivo(registros,r);return <li key={claveEquipo(r)}><button type="button" disabled={ocupado} onClick={()=>{setSeleccion(claveEquipo(r));elegir(r)}}><strong>{r.serial} · {r.referencia}</strong><span>{r.cliente} · {nombreCiudad(r.ciudad)}</span><small>{n} intervención(es) · Última: {r.fecha}{ultimo?.periodicidad?` · Cada ${ultimo.periodicidad} días`:''}</small><span className="reporte-serie-accion">Usar datos de este equipo →</span></button></li>})}</ul><small>Si el serial aparece con varias referencias, verifica el código de equipo antes de elegir.</small></div>:<p className="reporte-ayuda">Sin coincidencias. Puedes registrar un equipo nuevo; verifica que el serial esté completo.</p>:<p className="reporte-ayuda">Escribe el serial para buscar una hoja de vida existente.</p>}</div>}
 </div>
}
