import fs from 'node:fs'
import assert from 'node:assert/strict'
import {PGlite} from '../../.cache/gestion-sql-check/node_modules/@electric-sql/pglite/dist/index.js'
const db=new PGlite(),owner='00000000-0000-0000-0000-000000000001',viewer='00000000-0000-0000-0000-000000000002'
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,full_name text,email text,activo boolean DEFAULT true);
 INSERT INTO public.profiles VALUES('${owner}','Andrés Latorre','owner@example.invalid',true),('${viewer}','Brayan Galeano','viewer@example.invalid',true);
 CREATE FUNCTION public.gestion_mantenimientos_permitido() RETURNS boolean LANGUAGE sql AS $$SELECT false$$;`)
for(const name of ['instalar-reporte-in-situ.sql','instalar-alertas-in-situ.sql','instalar-permisos-visitas-in-situ.sql','instalar-oportunidades-in-situ.sql'])await db.exec(fs.readFileSync(new URL(name,import.meta.url),'utf8'))
const as=async id=>{await db.exec(`RESET ROLE;SET test.uid='${id}';SET ROLE authenticated`)}
const r={id:'00000000-0000-0000-0000-000000000009',referencia:'HI2020',serial:'SN1',cliente:'Cliente real',nit:'',asesor:'',contacto:'',telefono:'',fecha:'2025-01-13',departamento:'',ciudad:'Bogotá',ubicacion:'',documento:'',periodicidad:365,informe:'123',observaciones:'',zona:'2025',tipo:'atencion',motivo_atencion:'funcionamiento'}
await as(owner)
await db.query('SELECT public.intervenciones_importar($1::jsonb)',[JSON.stringify([r])])
assert.equal((await db.query('SELECT motivo_atencion FROM public.mantenimiento_intervenciones')).rows[0].motivo_atencion,'funcionamiento')
const datos={id:'00000000-0000-0000-0000-000000000010',intervencion_id:r.id,titulo:'Repuesto de electrodo',necesidad:'El cliente requiere reemplazar el electrodo.',asesor:'Asesor comercial',cliente:'Suplantado',tipo_origen:'preventivo'}
const crear=()=>db.query('SELECT public.intervenciones_oportunidad_crear($1::jsonb) AS o',[JSON.stringify(datos)])
const creada=(await crear()).rows[0].o
assert.equal(creada.cliente,'Cliente real');assert.equal(creada.tipo_origen,'atencion');assert.equal(creada.cotizacion,null)
await crear();assert.equal((await db.query('SELECT * FROM public.intervenciones_oportunidades')).rows.length,1)
await assert.rejects(db.query('SELECT public.intervenciones_oportunidad_actualizar($1,1,$2,$3,$4,$5)',[datos.id,'cotizada',null,'Enviada',1000]))
const cotizada=(await db.query('SELECT public.intervenciones_oportunidad_actualizar($1,1,$2,$3,$4,$5) AS o',[datos.id,'cotizada','HANNA-123','Cotización registrada',1000])).rows[0].o
assert.equal(cotizada.revision,2)
await assert.rejects(db.query('SELECT public.intervenciones_oportunidad_actualizar($1,1,$2,$3,$4,$5)',[datos.id,'ganada','HANNA-123','Aceptada',1000]),/cambió/)
await assert.rejects(db.query('SELECT public.intervenciones_oportunidad_actualizar($1,2,$2,$3,$4,$5)',[datos.id,'ganada','HANNA-123','',1000]),/cierre/)
const ganada=(await db.query('SELECT public.intervenciones_oportunidad_actualizar($1,2,$2,$3,$4,$5) AS o',[datos.id,'ganada','HANNA-123','Aceptada por el cliente',1000])).rows[0].o
assert.equal(ganada.estado,'ganada');assert.equal(ganada.historial.length,3);assert.equal(ganada.historial.at(-1).usuario,'Andrés Latorre')
await db.query('SELECT public.intervenciones_actualizar($1,1,$2::jsonb)',[r.id,JSON.stringify({...r,motivo_atencion:'orientacion'})])
assert.equal((await db.query('SELECT motivo_atencion FROM public.mantenimiento_intervenciones')).rows[0].motivo_atencion,'orientacion')
await db.query('SELECT public.intervenciones_reclasificar($1,2,$2)',[r.id,'correctivo'])
assert.equal((await db.query('SELECT motivo_atencion FROM public.mantenimiento_intervenciones')).rows[0].motivo_atencion,null)
await as(viewer)
assert.equal((await db.query('SELECT * FROM public.intervenciones_oportunidades')).rows.length,1)
await assert.rejects(crear(),/Sin permiso/)
await assert.rejects(db.query('SELECT public.intervenciones_oportunidad_actualizar($1,3,$2,$3,$4,$5)',[datos.id,'ganada','HANNA-123','Otro cierre',1000]),/Sin permiso/)
await db.close();console.log('Oportunidades SQL: origen verificado, idempotencia, cotización externa, cierre, auditoría, motivos y permisos correctos.')
