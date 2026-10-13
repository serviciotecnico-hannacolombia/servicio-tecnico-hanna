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
CREATE TABLE codigos_inet(codigo text PRIMARY KEY,familia text,descripcion text,codigo_mantenimiento_insitu text); ALTER TABLE codigos_inet ENABLE ROW LEVEL SECURITY;
CREATE TABLE mant_in_situ_config(id int,jornada_horas numeric,costo_km numeric,rendimiento_km_galon numeric,precio_galon numeric,margen_recorrido_pct numeric,descripcion_servicio text);
CREATE TABLE mant_in_situ_codigos(codigo text PRIMARY KEY,precio numeric,horas numeric);
CREATE TABLE mant_in_situ_equipos(referencia text,horas numeric,precio numeric,descripcion_servicio text);
INSERT INTO mant_in_situ_config VALUES(1,8,473,35,15900,5,'Servicio');
INSERT INTO codigos_inet(codigo,codigo_mantenimiento_insitu) VALUES('HI 5522','MANPOI.02'),('HI 839800-01','MANTR.02'),('HI 839800-02','MANTR.02');`)
const original=fs.readFileSync('supabase/migrations/20261006_modulo_mant_in_situ.sql','utf8')
await db.exec(original.match(/INSERT INTO mant_in_situ_codigos[^]*?ON CONFLICT \(codigo\) DO NOTHING;/)[0])
await db.exec("INSERT INTO codigos_inet(codigo,familia,descripcion,codigo_mantenimiento_insitu) VALUES('HI 96801','Familia existente','Descripción existente','MANFT.02'),('HI 96802','Familia existente','Descripción existente','MANTCHECKER.01')")
const permissions=fs.readFileSync('supabase/migrations/20260717_roles_permissions.sql','utf8')
for(const name of ['has_module','has_capability']) await db.exec(permissions.match(new RegExp(`CREATE OR REPLACE FUNCTION ${name}\\([^]*?\\$\\$;`))[0])
const ids=[1,2,3,4].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`)
for(const id of ids) await db.exec(`INSERT INTO roles VALUES('${id}'); INSERT INTO profiles VALUES('${id}','${id}',${id!==ids[3]});`)
await db.exec(`INSERT INTO modules VALUES('mant_in_situ'); INSERT INTO capabilities VALUES('mant_in_situ_editar');
INSERT INTO role_modules VALUES('${ids[0]}','mant_in_situ'),('${ids[1]}','mant_in_situ'),('${ids[3]}','mant_in_situ');
INSERT INTO role_capabilities VALUES('${ids[0]}','mant_in_situ_editar');`)
if (process.argv.includes('--bundle')) {
  await db.exec(`ALTER TABLE roles ADD COLUMN name text;
    UPDATE roles SET name=CASE id WHEN '${ids[0]}' THEN 'Servicio Técnico' WHEN '${ids[1]}' THEN 'Ventas' ELSE 'Logística' END`)
  const bundle=fs.readFileSync('docs/sql/instalar-mant-in-situ-regional.sql','utf8')
  await db.exec(bundle)
  assert.equal((await db.query('SELECT * FROM mant_regional_destinos')).rows.length,109)
  assert.equal((await db.query("SELECT * FROM codigos_inet WHERE codigo LIKE 'HI 968%'")).rows.length,15)
  const precios=JSON.parse(fs.readFileSync('supabase/data/mant-regional-precios-confirmados.json','utf8')).codigos
  for (const [codigo,precio] of Object.entries(precios)) {
    assert.equal(Number((await db.query(`SELECT precio FROM mant_regional_servicios WHERE codigo='${codigo}'`)).rows[0].precio),precio)
  }
  await db.exec('GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;')
  await as(ids[1])
  assert.equal((await rows('SELECT * FROM mant_regional_sedes')).length,5)
  assert.equal((await rows("UPDATE mant_regional_servicios SET precio=1 RETURNING codigo")).length,0)
  await db.exec('RESET ROLE')
  await assert.rejects(db.exec(bundle),e=>e.code==='P0001')
  await db.exec('ROLLBACK')
  assert.equal((await db.query('SELECT * FROM mant_regional_destinos')).rows.length,109)
  await db.close()
  console.log('Documento único validado: instalación completa, precios, equipos, permisos y bloqueo de repetición')
  process.exit(0)
}
await db.exec(fs.readFileSync('supabase/migrations/20261013b_mant_in_situ_regional.sql','utf8'))
await db.exec(fs.readFileSync('supabase/migrations/20261013c_mant_in_situ_regional_datos.sql','utf8'))
await db.exec('GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;')
async function as(id){await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SET ROLE authenticated;`)}
async function rows(sql){return (await db.query(sql)).rows}
await as(ids[0])
assert.equal((await rows('SELECT * FROM mant_regional_destinos')).length,109)
await db.exec("UPDATE mant_regional_codigos SET precio=550000 WHERE sede_id='cali' AND codigo='MANPOI.02'")
assert.equal(Number((await rows("SELECT precio FROM mant_regional_codigos WHERE sede_id='cali' AND codigo='MANPOI.02'"))[0].precio),550000)
assert.equal(Number((await rows("SELECT precio FROM mant_regional_codigos WHERE sede_id='pereira' AND codigo='MANPOI.02'"))[0].precio),245000)
assert.equal(Number((await rows("SELECT precio FROM mant_in_situ_codigos WHERE codigo='MANPOI.02'"))[0].precio),245000)
await assert.rejects(db.exec("UPDATE mant_regional_destinos SET ida_km=61 WHERE sede_id='cali'"),e=>e.code==='23514')
await assert.rejects(db.exec("UPDATE mant_regional_destinos SET peaje_manual_valor=0,peajes_confirmados=true WHERE sede_id='cali'"),e=>e.code==='23514')
await db.exec("UPDATE mant_regional_destinos SET peaje_manual_valor=0,peaje_manual_motivo='Sin peajes, revisado',peajes_confirmados=true WHERE sede_id='cali'")
await as(ids[1])
assert.equal((await rows('SELECT * FROM mant_regional_sedes')).length,5)
assert.equal((await rows('SELECT * FROM codigos_inet')).length,5)
assert.equal((await rows("UPDATE mant_regional_codigos SET precio=1 RETURNING codigo")).length,0)
await as(ids[2]); assert.equal((await rows('SELECT * FROM mant_regional_sedes')).length,0)
await as(ids[3]); assert.equal((await rows('SELECT * FROM mant_regional_sedes')).length,0)
// Validar el paso adicional al catálogo común y la incorporación del Excel.
await db.exec('RESET ROLE')
await db.exec(fs.readFileSync('supabase/migrations/20261013d_refractometros_in_situ.sql','utf8'))
await db.exec(fs.readFileSync('supabase/migrations/20261013e_regional_catalogo_excel.sql','utf8'))
await db.exec('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated')
const confirmed=JSON.parse(fs.readFileSync('supabase/data/mant-regional-precios-confirmados.json','utf8'))
await as(ids[0])
for(const [codigo,precio] of Object.entries(confirmed.codigos)) {
  assert.equal(Number((await rows(`SELECT precio FROM mant_regional_servicios WHERE codigo='${codigo}'`))[0].precio),precio)
}
assert.equal((await rows("SELECT * FROM codigos_inet WHERE codigo LIKE 'HI 968%'")).length,15)
assert.equal((await rows("SELECT * FROM codigos_inet WHERE codigo='HI 96801'"))[0].descripcion,'Descripción existente')
assert.equal((await rows("SELECT * FROM codigos_inet WHERE codigo='HI 96802'"))[0].codigo_mantenimiento_insitu,'MANTCHECKER.01')
assert.equal((await rows("SELECT * FROM mant_regional_referencias WHERE referencia LIKE 'HI 968%' AND codigo='MANFT.02'")).length,15)
assert.equal(Number((await rows("SELECT precio FROM mant_in_situ_codigos WHERE codigo='MANFT.02'"))[0].precio),245000)
assert.equal(Number((await rows("SELECT precio FROM mant_in_situ_codigos WHERE codigo='MANTR.02'"))[0].precio),370000)
assert.equal((await rows("SELECT * FROM mant_regional_referencias WHERE referencia IN ('HI 839800-01','HI 839800-02') AND codigo='MANTR.02'")).length,2)
assert.equal((await rows('SELECT * FROM mant_regional_referencias')).length>=794,true)
assert.equal(Number((await rows("SELECT horas FROM mant_regional_servicios WHERE codigo='MANT.TESTER.01'"))[0].horas),1)
// Una edición modifica el único precio compartido; no hay precio por sede.
await db.exec("UPDATE mant_regional_servicios SET precio=555000 WHERE codigo='MANFT.02'")
assert.equal((await rows("SELECT * FROM mant_regional_servicios WHERE codigo='MANFT.02'")).length,1)
await as(ids[1]); assert.equal((await rows("UPDATE mant_regional_servicios SET precio=1 RETURNING codigo")).length,0)
await as(ids[2]); assert.equal((await rows('SELECT * FROM mant_regional_servicios')).length,0)
// Permisos explícitos para Ventas, incluso sin acceso anterior a Bogotá.
await db.exec('RESET ROLE; ALTER TABLE roles ADD COLUMN name text')
await db.exec(`UPDATE roles SET name=CASE id WHEN '${ids[0]}' THEN 'Servicio Técnico' WHEN '${ids[1]}' THEN 'Ventas' ELSE 'Logística' END`)
const asesor='00000000-0000-0000-0000-000000000005'
await db.exec(`INSERT INTO roles(id,name) VALUES('${asesor}','Asesores'); INSERT INTO profiles VALUES('${asesor}','${asesor}',true)`)
const acceso=fs.readFileSync('supabase/migrations/20261013f_regional_acceso_roles.sql','utf8')
await db.exec(acceso); await db.exec(acceso)
await as(asesor)
assert.equal((await rows('SELECT * FROM mant_regional_sedes')).length,5)
assert.equal((await rows('SELECT * FROM mant_regional_servicios')).length>0,true)
assert.equal((await rows('SELECT public.has_capability(\'mant_in_situ_regional_editar\') AS editar'))[0].editar,false)
assert.equal((await rows("UPDATE mant_regional_servicios SET precio=1 RETURNING codigo")).length,0)
await as(ids[0]); assert.equal((await rows('SELECT public.has_capability(\'mant_in_situ_regional_editar\') AS editar'))[0].editar,true)
await as(ids[2]); assert.equal((await rows('SELECT * FROM mant_regional_sedes')).length,0)
await db.close()
console.log('Migraciones b/c/d/e/f, precios comunes, equipos, acceso a asesores sin edición y RLS: correctos')
