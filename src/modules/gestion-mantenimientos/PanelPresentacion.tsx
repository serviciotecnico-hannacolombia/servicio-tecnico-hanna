import {useEffect,useRef,useState,type ReactNode} from 'react'
import {Maximize2,Minimize2} from 'lucide-react'
import {Button} from './uiGestion'
export function PanelPresentacion({titulo,children}:{titulo:string;children:ReactNode}) {
 const [abierto,setAbierto]=useState(false),panel=useRef<HTMLDivElement>(null),boton=useRef<HTMLButtonElement>(null)
 useEffect(()=>{
  if(!abierto)return
  const previo=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow
  document.body.style.overflow='hidden';boton.current?.focus()
  function teclado(e:KeyboardEvent){
   if(e.key==='Escape'){e.preventDefault();setAbierto(false)}
   if(e.key==='Tab'){
    const nodos=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],select:not([disabled]),input:not([disabled]),summary,[tabindex="0"]')??[]).filter(n=>n.getClientRects().length)
    const primero=nodos[0],ultimo=nodos.at(-1)
    if(e.shiftKey&&document.activeElement===primero){e.preventDefault();ultimo?.focus()}
    else if(!e.shiftKey&&document.activeElement===ultimo){e.preventDefault();primero?.focus()}
   }
  }
  document.addEventListener('keydown',teclado)
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',teclado);previo?.focus()}
 },[abierto])
 return <div onClickCapture={e=>{if(abierto&&e.target instanceof Element&&e.target.closest('[data-presentacion-detalle],.recharts-bar-rectangle,.recharts-pie-sector,.reporte-grafico-leyenda button,.reporte-tabla-grafico button,.solicitudes-extremos button'))setAbierto(false)}} ref={panel} className={abierto?'panel-presentacion gestion-presentacion':'panel-presentacion'} role={abierto?'dialog':undefined} aria-modal={abierto?true:undefined} aria-label={abierto?titulo:undefined}><div className="presentacion-barra"><span>{abierto?titulo:''}</span><button ref={boton} type="button" className="presentacion-toggle" aria-pressed={abierto} onClick={()=>setAbierto(!abierto)}>{abierto?<Minimize2 size={16}/>:<Maximize2 size={16}/>} {abierto?'Salir de presentación · Esc':'Modo presentación'}</button></div>{children}{abierto&&<Button variant="ghost" onClick={()=>setAbierto(false)}>Volver al análisis</Button>}</div>
}
