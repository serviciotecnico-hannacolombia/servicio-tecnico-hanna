import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const catalogo=fs.readFileSync(new URL('./ciudades-guardadas.json',import.meta.url),'utf8')
const source=fs.readFileSync(new URL('./lugaresReporte.ts',import.meta.url),'utf8').replace("import catalogo from './ciudades-guardadas.json'",'const catalogo='+catalogo)
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {claveLugar,nombreCiudad,opcionesLugar}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
test('ciudades con tildes, puntos y espacios aparecen una vez y conservan el nombre oficial',()=>{
 const ciudades=['Medellin','MEDELLÍN.',' medellín ','BOGOTA','Bogotá.','Bogotá D.C.',' BOGOTA D. C. ']
 const opciones=opcionesLugar(ciudades)
 assert.equal(opciones.length,2)
 assert.equal(opciones.find(x=>x.clave==='medellin').nombre,'MEDELLÍN')
 assert.equal(new Set(ciudades.filter(c=>claveLugar(c)==='bogota').map(nombreCiudad)).size,1)
 assert.equal(ciudades.filter(c=>claveLugar(c)==='medellin').length,3)
})
test('departamentos se unifican sin mezclar municipios diferentes',()=>{
 assert.equal(opcionesLugar(['Bolivar','BOLÍVAR.',' Bolívar '],'departamento').length,1)
 assert.notEqual(claveLugar('San José'),claveLugar('San José del Guaviare'))
 assert.equal(opcionesLugar(['',' . ','Medellín']).length,1)
 assert.equal(opcionesLugar(['Puerto Nüevó','Puerto Nuevo.'])[0].nombre,'PUERTO NÜEVÓ')
})
