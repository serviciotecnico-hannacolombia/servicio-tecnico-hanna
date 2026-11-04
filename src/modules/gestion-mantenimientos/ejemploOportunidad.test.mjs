import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64')
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const memoria=new Map(),servicios=new Map()
globalThis.localStorage={getItem:k=>memoria.get(k)??null,setItem:(k,v)=>memoria.set(k,v)}
globalThis.listarFuentesEjemplo=async u=>servicios.get(u)??[]
globalThis.guardarFuentesEjemplo=async(nuevos,u)=>{const filas=servicios.get(u)??[];for(const r of nuevos)if(!filas.some(x=>x.id===r.id))filas.push(r);servicios.set(u,filas)}
const model=url(compile(fs.readFileSync(new URL('./oportunidades.ts',import.meta.url),'utf8')))
const storageSource=fs.readFileSync(new URL('./almacenOportunidades.ts',import.meta.url),'utf8').replace(/^import .*supabase.*$/m,'const supabase={};const fetchAllRows=()=>{throw Error("No se admite acceso remoto")}').replace(/^import .*listarIntervenciones.*$/m,'const listarIntervenciones=globalThis.listarFuentesEjemplo').replace('import.meta.env.DEV','true')
const storageUrl=url(compile(storageSource).replace("'./oportunidades'",JSON.stringify(model))),storage=await import(storageUrl)
const source=fs.readFileSync(new URL('./ejemploOportunidad.ts',import.meta.url),'utf8').replace(/^import .*guardarIntervenciones.*$/m,'const guardarIntervenciones=globalThis.guardarFuentesEjemplo')
function modulo(dev){return url(compile(source.replace('import.meta.env.DEV',String(dev))).replace("'./almacenOportunidades'",JSON.stringify(storageUrl)))}
const demo=await import(modulo(true))
test('demostración vinculada, idempotente y aislada por usuario; conserva cambios posteriores',async()=>{
 const [a,b]=await Promise.all([demo.cargarEjemploOportunidad('u1','Técnico'),demo.cargarEjemploOportunidad('u1','Técnico')])
 assert.equal(a.id,b.id);assert.equal((await storage.listarOportunidades('u1')).length,1);assert.equal(servicios.get('u1').length,1)
 assert.equal(a.tipo_origen,'preventivo');assert.equal(a.os,'0042');assert.equal(a.estado,'ganada');assert.equal(a.valor,450000);assert.deepEqual(a.historial.map(h=>h.estado),['pendiente','cotizada','ganada'])
 await storage.actualizarOportunidad(a,'perdida',a.cotizacion,'Se cambia el resultado de la demostración',450000,'u1','Técnico')
 assert.equal((await demo.cargarEjemploOportunidad('u1','Técnico')).estado,'perdida')
 assert.equal((await storage.listarOportunidades('u2')).length,0)
 await demo.cargarEjemploOportunidad('u2','Otro técnico');assert.equal((await storage.listarOportunidades('u2')).length,1)
})
test('el cargador no está habilitado fuera de desarrollo',async()=>{
 const produccion=await import(modulo(false))
 assert.throws(()=>produccion.cargarEjemploOportunidad('produccion','Técnico'),/localhost/)
 assert.equal((await storage.listarOportunidades('produccion')).length,0)
})
