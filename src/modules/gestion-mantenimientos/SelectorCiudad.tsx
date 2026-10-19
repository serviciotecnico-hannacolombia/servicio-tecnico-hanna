import {useState} from 'react'
import {Search} from 'lucide-react'
import {INP} from '../mant-in-situ/ui'
import {SelectorBuscable} from '../mant-in-situ-regional/SelectorBuscable'
import {filtrarCiudades,type CiudadGuardada} from './ciudades'
export function SelectorCiudad({titulo,ciudades,codigo,onChange,detalle,onDetalle}:{titulo:string,ciudades:CiudadGuardada[],codigo:string,onChange:(v:string)=>void,detalle:string,onDetalle:(v:string)=>void}) {
  const [departamento,setDepartamento]=useState('')
  const cambiarCiudad=(valor:string)=>{onChange(valor);if(valor!==codigo)onDetalle('')}
  const departamentos=[...new Set(ciudades.map(c=>c.departamento))].sort((a,b)=>a.localeCompare(b,'es'))
  const filtradas=filtrarCiudades(ciudades,departamento)
  return <fieldset className="gestion-ciudad"><legend>{titulo} <span className="regional-required">*</span></legend>
    <div className="gestion-ciudad-filtros"><label>Departamento<select style={INP} aria-label={'Departamento de '+titulo} value={departamento} onChange={e=>{setDepartamento(e.target.value);cambiarCiudad('')}}><option value="">Todos los departamentos</option>{departamentos.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
    <div><span className="gestion-ciudad-label">Municipio / ciudad <span className="regional-required">*</span></span><div className="gestion-ciudad-lupa"><Search size={16} aria-hidden="true"/><SelectorBuscable style={INP} aria-label={'Buscar ciudad de '+titulo} value={codigo} onChange={e=>cambiarCiudad(e.target.value)}><option value="">Busca una ciudad por nombre o código</option>{filtradas.map(c=><option key={c.codigo} value={c.codigo}>{c.municipio} · {c.departamento} · {c.codigo}</option>)}</SelectorBuscable></div></div></div>
    <label>Punto de referencia / dirección (opcional)<input style={INP} aria-label={'Dirección de '+titulo} maxLength={120} placeholder="Oficina, planta o dirección" value={detalle} onChange={e=>onDetalle(e.target.value)}/></label>
    <small>{filtradas.length} municipios disponibles. Usa la lupa para buscar por nombre o código DANE.</small>
  </fieldset>
}
