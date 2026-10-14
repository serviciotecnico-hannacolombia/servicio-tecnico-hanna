import { Children, isValidElement, useId, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props { value: string; onChange: (e: { target: { value: string } }) => void; children: ReactNode; style?: CSSProperties; 'aria-label'?: string }
export function SelectorBuscable({value,onChange,children,style,'aria-label':label}:Props) {
  const id=useId(),[abierto,setAbierto]=useState(false),[buscar,setBuscar]=useState(''),[indice,setIndice]=useState(0)
  const opciones=Children.toArray(children).filter(isValidElement).map(e=>{
    const props=e.props as {value?:string;children:ReactNode}
    const texto=Children.toArray(props.children).join('')
    return {value:props.value??texto,texto}
  })
  const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  const filtradas=opciones.filter(o=>normal(o.texto).includes(normal(buscar)))
  const actual=opciones.find(o=>o.value===value)?.texto??''
  const seleccionar=(v:string)=>{onChange({target:{value:v}});setAbierto(false);setBuscar('');setIndice(0)}
  return <div className="regional-selector" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setAbierto(false);setBuscar('')}}}>
    <div className="regional-selector-input"><input style={style} role="combobox" aria-label={label??actual??'Buscar y seleccionar'} aria-expanded={abierto} aria-controls={id} aria-autocomplete="list" aria-activedescendant={abierto&&filtradas[indice]?`${id}-${indice}`:undefined}
      value={abierto?buscar:actual} placeholder={actual||'Escribe o elige una opción'} onFocus={()=>{setAbierto(true);setBuscar('');setIndice(0)}} onChange={e=>{setBuscar(e.target.value);setAbierto(true);setIndice(0)}}
      onKeyDown={e=>{if(e.key==='Escape'){setAbierto(false);setBuscar('')}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setAbierto(true);setIndice(i=>Math.max(0,Math.min(filtradas.length-1,i+(e.key==='ArrowDown'?1:-1))))}else if(e.key==='Enter'&&abierto){e.preventDefault();if(filtradas[indice])seleccionar(filtradas[indice].value)}}}/>
      <button type="button" aria-label="Mostrar opciones" tabIndex={-1} onMouseDown={e=>e.preventDefault()} onClick={()=>{setAbierto(v=>!v);setBuscar('');setIndice(0)}}><ChevronDown size={16}/></button>
    </div>
    {abierto&&<div id={id} role="listbox" className="regional-selector-list">{filtradas.map((o,i)=><button type="button" role="option" id={`${id}-${i}`} aria-selected={o.value===value} key={o.value} className={i===indice?'active':''} onMouseDown={e=>e.preventDefault()} onClick={()=>seleccionar(o.value)}>{o.texto}</button>)}{!filtradas.length&&<p>No hay opciones con esa búsqueda.</p>}</div>}
  </div>
}
