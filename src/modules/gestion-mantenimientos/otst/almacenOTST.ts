import * as X from 'xlsx'
import {BASE_VACIA,leerOTST,leerFacturacion,type BaseOTST} from './modeloOTST'
function abrir(){return new Promise<IDBDatabase>((resolve,reject)=>{const q=indexedDB.open('hanna-gestion-reportes-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('usuarios');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
export async function leerBase(usuario:string):Promise<BaseOTST>{const db=await abrir();try{return await new Promise((resolve,reject)=>{const q=db.transaction('usuarios').objectStore('usuarios').get(usuario);q.onsuccess=()=>resolve(q.result??structuredClone(BASE_VACIA));q.onerror=()=>reject(q.error)})}finally{db.close()}}
export async function cambiarBase(usuario:string,cambio:(b:BaseOTST)=>BaseOTST){const db=await abrir();try{await new Promise<void>((resolve,reject)=>{const t=db.transaction('usuarios','readwrite'),s=t.objectStore('usuarios'),q=s.get(usuario);q.onsuccess=()=>{try{s.put(cambio(q.result??structuredClone(BASE_VACIA)),usuario)}catch(e){t.abort();reject(e)}};t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error??Error('No se pudo guardar.'))})}finally{db.close()}}
export async function cargarInicial(usuario:string){
 const b=await leerBase(usuario)
 if(import.meta.env.DEV&&!b.fuentes.length){
  const archivos=import.meta.glob<string>('./semilla.preview.json',{query:'?raw',import:'default'})
  const cargar=archivos['./semilla.preview.json'];if(!cargar)return b
  const datos=JSON.parse(await cargar())
  const otst=leerOTST(datos.otst),facturacion=leerFacturacion(datos.facturacion)
  await cambiarBase(usuario,actual=>actual.fuentes.length?actual:{...actual,otst,facturacion,fuentes:[{nombre:'Reporte General 30-10-2026',fecha:new Date().toISOString(),filas:otst.length},{nombre:'Facturación 31-10-2026',fecha:new Date().toISOString(),filas:facturacion.length}]})
 }
 return leerBase(usuario)
}
export async function filasArchivo(file:File){
 if(file.size>80*1024*1024)throw Error('El archivo supera 80 MB.')
 const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer),texto=new TextDecoder().decode(bytes)
 if(/<html|<table/i.test(texto.slice(0,1000))){
  const dom=new DOMParser().parseFromString(texto,'text/html')
  return [...dom.querySelectorAll('tr')].map(tr=>[...tr.querySelectorAll('td,th')].map(c=>(c.textContent??'').replace(/\s+/g,' ').trim())).filter(r=>r.length)
 }
 const w=X.read(buffer,{type:'array'})
 if(w.SheetNames.length!==1)throw Error('Selecciona un reporte con una sola hoja.')
 return X.utils.sheet_to_json<unknown[]>(w.Sheets[w.SheetNames[0]],{header:1,defval:'',raw:false}).map(r=>r.map(v=>String(v??'')))
}
