import fs from 'node:fs'
import assert from 'node:assert/strict'
import {PGlite} from '../../.cache/gestion-sql-check/node_modules/@electric-sql/pglite/dist/index.js'
const db=new PGlite(),owner='00000000-0000-0000-0000-000000000001',viewer='00000000-0000-0000-0000-000000000002'
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,full_name text,email text,activo boolean DEFAULT true);
 INSERT INTO public.profiles VALUES('${owner}','Andrés Latorre','owner@example.invalid',true),('${viewer}','Brayan Galeano','viewer@example.invalid',true);
 CREATE FUNCTION public.gestion_mantenimientos_permitido() RETURNS boolean LANGUAGE sql AS $$SELECT false$$;`)
for(const name of ['instalar-reporte-in-situ.sql','instalar-alertas-in-situ.sql','instalar-permisos-visitas-in-situ.sql','actualizar-buzon-in-situ.sql'])await db.exec(fs.readFileSync(new URL(name,import.meta.url),'utf8'))
const as=async id=>{await db.exec(`RESET ROLE;SET test.uid='${id}';SET ROLE authenticated`)}
const r={id:'00000000-0000-0000-0000-000000000009',referencia:'HI2020',serial:'SN1',cliente:'Cliente',nit:'',asesor:'',contacto:'',telefono:'',fecha:'2025-01-13',departamento:'',ciudad:'Bogotá',ubicacion:'',documento:'',periodicidad:365,informe:'123',observaciones:'',zona:'2025',tipo:'preventivo'}
const ninguno={ver:false,registrar:false,editar:false,importar:false,exportar:false,buzon:false}
await as(owner)
assert.equal((await db.query('SELECT public.intervenciones_mis_permisos() AS p')).rows[0].p.administrador,true)
await db.query('SELECT public.intervenciones_importar($1::jsonb)',[JSON.stringify([r])])
await as(viewer)
assert.equal((await db.query('SELECT * FROM public.mantenimiento_intervenciones')).rows.length,1)
for(const q of [
 ()=>db.query('SELECT public.intervenciones_reclasificar($1,1,$2)',[r.id,'correctivo']),
 ()=>db.query('SELECT public.intervenciones_exportar($1::uuid[])',[[r.id]]),
 ()=>db.query('SELECT public.intervenciones_crear($1::jsonb)',[JSON.stringify([r])]),
 ()=>db.query('SELECT public.intervenciones_alertas_perfiles()'),
 ()=>db.query('SELECT public.intervenciones_permisos_guardar($1,$2::jsonb)',[viewer,JSON.stringify({...ninguno,ver:true,editar:true})]),
 ()=>db.query('SELECT public.intervenciones_importar_interno($1::jsonb)',[JSON.stringify([r])]),
])await assert.rejects(q)
await db.query('SELECT public.intervenciones_alertas_marcar($1::text[])',[['aviso:1']])
assert.equal((await db.query('SELECT * FROM public.intervenciones_alertas_leidas')).rows.length,1)
await db.query('SELECT public.intervenciones_alertas_sin_leer($1::text[])',[['aviso:1']])
assert.equal((await db.query('SELECT * FROM public.intervenciones_alertas_leidas')).rows.length,0)
await as(owner)
await db.query('SELECT public.intervenciones_alertas_marcar($1::text[])',[['aviso:propietario']])
await as(viewer)
await db.query('SELECT public.intervenciones_alertas_sin_leer($1::text[])',[['aviso:propietario']])
await as(owner)
assert.equal((await db.query('SELECT * FROM public.intervenciones_alertas_leidas')).rows.length,1)
await db.query('SELECT public.intervenciones_permisos_guardar($1,$2::jsonb)',[viewer,JSON.stringify({...ninguno,ver:true,editar:true,registrar:true,exportar:true})])
await assert.rejects(db.query('SELECT public.intervenciones_permisos_guardar($1,$2::jsonb)',[viewer,JSON.stringify({...ninguno,editar:true})]))
await assert.rejects(db.query('SELECT public.intervenciones_permisos_guardar($1,$2::jsonb)',[owner,JSON.stringify(ninguno)]))
await as(viewer)
await assert.rejects(db.query('SELECT public.intervenciones_importar($1::jsonb)',[JSON.stringify([r])]))
await assert.rejects(db.query('SELECT public.intervenciones_alertas_marcar($1::text[])',[['aviso:2']]))
const nuevo={...r,id:'00000000-0000-0000-0000-000000000010',serial:'SN2'}
assert.equal((await db.query('SELECT public.intervenciones_crear($1::jsonb) AS n',[JSON.stringify([nuevo])])).rows[0].n,1)
await db.query('SELECT public.intervenciones_actualizar($1,1,$2::jsonb)',[r.id,JSON.stringify({...r,ciudad:'Cali',historial:[{usuario:'Suplantado'}]})])
await assert.rejects(db.query('SELECT public.intervenciones_actualizar($1,1,$2::jsonb)',[r.id,JSON.stringify(r)]),/registro cambió/)
const guardado=(await db.query('SELECT * FROM public.mantenimiento_intervenciones WHERE id=$1',[r.id])).rows[0]
assert.equal(guardado.ciudad,'Cali');assert.equal(guardado.historial.at(-1).usuario,'Brayan Galeano');assert.equal(guardado.historial.at(-1).cambios.find(c=>c.campo==='ciudad').antes,'Bogotá')
assert.equal((await db.query('SELECT * FROM public.intervenciones_exportar($1::uuid[])',[[r.id]])).rows.length,1)
await as(owner)
await db.query('SELECT public.intervenciones_permisos_guardar($1,$2::jsonb)',[viewer,JSON.stringify(ninguno)])
await as(viewer)
assert.equal((await db.query('SELECT * FROM public.mantenimiento_intervenciones')).rows.length,0)
assert.equal((await db.query('SELECT public.intervenciones_mis_permisos() AS p')).rows[0].p.ver,false)
await assert.rejects(db.query('SELECT public.intervenciones_alertas_sin_leer($1::text[])',[['aviso:propietario']]),/Sin acceso/)
await assert.rejects(db.query('SELECT public.intervenciones_actualizar($1,2,$2::jsonb)',[r.id,JSON.stringify(r)]))
await assert.rejects(db.query('SELECT public.intervenciones_exportar($1::uuid[])',[[r.id]]))
await db.close()
console.log('Permisos SQL: lectura, registro, edición, importación, exportación, buzón, propietario, auditoría y revocación verificados.')
