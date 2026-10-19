import fs from 'node:fs'
import assert from 'node:assert/strict'
import {PGlite} from '../.cache/gestion-sql-check/node_modules/@electric-sql/pglite/dist/index.js'
const db=new PGlite()
await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE TABLE roles(id uuid PRIMARY KEY,name text); CREATE TABLE profiles(id uuid PRIMARY KEY,role_id uuid,activo boolean,full_name text,email text);
 CREATE TABLE modules(key text PRIMARY KEY);CREATE TABLE role_modules(role_id uuid,module_key text,PRIMARY KEY(role_id,module_key));
 CREATE FUNCTION public.has_module(k text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM profiles p JOIN role_modules rm ON rm.role_id=p.role_id WHERE p.id=auth.uid() AND p.activo AND rm.module_key=k) $$;
 INSERT INTO roles VALUES('00000000-0000-0000-0000-000000000001','Servicio Técnico'),('00000000-0000-0000-0000-000000000002','Ventas');
 INSERT INTO profiles VALUES('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',true,'Técnico','tecnico@example.test'),('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',true,'Ventas','ventas@example.test');
 INSERT INTO modules VALUES('mant_in_situ_regional');INSERT INTO role_modules VALUES('00000000-0000-0000-0000-000000000001','mant_in_situ_regional'),('00000000-0000-0000-0000-000000000002','mant_in_situ_regional');
 GRANT USAGE ON SCHEMA public,auth TO authenticated;`)
await db.exec(fs.readFileSync('supabase/migrations/20261019_gestion_mantenimientos.sql','utf8'))
const c={version:1,items:[{referencia:'HI',precio:'1000000',cantidad:'1'}],transporte:{viaje:'aereo'},dias:5,desglose:{base:1000000,tiquetes:0,depreciacion:0,gasolina:0,peajes:0,desplazamiento:0,hospedaje:0,alimentacion:300000,otros:1500000},subtotal:2800000,margen_pct:5,margen:140000,total:2940000}
async function usuario(id){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated')}
await usuario('10000000-0000-0000-0000-000000000001')
const creado=(await db.query('SELECT public.gestion_mantenimiento_crear($1,$2,$3,$4,$5::jsonb,$6) AS r',['Cliente','Bogotá','Cartagena',null,JSON.stringify(c),'Solicitud inicial'])).rows[0].r
assert.equal(creado.estado,'pendiente');assert.equal(creado.calculo.total,2940000);assert.equal(creado.historial.length,1)
const actualizado=(await db.query('SELECT public.gestion_mantenimiento_actualizar($1,$2,$3,$4,$5) AS r',[creado.id,1,'aprobada','COT-123','Aprobó el cliente'])).rows[0].r
assert.equal(actualizado.revision,2);assert.equal(actualizado.historial.length,2);assert.equal(actualizado.creado_por,'10000000-0000-0000-0000-000000000001')
await assert.rejects(db.query('SELECT public.gestion_mantenimiento_actualizar($1,1,$2,$3,$4)',[creado.id,'realizada','COT-123','Hecho']),/cambió/)
await assert.rejects(db.query('SELECT public.gestion_mantenimiento_actualizar($1,2,$2,$3,$4)',[creado.id,'rechazada','COT-123','']),/motivo/)
await assert.rejects(db.query('SELECT public.gestion_mantenimiento_actualizar($1,2,$2,$3,$4)',[creado.id,'aprobada',null,'']),/cotización/)
await assert.rejects(db.query('SELECT public.gestion_mantenimiento_crear($1,$2,$3,$4,$5::jsonb,$6)',['Cliente','Bogotá','Cali',null,JSON.stringify({...c,total:1}),'']),/cálculo/)
await assert.rejects(db.exec('UPDATE gestion_mantenimientos SET revision=99'),e=>e.code==='42501')
await assert.rejects(db.exec('DELETE FROM gestion_mantenimientos'),e=>e.code==='42501')
await usuario('10000000-0000-0000-0000-000000000002')
assert.equal((await db.query('SELECT * FROM gestion_mantenimientos')).rows.length,0)
await assert.rejects(db.query('SELECT public.gestion_mantenimiento_crear($1,$2,$3,$4,$5::jsonb,$6)',['Cliente','Cali','Bogotá',null,JSON.stringify(c),'']),e=>e.code==='42501')
// Dar el módulo a Ventas no debe saltarse la restricción a Servicio Técnico.
await db.exec('RESET ROLE');await db.exec("INSERT INTO role_modules VALUES('00000000-0000-0000-0000-000000000002','gestion_mantenimientos')")
await usuario('10000000-0000-0000-0000-000000000002')
assert.equal((await db.query('SELECT * FROM gestion_mantenimientos')).rows.length,0)
await usuario('10000000-0000-0000-0000-000000000001')
assert.equal((await db.query('SELECT * FROM gestion_mantenimientos')).rows.length,1)
await db.close()
console.log('SQL validado: instalación, margen, instantánea, historial, revisiones y permisos de Servicio Técnico; no se tocó la base remota.')
