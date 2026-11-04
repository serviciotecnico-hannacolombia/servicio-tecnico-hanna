import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const js=ts.transpileModule(fs.readFileSync(new URL('./rutasGestion.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {rutaGestion,leerRutaGestion,retornoGestion,regresoGestion}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
test('cada apartado mantiene su identidad al reconstruir la vista desde su URL',()=>{
 for(const seccion of ['in-situ','en-hanna','solicitudes','comercial','accesos'])assert.equal(leerRutaGestion(rutaGestion(seccion)).seccion,seccion)
 for(const reporte of ['visitas','estadisticas'])for(const tipo of ['preventivo','correctivo','atencion']){
  const ruta=leerRutaGestion(rutaGestion('reportes',reporte,tipo))
  assert.equal(ruta.seccion,'reportes');assert.equal(ruta.reporte,reporte);assert.equal(ruta.tipo,tipo)
 }
 assert.equal(leerRutaGestion(rutaGestion('reportes','consultas')).reporte,'consultas')
 assert.equal(leerRutaGestion('/gestion-mantenimientos/reportes/estadisticas/correctivo/').tipo,'correctivo')
})
test('direcciones desconocidas no se interpretan como el apartado inicial',()=>{
 assert.equal(leerRutaGestion('/gestion-mantenimientos/otro').valida,false)
 assert.equal(leerRutaGestion('/gestion-mantenimientos/reportes/consultas/atencion').valida,false)
 assert.equal(leerRutaGestion('/gestion-mantenimientos/reportes/visitas/invalido').valida,false)
})
test('el regreso tras iniciar sesión conserva la ficha y rechaza destinos externos',()=>{
 const ruta='/gestion-mantenimientos/reportes/visitas/correctivo?equipo=registro-123'
 assert.equal(retornoGestion(ruta),ruta)
 assert.equal(retornoGestion('/gestion-mantenimientos/comercial?oportunidad=123'),'/gestion-mantenimientos/comercial?oportunidad=123')
 for(const v of ['https://otro.example/','//otro.example/gestion-mantenimientos','/login','/gestion-mantenimientos/../admin',undefined])assert.equal(retornoGestion(v),undefined)
})

test('Regresar lleva al nivel anterior incluso al abrir una URL directamente',()=>{
 const base='/gestion-mantenimientos'
 assert.equal(regresoGestion(base),undefined)
 for(const seccion of ['in-situ','en-hanna','accesos'])assert.equal(regresoGestion(rutaGestion(seccion)),base)
 for(const path of [rutaGestion('solicitudes'),rutaGestion('comercial'),rutaGestion('reportes','consultas'),rutaGestion('reportes','visitas')])assert.equal(regresoGestion(path),rutaGestion('in-situ'))
 for(const tipo of ['preventivo','correctivo','atencion']){
  const path=rutaGestion('reportes','estadisticas',tipo)
  assert.equal(regresoGestion(path,'?indicador=meses'),path+'?servicio='+tipo)
  assert.equal(regresoGestion(path,'?servicio='+tipo),path)
  assert.equal(regresoGestion(path),rutaGestion('in-situ'))
 }
 for(const seccion of ['solicitudes','comercial']){
  const path=rutaGestion(seccion)
  assert.equal(regresoGestion(path,'?vista=indicadores&solicitud=1&oportunidad=2'),path)
  assert.equal(regresoGestion(path,'?vista=indicadores&detalle=personalizado'),path+'?detalle=personalizado')
 }
 assert.equal(regresoGestion(base+'/desconocido'),base)
})

test('facturación y trazabilidad regresan al segmento de origen',()=>{
 const path=rutaGestion('en-hanna')
 assert.equal(regresoGestion(path,'?vista=facturacion&segmento=in-situ&origen=in-situ'),rutaGestion('in-situ'))
 assert.equal(regresoGestion(path,'?vista=trazabilidad'),path)
})
