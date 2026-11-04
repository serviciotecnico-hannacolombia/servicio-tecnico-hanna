import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const source=fs.readFileSync(new URL('./modeloOTST.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
test('clasificación por código completo distingue correctivos, .03 y calibración',()=>{
 for(const [c,s,t] of [['70001.01','otst','Correctivo'],['MANTIT.01','otst','Preventivo'],['MANTIT.02','in-situ','Preventivo'],['MANTIT.03','in-situ','Preventivo'],['70001.03','otst','Preventivo'],['RV CALIBR.2','calibracion','Calibración'],['OTRO.02','pendiente','Pendiente de clasificar']])assert.deepEqual(m.clasificarCodigo(c),{segmento:s,servicio:t})
})
test('neto descuenta notas crédito una sola vez y permite saldo negativo',()=>{
 const r=m.resumenFacturacion([{tipo:'FAV',documento:'1',total:1000},{tipo:'NCRV',documento:'2',total:-1000},{tipo:'FAV',documento:'3',total:900}]);assert.equal(r.neto,900)
 assert.equal(m.resumenFacturacion([{tipo:'NCRV',documento:'2',total:-1000}]).neto,-1000)
 assert.equal(m.resumenFacturacion([{tipo:'NCRV',total:1000}]).excluidas,1)
 assert.equal(m.dineroReporte('$-1.500.000'),-1500000)
 assert.throws(()=>m.dineroReporte('Sin valor'))
})
test('reimportar reemplaza documentos completos sin multiplicar líneas ni borrar otros años',()=>{
 const viejos=[{d:'2023',v:1},{d:'2024',v:2}],nuevos=[{d:'2024',v:3},{d:'2024',v:4}]
 const r=m.combinarReportes(viejos,nuevos,x=>x.d)
 assert.deepEqual(m.combinarReportes(r,nuevos,x=>x.d),r);assert.equal(r.length,3)
})
test('seriales no identificables no se consideran identidad y referencias conservan modelos distintos',()=>{
 for(const s of ['N/A','N-A','NA','sin serie',''])assert.equal(m.serieValida(s),false)
 assert.equal(m.serieValida('12345'),true);assert.equal(m.claveRef('HI 931'),m.claveRef('HI931'));assert.notEqual(m.claveRef('HI931'),m.claveRef('HI9310'))
})
const archivo=new URL('./semilla.preview.json',import.meta.url)
test('los reportes reales cargan completos y conservan montos originales',{skip:!fs.existsSync(archivo)},()=>{
 const d=JSON.parse(fs.readFileSync(archivo,'utf8')),o=m.leerOTST(d.otst),f=m.leerFacturacion(d.facturacion)
 assert.equal(o.length,38594);assert.equal(new Set(o.map(r=>r.otst)).size,17899);assert.equal(m.unicosOTST(o).length,38230)
 assert.equal(f.length,6095);assert.equal(new Set(f.map(r=>r.id)).size,f.length)
 const resumen=m.resumenFacturacion(f)
 assert.equal(resumen.excluidas,0)
 assert.ok(Math.abs(resumen.neto-f.reduce((s,r)=>s+r.total,0))<0.01)
 const suma=Object.keys(m.SEGMENTOS).reduce((s,k)=>s+m.resumenFacturacion(f.filter(r=>r.segmento===k)).neto,0)
 assert.ok(Math.abs(resumen.neto-suma)<0.01)
 console.log('Conciliación real:',JSON.stringify(resumen))
})

test('estado y garantía se combinan sin confundir garantía desconocida con no',()=>{
 const filas=[{anulada:false,garantia:'1'},{anulada:true,garantia:'1'},{anulada:false,garantia:'0'},{anulada:false,garantia:''}]
 const filtrar=(e,g)=>filas.filter(r=>m.cumpleFiltrosOTST(r,e,g))
 assert.equal(filtrar('','si').length,2)
 assert.equal(filtrar('anuladas','si').length,1)
 assert.deepEqual(filtrar('no-anuladas','no'),[filas[2]])
 assert.deepEqual(filtrar('','sin-dato'),[filas[3]])
 assert.equal(filtrar('','').length,4)
})

test('vista principal agrupa por OTST y cliente, y conserva sondas solas y pendientes',()=>{
 const f=(id,otst,referencia,descripcion,nit='123')=>({id,otst,referencia,descripcion,categoria:'',nit,cliente:'Cliente'})
 const principal=f('p','1','HI 98103','Tester'),sonda=f('s','1','HI 1271','Electrodo'),otro=f('o','1','HI 931','Titulador'),sola=f('sola','2','HI 11310','Sonda'),pendiente=f('x','3','X','Desconocido'),ajeno=f('a','1','HI 1271','Electrodo','999')
 const filas=[principal,sonda,otro,sola,pendiente,ajeno],codigos=new Set(['HI98103','HI931'])
 const org=m.organizarElementos(filas,{},codigos)
 assert.deepEqual(filas.filter(r=>org.visible(r,'principales')).map(r=>r.id),['p','o','sola','x','a'])
 assert.deepEqual(filas.filter(r=>org.visible(r,'componentes')).map(r=>r.id),['s','sola','a'])
 assert.equal(filas.filter(r=>org.visible(r,'todos')).length,6)
 assert.deepEqual(org.relacionados(principal).map(r=>r.id),['s','o'])
 assert.equal(org.relacionados(sola).length,0)
 const manual=m.organizarElementos(filas,{s:{papel:'Equipo principal'},p:{papel:'Accesorio asociado'}},codigos)
 assert.equal(manual.visible(sonda,'principales'),true)
 assert.equal(manual.visible(principal,'componentes'),true)
 const sinCatalogo=m.organizarElementos([principal,sonda],{},new Set())
 assert.equal(sinCatalogo.visible(sonda,'principales'),true)
})

test('tres HI 701 principales en una OTST conservan tres filas y fichas por serial',()=>{
 const header=Array(25).fill('');header[0]='OTST'
 const fila=serial=>{const r=Array(25).fill('');r[0]='12345';r[1]='0';r[2]='Cliente';r[3]='900123456';r[5]='HI 701';r[6]=serial;r[7]='Colorímetro';r[15]='01/10/2026 09:00';return r}
 const recibidos=m.leerOTST([header,fila('SERIE-1'),fila('SERIE-2'),fila('SERIE-3'),fila('SERIE-1')])
 const equipos=m.unicosOTST(recibidos),org=m.organizarElementos(equipos,{},new Set(['HI701']))
 const visibles=equipos.filter(r=>org.visible(r,'principales'))
 assert.equal(visibles.length,3)
 assert.equal(new Set(visibles.map(r=>r.id)).size,3)
 assert.deepEqual(visibles.map(r=>r.serial),['SERIE-1','SERIE-2','SERIE-3'])
 assert.equal(org.relacionados(visibles[0]).length,2)
 const cambios={[visibles[0].id]:{papel:'Accesorio asociado'}}
 const editado=m.organizarElementos(equipos,cambios,new Set(['HI701']))
 assert.equal(editado.visible(visibles[1],'principales'),true)
 assert.equal(editado.visible(visibles[2],'principales'),true)
})

test('un reporte idéntico, incluso reordenado, no genera novedades; detecta nuevos y modificados',()=>{
 const a={g:'OTST-1',original:['HI 701','SERIE-1']},b={g:'OTST-1',original:['HI 701','SERIE-2']},c={g:'OTST-2',original:['HI 931','SERIE-3']}
 const anteriores=[a,b,c]
 const igual=m.planificarReporte(anteriores,[c,b,a],r=>r.g)
 assert.equal(igual.identicos,2);assert.equal(igual.cambios.length,0)
 const mod={...a,original:['HI 701','SERIE-1','Aprobada']},nuevo={g:'OTST-3',original:['HI 11310','SERIE-4']}
 const plan=m.planificarReporte(anteriores,[mod,b,c,nuevo],r=>r.g)
 assert.deepEqual([plan.nuevos,plan.modificados,plan.identicos],[1,1,1])
 const siguiente=m.combinarReportes(anteriores,plan.cambios,r=>r.g)
 assert.equal(siguiente.length,4);assert.ok(siguiente.includes(c))
 assert.equal(m.planificarReporte(siguiente,[mod,b,c,nuevo],r=>r.g).cambios.length,0)
 const duplicada=m.planificarReporte([a],[a,a],r=>r.g)
 assert.equal(duplicada.modificados,1)
})
