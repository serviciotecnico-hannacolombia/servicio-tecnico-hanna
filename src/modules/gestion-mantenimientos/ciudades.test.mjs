import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const source=fs.readFileSync(new URL('./ciudades.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {unificarCiudades,filtrarCiudades,textoUbicacion}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const catalogo=JSON.parse(fs.readFileSync(new URL('./ciudades-guardadas.json',import.meta.url),'utf8'))
test('catálogo reúne destinos Bogotá y regionales sin duplicar códigos',()=>{
 assert.equal(new Set(catalogo.map(c=>c.codigo)).size,catalogo.length)
 for(const codigo of ['11001','13001','08001','76001'])assert.ok(catalogo.some(c=>c.codigo===codigo))
 assert.ok(catalogo.every(c=>/^\d{5}$/.test(c.codigo)&&c.departamento&&c.municipio))
})
test('búsqueda ignora tildes y limita por departamento cuando se selecciona',()=>{
 const bogota=filtrarCiudades(catalogo,'','bogota');assert.ok(bogota.some(c=>c.codigo==='11001'))
 const cartagena=filtrarCiudades(catalogo,'BOLÍVAR','cartagena');assert.ok(cartagena.some(c=>c.codigo==='13001'))
 assert.equal(filtrarCiudades(catalogo,'ATLÁNTICO','cartagena').length,0)
 assert.equal(filtrarCiudades(catalogo,'','13001')[0].codigo,'13001')
})
test('ciudades nuevas de la BD se incorporan sin duplicar las del respaldo',()=>{
 const nuevos=[{codigo:'99999',municipio:'Municipio nuevo',departamento:'Departamento nuevo'},{codigo:'13001',municipio:'Cartagena actualizada',departamento:'BOLÍVAR'}]
 const lista=unificarCiudades(catalogo,nuevos)
 assert.equal(lista.length,catalogo.length+1)
 assert.equal(lista.find(c=>c.codigo==='13001').municipio,'Cartagena actualizada')
 assert.equal(textoUbicacion(nuevos[0],' Planta norte '),'Municipio nuevo, Departamento nuevo · Planta norte')
 assert.equal(textoUbicacion(nuevos[0],''),'Municipio nuevo, Departamento nuevo')
})
