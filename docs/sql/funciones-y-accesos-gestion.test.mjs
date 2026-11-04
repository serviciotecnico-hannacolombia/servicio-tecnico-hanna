import fs from 'node:fs'
import assert from 'node:assert/strict'
import {PGlite} from '../../.cache/gestion-sql-check/node_modules/@electric-sql/pglite/dist/index.js'
const db=new PGlite(),id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0'),owner=id(1),delegado=id(2),lector=id(3),otroDelegado=id(4),rol=id(90),rolComercial=id(91)
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE TABLE public.roles(id uuid PRIMARY KEY,name text);CREATE TABLE public.modules(key text PRIMARY KEY);CREATE TABLE public.capabilities(key text PRIMARY KEY);
 CREATE TABLE public.role_modules(role_id uuid,module_key text,PRIMARY KEY(role_id,module_key));CREATE TABLE public.role_capabilities(role_id uuid,capability_key text,PRIMARY KEY(role_id,capability_key));
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,role_id uuid,full_name text,email text,activo boolean DEFAULT true);
 INSERT INTO public.roles VALUES('${rol}','Servicio Técnico'),('${rolComercial}','Comercial');
 INSERT INTO public.profiles VALUES('${owner}','${rol}','Andrés Latorre','owner@example.invalid',true),('${delegado}','${rol}','Brayan Galeano','delegado@example.invalid',true),('${lector}','${rolComercial}','Lector','lector@example.invalid',true),('${otroDelegado}','${rolComercial}','Gestor adicional','gestor@example.invalid',true);
 INSERT INTO public.role_modules VALUES('${rol}','mant_in_situ_regional');
 CREATE FUNCTION public.has_module(k text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.role_modules m ON p.role_id=m.role_id WHERE p.id=auth.uid() AND m.module_key=k)$$;
 CREATE FUNCTION public.has_capability(k text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.role_capabilities c ON p.role_id=c.role_id WHERE p.id=auth.uid() AND c.capability_key=k)$$;
 CREATE FUNCTION public.mant_in_situ_asignar_codigo(p_referencias text[],p_codigo text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$BEGIN IF NOT(public.has_module('mant_in_situ') AND public.has_capability('mant_in_situ_editar')) THEN RAISE EXCEPTION 'Se requiere permiso para configurar Mant. In Situ';END IF;RETURN 1;END;$$;`)
for(const name of ['instalar-gestion-mantenimientos.sql','instalar-registro-consultas-mantenimientos.sql','instalar-reporte-in-situ.sql','instalar-alertas-in-situ.sql','instalar-permisos-visitas-in-situ.sql','instalar-oportunidades-in-situ.sql','actualizar-buzon-in-situ.sql'])await db.exec(fs.readFileSync(new URL(name,import.meta.url),'utf8'))
const rolesAntes=(await db.query('SELECT id,role_id FROM public.profiles ORDER BY id')).rows
const modulosAntes=(await db.query('SELECT * FROM public.role_modules ORDER BY role_id,module_key')).rows
await db.exec(fs.readFileSync(new URL('./actualizar-funciones-y-accesos-gestion.sql',import.meta.url),'utf8'))
await db.exec(fs.readFileSync(new URL('./actualizar-solicitudes-prueba.sql',import.meta.url),'utf8'))
const as=async u=>{await db.exec(`RESET ROLE;SET test.uid='${u}';SET ROLE authenticated`)}
const model=fs.readFileSync(new URL('../../src/modules/gestion-mantenimientos/permisosInSitu.ts',import.meta.url),'utf8')
const claves=[...model.split('export const PERMISOS_IN_SITU={')[1].split('} as const')[0].matchAll(/(\w+):'/g)].map(m=>m[1])
const ninguno=Object.fromEntries(claves.map(k=>[k,false])),completo=Object.fromEntries(claves.map(k=>[k,k!=='gestionar_accesos']))
const otorgar=(u,p)=>db.query('SELECT public.intervenciones_permisos_guardar($1,$2::jsonb)',[u,JSON.stringify(p)])
const mis=async()=>(await db.query('SELECT public.intervenciones_mis_permisos() AS p')).rows[0].p
await as(owner)
const equipo={id:id(50),referencia:'HI2020',serial:'SN1',cliente:'Cliente',nit:'',asesor:'',contacto:'',telefono:'',fecha:'2025-01-13',departamento:'',ciudad:'Bogotá',ubicacion:'',documento:'',periodicidad:365,informe:'1',observaciones:'',zona:'2025',tipo:'preventivo'}
await db.query('SELECT public.intervenciones_importar($1::jsonb)',[JSON.stringify([equipo])])
await db.query('SELECT public.intervenciones_oportunidad_crear($1::jsonb)',[JSON.stringify({id:id(51),intervencion_id:equipo.id,titulo:'Repuesto requerido',necesidad:'Reemplazar el electrodo del equipo',asesor:'Asesor'})])
await db.exec(`RESET ROLE;INSERT INTO public.gestion_mantenimientos(id,cliente,origen,destino,estado,calculo,historial,creado_por,creado_por_nombre) VALUES('${id(60)}','Cliente','Bogotá','Cali','pendiente','{}','[]','${owner}','Andrés');
 INSERT INTO public.mantenimiento_consultas(id,modulo,razon_social,zona,origen,destino_codigo,departamento,municipio,equipos,total,dias,usuario_id,usuario_nombre,usuario_email) VALUES('${id(61)}','normal','Cliente','Bogotá','Bogotá','11001','Bogotá','Bogotá','[{"referencia":"HI","cantidad":1}]',100,1,'${owner}','Andrés','owner@example.invalid');`)
await as(delegado)
assert.equal((await mis()).solicitudes_ver,true)
assert.equal((await mis()).consultas_ver,true)
assert.equal((await db.query('SELECT * FROM public.gestion_mantenimientos')).rows.length,1)
assert.equal((await db.query('SELECT * FROM public.mantenimiento_consultas')).rows.length,1)
await as(owner)
await otorgar(delegado,{...ninguno,gestionar_accesos:true})
await otorgar(otroDelegado,{...ninguno,gestionar_accesos:true})
await as(delegado)
assert.equal((await mis()).ver,false);assert.equal((await mis()).administrador,false);assert.equal((await mis()).gestionar_accesos,true)
assert.equal((await mis()).solicitudes_ver,false)
for(const tabla of ['gestion_mantenimientos','mantenimiento_consultas','mantenimiento_intervenciones','intervenciones_oportunidades'])assert.equal((await db.query('SELECT * FROM public.'+tabla)).rows.length,0)
assert.equal((await db.query('SELECT public.intervenciones_alertas_perfiles() AS p')).rows[0].p.length,4)
await assert.rejects(otorgar(owner,completo),/protegidos/)
await assert.rejects(otorgar(delegado,completo),/protegidos/)
await assert.rejects(otorgar(otroDelegado,ninguno),/propietario/)
await assert.rejects(otorgar(lector,{...ninguno,gestionar_accesos:true}),/propietario/)
await otorgar(lector,{...ninguno,ver:true,estadisticas:true})
await as(lector)
assert.equal((await mis()).estadisticas,true);assert.equal((await mis()).comercial,false)
assert.equal((await db.query('SELECT * FROM public.mantenimiento_intervenciones')).rows.length,1)
assert.equal((await db.query('SELECT * FROM public.intervenciones_oportunidades')).rows.length,0)
assert.equal((await db.query('SELECT * FROM public.gestion_mantenimientos')).rows.length,0)
await assert.rejects(db.query('SELECT public.gestion_mantenimiento_clasificar($1,3,true)',[id(60)]),/Sin permiso/)
await assert.rejects(db.query('SELECT public.intervenciones_permisos_listar()'),/No tienes permiso/)
await assert.rejects(db.query('SELECT public.gestion_validar_exportacion($1)',['consultas']),/No tienes permiso/)
await assert.rejects(db.query('SELECT public.gestion_validar_exportacion($1)',[null]),/No tienes permiso/)
assert.equal((await db.query('SELECT public.intervenciones_permiso(NULL) AS p')).rows[0].p,false)
await as(delegado)
await assert.rejects(otorgar(lector,{...ninguno,estadisticas:true}))
await otorgar(lector,{...ninguno,ver:true,comercial:true,oportunidades_crear:true,consultas_ver:true})
await as(lector)
assert.equal((await mis()).oportunidades_crear,true);assert.equal((await mis()).registrar,false);assert.equal((await mis()).oportunidades_editar,false)
await db.query('SELECT public.intervenciones_oportunidad_crear($1::jsonb)',[JSON.stringify({id:id(52),intervencion_id:equipo.id,titulo:'Otra oportunidad',necesidad:'Cliente solicita un equipo adicional',asesor:'Asesor'})])
await assert.rejects(db.query('SELECT public.intervenciones_oportunidad_actualizar($1,1,$2,$3,$4,$5)',[id(52),'cotizada','HANNA-7','Cotizada',100]),/Sin permiso/)
await assert.rejects(db.query('SELECT public.intervenciones_crear($1::jsonb)',[JSON.stringify([])]),/Sin permiso/)
await assert.rejects(db.query('SELECT public.gestion_validar_exportacion($1)',['consultas']),/No tienes permiso/)
await assert.rejects(db.query('SELECT public.gestion_mantenimiento_crear($1,$2,$3,$4,$5::jsonb,$6)',['Cliente','Bogotá','Cali',null,'{}','']),/Sin permiso/)
await as(owner)
await otorgar(lector,completo)
await as(lector)
const full=await mis();assert.equal(full.administrador,false);assert.equal(full.gestionar_accesos,false);for(const k of claves.filter(k=>k!=='gestionar_accesos'))assert.equal(full[k],true)
assert.equal((await db.query('SELECT * FROM public.gestion_mantenimientos')).rows.length,1)
await db.query('SELECT public.intervenciones_oportunidad_actualizar($1,1,$2,$3,$4,$5)',[id(52),'cotizada','HANNA-7','Cotizada',100])
await db.query('SELECT public.gestion_validar_exportacion($1)',['consultas'])
await assert.rejects(db.query('SELECT public.gestion_asignar_codigo_in_situ($1::text[],$2)',[['HI2020'],'MAN-01']),/permiso para configurar/)
const prueba=(await db.query('SELECT public.gestion_mantenimiento_clasificar($1,1,true) AS r',[id(60)])).rows[0].r
assert.equal(prueba.es_prueba,true);assert.equal(prueba.revision,2);assert.equal(prueba.historial.at(-1).es_prueba,true)
await assert.rejects(db.query('SELECT public.gestion_mantenimiento_clasificar($1,1,false)',[id(60)]),/cambió/)
const real=(await db.query('SELECT public.gestion_mantenimiento_clasificar($1,2,false) AS r',[id(60)])).rows[0].r
assert.equal(real.es_prueba,false);assert.equal(real.revision,3)
await as(owner)
await otorgar(delegado,ninguno)
await as(delegado)
await assert.rejects(db.query('SELECT public.gestion_mantenimiento_clasificar($1,3,true)',[id(60)]),/Sin permiso/)
await assert.rejects(db.query('SELECT public.intervenciones_permisos_listar()'),/No tienes permiso/)
await assert.rejects(otorgar(lector,ninguno),/No tienes permiso/)
await db.exec('RESET ROLE')
assert.deepEqual((await db.query('SELECT id,role_id FROM public.profiles ORDER BY id')).rows,rolesAntes)
assert.deepEqual((await db.query('SELECT * FROM public.role_modules ORDER BY role_id,module_key')).rows,modulosAntes)
// Nueva etapa: oportunidades manuales e identificación OS/número externo.
await db.exec(fs.readFileSync(new URL('./actualizar-oportunidades-manuales.sql',import.meta.url),'utf8'))
await as(owner)
const datosManual={id:id(70),intervencion_id:null,os:'0012',numero_oportunidad:'NEG-001',cliente:'Cliente manual',referencia:'HI1',serial:'SN-MANUAL',tipo_origen:'correctivo',titulo:'Compra de repuestos',necesidad:'Cliente requiere varios repuestos nuevos.',asesor:'Asesor 1'}
const crearNueva=async d=>(await db.query('SELECT public.intervenciones_oportunidad_crear($1::jsonb) AS o',[JSON.stringify(d)])).rows[0].o
const seguirNueva=async(o,d={})=>(await db.query('SELECT public.intervenciones_oportunidad_seguir($1,$2,$3::jsonb) AS o',[o.id,o.revision,JSON.stringify({os:o.os,numero_oportunidad:o.numero_oportunidad,intervencion_id:o.intervencion_id,cliente:o.cliente,referencia:o.referencia,serial:o.serial,tipo_origen:o.tipo_origen,estado:o.estado,cotizacion:o.cotizacion,valor:o.valor,nota:'Actualización comprobada',...d})])).rows[0].o
let manual=await crearNueva(datosManual)
assert.equal(manual.os,'0012');assert.equal(manual.intervencion_id,null);assert.equal(manual.cliente,'Cliente manual')
assert.equal((await crearNueva(datosManual)).id,manual.id)
await assert.rejects(crearNueva({...datosManual,id:id(71),numero_oportunidad:' neg-001 '}),/ese número/)
await assert.rejects(crearNueva({...datosManual,id:id(72),os:'123',numero_oportunidad:'MAL'}),/cuatro cifras/)
await assert.rejects(crearNueva({...datosManual,id:id(72),numero_oportunidad:''}),/número de oportunidad/)
await assert.rejects(seguirNueva(manual,{estado:'perdida',nota:''}),/motivo/)
manual=await seguirNueva(manual,{estado:'perdida',nota:'No cuenta con presupuesto',valor:500000})
assert.equal(manual.estado,'perdida');assert.equal(manual.cotizacion,null)
await assert.rejects(seguirNueva({...manual,revision:1}),/cambió/)
for(const [i,tipo] of ['preventivo','correctivo','atencion'].entries()){
 const servicio={...equipo,id:id(80+i),tipo,fecha:'2025-0'+(i+2)+'-01',informe:'REG-'+i}
 await db.query('SELECT public.intervenciones_importar($1::jsonb)',[JSON.stringify([servicio])])
 const n=await crearNueva({...datosManual,id:id(90+i),intervencion_id:servicio.id,numero_oportunidad:'REL-'+i,cliente:'Cliente falseado',tipo_origen:'incorrecto'})
 assert.equal(n.tipo_origen,tipo);assert.equal(n.cliente,equipo.cliente)
}
manual=await seguirNueva(manual,{intervencion_id:id(82),estado:'cotizada',cotizacion:'COT-001',nota:'Asesor emitió la cotización',cliente:'Cliente falseado'})
assert.equal(manual.tipo_origen,'atencion');assert.equal(manual.cliente,equipo.cliente)
await assert.rejects(seguirNueva(manual,{estado:'perdida',cotizacion:null}),/Conserva/)
manual=await seguirNueva(manual,{estado:'perdida',nota:'Cliente rechazó la cotización'})
assert.equal(manual.cotizacion,'COT-001')
manual=await seguirNueva(manual,{estado:'ganada',nota:'Cliente reconsideró y aprobó',valor:700000})
assert.equal(manual.valor,700000);assert.equal(manual.estado,'ganada');assert.ok(manual.historial.at(-1).cambios)
await db.query('SELECT public.intervenciones_oportunidad_actualizar($1,$2,$3,$4,$5,$6)',[manual.id,manual.revision,'ganada','COT-001','Aprobación ratificada',700000])
await as(delegado)
await assert.rejects(crearNueva({...datosManual,id:id(99),numero_oportunidad:'SIN-PERMISO'}),/Sin permiso/)
await assert.rejects(seguirNueva(manual),/Sin permiso/)
await assert.rejects(db.query('SELECT public.intervenciones_oportunidad_origen($1::jsonb)',[JSON.stringify(datosManual)]),/permission denied/)
await db.exec('RESET ROLE')
await db.close();console.log('Gestión: delegación y revocación, propietario protegido, casillas por función y roles generales intactos verificados.')
