import fs from 'node:fs'
import assert from 'node:assert/strict'
import {PGlite} from '../.cache/gestion-sql-check/node_modules/@electric-sql/pglite/dist/index.js'
const db=new PGlite()
await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE roles(id uuid PRIMARY KEY,name text);CREATE TABLE profiles(id uuid PRIMARY KEY,role_id uuid,activo boolean,full_name text,email text);
CREATE TABLE modules(key text PRIMARY KEY);CREATE TABLE capabilities(key text PRIMARY KEY);CREATE TABLE role_modules(role_id uuid,module_key text,PRIMARY KEY(role_id,module_key));CREATE TABLE role_capabilities(role_id uuid,capability_key text,PRIMARY KEY(role_id,capability_key));
CREATE FUNCTION public.has_module(k text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM profiles p JOIN role_modules r ON r.role_id=p.role_id WHERE p.id=auth.uid() AND p.activo AND r.module_key=k) $$;
CREATE FUNCTION public.has_capability(k text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM profiles p JOIN role_capabilities r ON r.role_id=p.role_id WHERE p.id=auth.uid() AND p.activo AND r.capability_key=k) $$;
INSERT INTO roles VALUES('00000000-0000-0000-0000-000000000001','Servicio Técnico'),('00000000-0000-0000-0000-000000000002','Ventas');
INSERT INTO profiles VALUES('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',true,'Andrés Latorre','tecnico@example.test'),('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',true,'Asesor','asesor@example.test');
INSERT INTO modules VALUES('mant_in_situ'),('mant_in_situ_regional'),('gestion_mantenimientos');
INSERT INTO role_modules VALUES('00000000-0000-0000-0000-000000000001','mant_in_situ'),('00000000-0000-0000-0000-000000000001','mant_in_situ_regional'),('00000000-0000-0000-0000-000000000002','mant_in_situ');
GRANT USAGE ON SCHEMA public,auth TO authenticated;`)
await db.exec(fs.readFileSync('supabase/migrations/20261019_registro_consultas_mantenimiento.sql','utf8'))
async function usuario(id){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated')}
const c={modulo:'normal',origen:'Bogotá',destino_codigo:'11001',departamento:'BOGOTÁ',municipio:'BOGOTÁ',equipos:[{referencia:'HI 5522',nombre:'Equipo',cantidad:2}],total:1200000,dias:1,usuario_nombre:'Falso'}
const id='20000000-0000-0000-0000-000000000001'
await usuario('10000000-0000-0000-0000-000000000002')
const guardar=(id,c,razon='Cliente',zona='Zona norte')=>db.query('SELECT public.mantenimiento_registrar_consulta($1,$2::jsonb,$3,$4) AS r',[id,JSON.stringify(c),razon,zona])
const r=(await guardar(id,c)).rows[0].r
assert.equal(r.usuario_nombre,'Asesor');assert.equal(r.usuario_email,'asesor@example.test');assert.equal(r.usuario_id,'10000000-0000-0000-0000-000000000002')
assert.equal((await guardar(id,c)).rows[0].r.id,id)
assert.equal((await db.query('SELECT * FROM mantenimiento_consultas')).rows.length,0)
await assert.rejects(guardar('20000000-0000-0000-0000-000000000002',{...c,modulo:'regional'}),e=>e.code==='42501')
await assert.rejects(guardar(id,{...c,total:500000}),/otra consulta/)
await assert.rejects(guardar('20000000-0000-0000-0000-000000000002',c,''),e=>e.code==='23514')
await assert.rejects(db.exec("UPDATE mantenimiento_consultas SET razon_social='Otra'"),e=>e.code==='42501')
await assert.rejects(db.exec('DELETE FROM mantenimiento_consultas'),e=>e.code==='42501')
await db.exec('RESET ROLE')
await db.exec("INSERT INTO role_capabilities VALUES('00000000-0000-0000-0000-000000000002','mant_consultas_reportes')")
await usuario('10000000-0000-0000-0000-000000000002')
assert.equal((await db.query('SELECT * FROM mantenimiento_consultas')).rows.length,0)
await usuario('10000000-0000-0000-0000-000000000001')
assert.equal((await db.query('SELECT * FROM mantenimiento_consultas')).rows.length,1)
await guardar('20000000-0000-0000-0000-000000000003',{...c,modulo:'regional',origen:'Barranquilla'})
assert.equal((await db.query('SELECT * FROM mantenimiento_consultas')).rows.length,2)
await assert.rejects(guardar(id,c),/Identificador/)
await db.close();console.log('SQL de consultas validado: usuario de sesión, permisos por calculadora, reporte exclusivo de Servicio Técnico, reintentos sin duplicados y registros inmutables.')
