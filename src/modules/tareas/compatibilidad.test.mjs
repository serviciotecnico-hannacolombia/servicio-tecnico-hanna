import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import { test } from 'node:test'
const source=fs.readFileSync(new URL('./compatibilidad.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {faltaColumnaPrivada}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
test('detecta la columna ausente en PostgREST y PostgreSQL',()=>{
  assert.equal(faltaColumnaPrivada({code:'PGRST204',message:"Could not find the 'privada' column of 'tareas' in the schema cache"}),true)
  assert.equal(faltaColumnaPrivada({code:'42703',message:'column tareas.privada does not exist'}),true)
})
test('no reintenta errores de permisos, conexión u otras columnas',()=>{
  for(const e of [null,{code:'42501',message:'privada'},{message:'fetch failed'},{code:'PGRST204',message:'column otra not found'}])assert.equal(faltaColumnaPrivada(e),false)
})
