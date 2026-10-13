// PostgreSQL embebido: instalar @electric-sql/pglite en una carpeta temporal.
// node scripts/validar-migracion-regional.mjs <ruta a pglite/dist/index.js>
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE profiles(id uuid PRIMARY KEY,role_id uuid,activo boolean);
CREATE TABLE roles(id uuid PRIMARY KEY); CREATE TABLE modules(key text PRIMARY KEY); CREATE TABLE capabilities(key text PRIMARY KEY);
CREATE TABLE role_modules(role_id uuid,module_key text,PRIMARY KEY(role_id,module_key));
CREATE TABLE role_capabilities(role_id uuid,capability_key text,PRIMARY KEY(role_id,capability_key));
CREATE TABLE codigos_inet(codigo text PRIMARY KEY,codigo_mantenimiento_insitu text); ALTER TABLE codigos_inet ENABLE ROW LEVEL SECURITY;
CREATE TABLE mant_in_situ_config(id int,jornada_horas numeric,costo_km numeric,rendimiento_km_galon numeric,precio_galon numeric,margen_recorrido_pct numeric,descripcion_servicio text);
CREATE TABLE mant_in_situ_codigos(codigo text PRIMARY KEY,precio numeric,horas numeric);
CREATE TABLE mant_in_situ_equipos(referencia text,horas numeric,precio numeric,descripcion_servicio text);
INSERT INTO mant_in_situ_config VALUES(1,8,473,35,15900,5,'Servicio');
INSERT INTO mant_in_situ_codigos VALUES('MANPOI.02',245000,2);
INSERT INTO codigos_inet VALUES('HI 5522','MANPOI.02');`)
const permissions=fs.readFileSync('supabase/migrations/20260717_roles_permissions.sql','utf8')
for(const name of ['has_module','has_capability']) await db.exec(permissions.match(new RegExp(`CREATE OR REPLACE FUNCTION ${name}\\([^]*?\\$\\$;`))[0])
const ids=[1,2,3,4].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`)
for(const id of ids) await db.exec(`INSERT INTO roles VALUES('${id}'); INSERT INTO profiles VALUES('${id}','${id}',${id!==ids[3]});`)
await db.exec(`INSERT INTO modules VALUES('mant_in_situ'); INSERT INTO capabilities VALUES('mant_in_situ_editar');
INSERT INTO role_modules VALUES('${ids[0]}','mant_in_situ'),('${ids[1]}','mant_in_situ'),('${ids[3]}','mant_in_situ');
INSERT INTO role_capabilities VALUES('${ids[0]}','mant_in_situ_editar');`)
await db.exec(fs.readFileSync('supabase/migrations/20261013b_mant_in_situ_regional.sql','utf8'))
await db.exec(fs.readFileSync('supabase/migrations/20261013c_mant_in_situ_regional_datos.sql','utf8'))
await db.exec('GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;')
async function as(id){await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SET ROLE authenticated;`)}
async function rows(sql){return (await db.query(sql)).rows}
await as(ids[0])
assert.equal((await rows('SELECT * FROM mant_regional_destinos')).length,109)
await db.exec("UPDATE mant_regional_codigos SET precio=550000 WHERE sede_id='cali'")
assert.equal(Number((await rows("SELECT precio FROM mant_regional_codigos WHERE sede_id='cali'"))[0].precio),550000)
assert.equal(Number((await rows("SELECT precio FROM mant_regional_codigos WHERE sede_id='pereira'"))[0].precio),245000)
assert.equal(Number((await rows('SELECT precio FROM mant_in_situ_codigos'))[0].precio),245000)
await assert.rejects(db.exec("UPDATE mant_regional_destinos SET ida_km=61 WHERE sede_id='cali'"),e=>e.code==='23514')
await assert.rejects(db.exec("UPDATE mant_regional_destinos SET peaje_manual_valor=0,peajes_confirmados=true WHERE sede_id='cali'"),e=>e.code==='23514')
await db.exec("UPDATE mant_regional_destinos SET peaje_manual_valor=0,peaje_manual_motivo='Sin peajes, revisado',peajes_confirmados=true WHERE sede_id='cali'")
await as(ids[1])
assert.equal((await rows('SELECT * FROM mant_regional_sedes')).length,5)
assert.equal((await rows('SELECT * FROM codigos_inet')).length,1)
assert.equal((await rows("UPDATE mant_regional_codigos SET precio=1 RETURNING codigo")).length,0)
await as(ids[2]); assert.equal((await rows('SELECT * FROM mant_regional_sedes')).length,0)
await as(ids[3]); assert.equal((await rows('SELECT * FROM mant_regional_sedes')).length,0)
await db.close()
console.log('Migraciones, 109 rutas, aislamiento de precios, restricciones y RLS: correctos')
