// Prueba local, sin acceso a Supabase: node docs/sql/reporte-in-situ.test.mjs
import {PGlite} from '../../.cache/gestion-sql-check/node_modules/@electric-sql/pglite/dist/index.js'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const db=new PGlite()
const uid='00000000-0000-0000-0000-000000000001'
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${uid}'::uuid$$;
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,full_name text,email text,activo boolean DEFAULT true);
 INSERT INTO public.profiles(id,full_name,email) VALUES('${uid}','Andrés Latorre','test@example.invalid');
 CREATE FUNCTION public.gestion_mantenimientos_permitido() RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(current_setting('test.permitido',true),'true')::boolean$$;`)
await db.exec(fs.readFileSync(new URL('./instalar-reporte-in-situ.sql',import.meta.url),'utf8'))
const r={id:'00000000-0000-0000-0000-000000000002',referencia:'HI2020',serial:'SN1',cliente:'Cliente',nit:'',asesor:'',contacto:'',telefono:'',fecha:'2025-01-13',departamento:'',ciudad:'Bogotá',ubicacion:'',documento:'',periodicidad:365,informe:'123',observaciones:'',zona:'2025',tipo:'preventivo',historial:[{usuario:'No confiable'}],revision:900}
const importar=rows=>db.query('SELECT public.intervenciones_importar($1::jsonb) AS n',[JSON.stringify(rows)])
assert.equal((await importar([r])).rows[0].n,1)
assert.equal((await importar([{...r,id:'00000000-0000-0000-0000-000000000003'}])).rows[0].n,0)
await db.query('SELECT public.intervenciones_reclasificar($1,1,$2)',[r.id,'correctivo'])
await assert.rejects(db.query('SELECT public.intervenciones_reclasificar($1,1,$2)',[r.id,'atencion']),/registro cambió/)
assert.equal((await importar([r])).rows[0].n,0)
const saved=(await db.query('SELECT * FROM public.mantenimiento_intervenciones')).rows[0]
assert.equal(saved.tipo,'correctivo');assert.equal(saved.revision,2);assert.equal(saved.historial.length,2)
assert.equal(saved.historial[0].usuario,'Andrés Latorre')
await db.exec(fs.readFileSync(new URL('./instalar-alertas-in-situ.sql',import.meta.url),'utf8'))
assert.equal((await db.query('SELECT public.intervenciones_alertas_configuracion() AS c')).rows[0].c.urgente,7)
await db.query('SELECT public.intervenciones_alertas_configurar($1::jsonb)',[JSON.stringify({anticipado:120,proximo:60,urgente:15,destinatarios:[{id:uid,nombre:'Ignorado'}]})])
await db.query('SELECT public.intervenciones_alertas_marcar($1::text[])',[['test:2026:urgente']])
await db.query('SELECT public.intervenciones_alertas_marcar($1::text[])',[['test:2026:urgente']])
assert.equal((await db.query('SELECT * FROM public.intervenciones_alertas_leidas')).rows.length,1)
assert.equal((await db.query('SELECT public.intervenciones_alertas_configuracion() AS c')).rows[0].c.destinatarios[0].nombre,'Andrés Latorre')
await assert.rejects(db.query('SELECT public.intervenciones_alertas_configurar($1::jsonb)',[JSON.stringify({anticipado:30,proximo:60,urgente:15,destinatarios:[]})]))
await db.exec(`INSERT INTO public.profiles(id,full_name,email) VALUES('00000000-0000-0000-0000-000000000099','Andrés Latorre','otro@example.invalid');
 CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '00000000-0000-0000-0000-000000000099'::uuid$$;`)
await assert.rejects(db.query('SELECT public.intervenciones_alertas_configurar($1::jsonb)',[JSON.stringify({anticipado:120,proximo:60,urgente:15,destinatarios:[{id:uid}]})]),/Sólo Andrés/)
await assert.rejects(db.query('SELECT public.intervenciones_alertas_perfiles()'),/Sólo Andrés/)
await assert.rejects(db.query('SELECT public.intervenciones_alertas_marcar($1::text[])',[['no autorizado']]),/Sin acceso/)
await db.exec(`SET ROLE authenticated; SET test.permitido='false';`)
assert.equal((await db.query('SELECT * FROM public.mantenimiento_intervenciones')).rows.length,0)
await assert.rejects(importar([r]),/Sin permiso/)
await assert.rejects(db.query('SELECT public.intervenciones_alertas_configuracion()'),/Sin permiso/)
await assert.rejects(db.query('SELECT public.intervenciones_alertas_marcar($1::text[])',[['otra']]),/Sin acceso/)
await assert.rejects(db.exec('DELETE FROM public.mantenimiento_intervenciones'),/permission denied/)
await db.close()
console.log('SQL: importación, duplicados, auditoría, revisión y permisos verificados.')
