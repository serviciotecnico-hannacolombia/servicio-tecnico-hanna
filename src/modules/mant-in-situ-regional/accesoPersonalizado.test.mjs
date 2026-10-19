import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const source=fs.readFileSync(new URL('./accesoPersonalizado.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {puedeUsarPersonalizado}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
test('todos los perfiles activos que heredan el permiso del rol ven Personalizado sin ser administradores',()=>{
 for(const perfil of ['técnico1','técnico2','Andrés','nuevo técnico']) {
   assert.equal(puedeUsarPersonalizado(true,true,true),true,perfil)
 }
})
test('no da acceso por tener solo el módulo ni por ser un perfil inactivo',()=>{
 assert.equal(puedeUsarPersonalizado(true,true,false),false)
 assert.equal(puedeUsarPersonalizado(true,false,true),false)
 assert.equal(puedeUsarPersonalizado(false,true,true),false)
})
