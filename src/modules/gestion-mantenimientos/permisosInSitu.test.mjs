import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64')
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const config=url(compile(fs.readFileSync(new URL('./configuracionAlertas.ts',import.meta.url),'utf8')))
const model=await import(url(compile(fs.readFileSync(new URL('./permisosInSitu.ts',import.meta.url),'utf8')).replace("'./configuracionAlertas'",JSON.stringify(config))))
test('el acceso completo contiene todas las acciones y no delega administración',()=>{
 assert.deepEqual(Object.keys(model.ACCESO_COMPLETO),Object.keys(model.PERMISOS_IN_SITU))
 assert.ok(model.accesoCompleto(model.ACCESO_COMPLETO));assert.equal(model.ACCESO_COMPLETO.gestionar_accesos,false);assert.equal('administrador' in model.ACCESO_COMPLETO,false)
})
test('las acciones requieren lectura y las casillas son booleanas',()=>{
 assert.doesNotThrow(()=>model.validarPermisos({...model.SIN_PERMISOS,ver:true}))
 for(const key of ['registrar','editar','importar','exportar','buzon'])assert.throws(()=>model.validarPermisos({...model.SIN_PERMISOS,[key]:true}),/lectura/)
 assert.throws(()=>model.validarPermisos({...model.SIN_PERMISOS,ver:'true'}),/casillas/)
})
test('los destinatarios iniciales no reciben permisos de modificación',()=>{
 assert.deepEqual(model.permisosIniciales('Brayan Galeano'),model.normalizarPermisos({ver:true,buzon:true}))
 assert.deepEqual(model.permisosIniciales('Usuario sin asignación'),model.SIN_PERMISOS)
})

test('cada acción activa sólo las lecturas necesarias de su apartado',()=>{
 const comercial=model.ajustarPermiso(model.SIN_PERMISOS,'oportunidades_editar',true)
 assert.equal(comercial.comercial,true);assert.equal(comercial.ver,true);assert.equal(comercial.editar,false)
 const solicitud=model.ajustarPermiso(model.SIN_PERMISOS,'solicitudes_crear',true)
 assert.equal(solicitud.solicitudes_ver,true);assert.equal(solicitud.ver,false)
 assert.doesNotThrow(()=>model.validarPermisos(solicitud))
})
test('administrar accesos es independiente de leer datos y quitar lectura no afecta otros apartados',()=>{
 const gestor=model.ajustarPermiso(model.SIN_PERMISOS,'gestionar_accesos',true)
 assert.equal(gestor.ver,false);assert.doesNotThrow(()=>model.validarPermisos(gestor))
 const mixto=model.ajustarPermiso({...gestor,solicitudes_ver:true},'estadisticas',true)
 const final=model.ajustarPermiso(mixto,'ver',false)
 assert.equal(final.estadisticas,false);assert.equal(final.solicitudes_ver,true);assert.equal(final.gestionar_accesos,true)
})

test('crear observaciones permite trabajar sin ver el historial',()=>{
 const crear=model.ajustarPermiso(model.SIN_PERMISOS,'observaciones_crear',true)
 assert.equal(crear.observaciones_ver,false)
 assert.equal(crear.administrar_observaciones_st,false)
 assert.doesNotThrow(()=>model.validarPermisos(crear))
 const eliminar=model.ajustarPermiso(crear,'administrar_observaciones_st',true)
 assert.equal(eliminar.observaciones_ver,true)
 assert.equal(eliminar.ver,false)
 assert.deepEqual(model.ajustarPermiso(eliminar,'observaciones_ver',false),crear)
 const lectura=model.ajustarPermiso(model.SIN_PERMISOS,'observaciones_ver',true)
 assert.equal(lectura.observaciones_crear,false)
 assert.equal(lectura.administrar_observaciones_st,false)
 const migrado=model.normalizarPermisos({ver:true,registrar:true,observaciones_ver:false,observaciones_crear:false})
 assert.equal(migrado.observaciones_ver,false)
 assert.equal(migrado.observaciones_crear,false)
})
