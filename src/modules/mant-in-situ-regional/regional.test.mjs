// node --test src/modules/mant-in-situ-regional/regional.test.mjs
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const datos = JSON.parse(fs.readFileSync(new URL('../../../supabase/data/mant-in-situ-regional.json', import.meta.url),'utf8'))
const source = fs.readFileSync(new URL('../mant-in-situ/calculo.ts', import.meta.url),'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { calcular } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const baseUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
const regionalSource = fs.readFileSync(new URL('./calculoRegional.ts', import.meta.url),'utf8')
const regionalJs = ts.transpileModule(regionalSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replace('../mant-in-situ/calculo',baseUrl)
const { calcularRegional } = await import(`data:text/javascript;base64,${Buffer.from(regionalJs).toString('base64')}`)
const config = { jornada_horas: 8, costo_km: 473, rendimiento_km_galon: 35, precio_galon: 15900, margen_recorrido_pct: 5 }
const equipos = new Map([['HI 5522', { referencia: 'HI 5522', codigo: 'MANPOI.02', precio: 550000, horas: 2, completo: true }]])

test('rutas ampliadas respetan 110 km de ida y no duplican estaciones por sentido', () => {
  const ampliado=JSON.parse(fs.readFileSync(new URL('../../../supabase/data/rutas-regionales-110.json',import.meta.url),'utf8'))
  assert.equal(ampliado.destinos.length,234)
  for(const d of ampliado.destinos) {
    assert.ok(d.ida_km<=110)
    assert.equal(new Set(d.pasos.map(p=>`${p.sentido}:${p.nombre}`)).size,d.pasos.length)
  }
})

test('recargo solo sobre el exceso de ida, sin duplicar el regreso', () => {
  const destino={codigo:'otra',ida_km:100,regreso_km:98,ida_min:60,regreso_min:60}
  const cfg={...config,recargo_km_adicional:300,recargo_solo_ida:true}
  const r=calcularRegional([{referencia:'HI 5522',cantidad:1}],equipos,destino,cfg,[],[],'76001')
  assert.equal(r.kmAdicionalesVisita,40)
  assert.equal(r.recargo,12000*r.dias)
  const sinRecargo=calcular([{referencia:'HI 5522',cantidad:1}],equipos,destino,config,[],[],'76001')
  assert.equal(r.total-sinRecargo.total,r.recargo)
  for (const km of [0,59,60]) {
    assert.equal(calcularRegional([{referencia:'HI 5522',cantidad:1}],equipos,{...destino,ida_km:km},cfg,[],[],'76001').recargo,0)
  }
  assert.equal(calcularRegional([{referencia:'HI 5522',cantidad:1}],equipos,{...destino,ida_km:110},{...cfg,recargo_km_adicional:500},[],[],'76001').recargo,25000*r.dias)
})

test('cinco sedes sin Bogotá y rutas únicas dentro de 60 km', () => {
  assert.equal(datos.sedes.length,5)
  assert.equal(datos.sedes.some(s=>s.codigo==='11001'),false)
  assert.equal(new Set(datos.destinos.map(d=>`${d.sede_id}/${d.codigo}`)).size,datos.destinos.length)
  assert.ok(datos.destinos.every(d=>d.ida_km>=0 && d.ida_km<=60 && d.regreso_km>=0 && d.ida_min>=0 && d.regreso_min>=0))
  assert.ok(datos.sedes.every(s=>datos.destinos.some(d=>d.sede_id===s.id && d.codigo===s.codigo)))
})

test('oficinas y rutas de ejemplo, incluidos departamentos vecinos', () => {
  const yumbo=datos.destinos.find(d=>d.sede_id==='cali' && d.codigo==='76892')
  const circasia=datos.destinos.find(d=>d.sede_id==='pereira' && d.codigo==='63190')
  assert.ok(yumbo.ida_km>18 && yumbo.ida_km<19)
  assert.ok(circasia.ida_km>32 && circasia.ida_km<34)
  assert.equal(circasia.departamento,'QUINDÍO')
  assert.ok(datos.destinos.some(d=>d.sede_id==='cali' && d.departamento==='CAUCA'))
})

test('ciudad de la sede conserva solo precio base regional', () => {
  const destino=datos.destinos.find(d=>d.sede_id==='cali' && d.codigo==='76001')
  const r=calcular([{referencia:'HI 5522',cantidad:1}],equipos,destino,config,[],[],'76001')
  assert.equal(r.base,550000)
  assert.equal(r.extras,0)
  assert.equal(r.total,550000)
  assert.equal(r.listo,true)
})

test('Yumbo suma ida/regreso, combustible, vehículo y peajes por jornada', () => {
  const destino={...datos.destinos.find(d=>d.sede_id==='cali' && d.codigo==='76892'),peaje_manual_valor:20000}
  const r=calcular([{referencia:'HI 5522',cantidad:1}],equipos,destino,config,[],[],'76001')
  assert.ok(r.vehiculo>0 && r.combustible>0)
  assert.equal(r.peajes,20000*r.dias)
  assert.equal(r.total,r.base+r.vehiculo+r.combustible+r.peajes)
  assert.equal(r.listo,true)
})

test('el comportamiento original de Bogotá se conserva por defecto', () => {
  const r=calcular([{referencia:'HI 5522',cantidad:1}],equipos,{codigo:'11001'},config,[],[])
  assert.equal(r.extras,0)
  assert.equal(r.total,550000)
  assert.equal(r.listo,true)
})

const coberturaSource = fs.readFileSync(new URL('./cobertura.ts', import.meta.url), 'utf8')
const coberturaJs = ts.transpileModule(coberturaSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { destinoRegionalHabilitado } = await import(`data:text/javascript;base64,${Buffer.from(coberturaJs).toString('base64')}`)

test('Cartagena supera 110 km y se habilita exclusivamente desde Barranquilla', () => {
  const ruta = JSON.parse(fs.readFileSync(new URL('../../../supabase/data/ruta-barranquilla-cartagena.json', import.meta.url), 'utf8'))
  const cartagena = {codigo: ruta.codigo, ida_km: ruta.ida.km}
  assert.ok(cartagena.ida_km > 110)
  assert.ok(ruta.regreso.km > 0 && ruta.ida.min > 0 && ruta.regreso.min > 0)
  assert.equal(destinoRegionalHabilitado('barranquilla', cartagena), true)
  for (const sede of ['cali', 'medellin', 'pereira', 'bucaramanga']) {
    assert.equal(destinoRegionalHabilitado(sede, cartagena), false)
  }
  assert.equal(destinoRegionalHabilitado('barranquilla', {codigo:'otra', ida_km:111}), false)
  assert.equal(destinoRegionalHabilitado('cali', {codigo:'otra', ida_km:110}), true)
})

test('Cartagena incluye peajes de ambos sentidos, vehículo, combustible y recargo', () => {
  const d = JSON.parse(fs.readFileSync(new URL('../../../supabase/data/ruta-barranquilla-cartagena.json', import.meta.url), 'utf8'))
  const destino = {codigo:d.codigo, ida_km:d.ida.km, regreso_km:d.regreso.km, ida_min:d.ida.min, regreso_min:d.regreso.min}
  const pasos = ['ida','regreso'].flatMap(sentido=>d[sentido].pasos.map(nombre=>({destino_codigo:d.codigo, peaje_id:nombre, sentido})))
  const peajes = d.peajes.map(p=>({...p,id:p.nombre}))
  const r = calcularRegional([{referencia:'HI 5522',cantidad:1}],equipos,destino,{...config,recargo_km_adicional:300,recargo_solo_ida:true},pasos,peajes,'08001')
  assert.equal(d.peajes_ruta_verificados,true)
  assert.equal(pasos.length,6)
  assert.equal(r.peajes,85800*r.dias)
  assert.ok(r.vehiculo>0)
  assert.ok(r.combustible>0)
  assert.equal(r.recargo,Math.round((d.ida.km-60)*r.dias*300))
  assert.equal(r.listo,true)
})

const rutaRespaldo = JSON.parse(fs.readFileSync(new URL('../../../supabase/data/ruta-barranquilla-cartagena.json', import.meta.url), 'utf8'))
const respaldoSource = fs.readFileSync(new URL('./respaldoCartagena.ts', import.meta.url), 'utf8')
  .replace(/^import ruta .*$/m, 'const ruta = ' + JSON.stringify(rutaRespaldo))
const respaldoJs = ts.transpileModule(respaldoSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { completarCartagena } = await import(`data:text/javascript;base64,${Buffer.from(respaldoJs).toString('base64')}`)

test('consulta sin SQL agrega Cartagena y calcula sin alterar las tarifas existentes', () => {
  const original = {destinos:[], pasos:[], peajes:[{id:'PAPIROS',nombre:'PAPIROS',tarifa_categoria_i:3000}]}
  const copia = structuredClone(original)
  const datos = completarCartagena('barranquilla', original)
  assert.deepEqual(original,copia)
  assert.equal(datos.destinos.length,1)
  assert.equal(datos.destinos[0].peajes_ruta_verificados,true)
  assert.equal(datos.peajes.find(p=>p.id==='PAPIROS').tarifa_categoria_i,3000)
  assert.equal(datos.pasos.length,6)
  const r = calcularRegional([{referencia:'HI 5522',cantidad:1}],equipos,datos.destinos[0],{...config,recargo_km_adicional:300,recargo_solo_ida:true},datos.pasos,datos.peajes,'08001')
  assert.equal(r.peajes,85800*r.dias)
  assert.equal(r.peaje.detalle.length,6)
  assert.equal(r.listo,true)
  assert.ok(r.vehiculo>0 && r.combustible>0 && r.recargo>0)
  assert.equal(completarCartagena('barranquilla',datos),datos)
  assert.equal(completarCartagena('cali',original),original)
  assert.ok(datos.peajes.every(p=>p.id==='PAPIROS'||p.vigencia_hasta))
})

test('el respaldo respeta Cartagena existente, incluso desactivada o con peajes manuales', () => {
  for (const activo of [true,false]) {
    const datos={destinos:[{codigo:'13001',activo,peajes_confirmados:true,peaje_manual_valor:99000}],peajes:[],pasos:[]}
    assert.equal(completarCartagena('barranquilla',datos),datos)
  }
})
