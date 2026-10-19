import fs from 'node:fs'
import assert from 'node:assert/strict'
import {PGlite} from '../.cache/gestion-sql-check/node_modules/@electric-sql/pglite/dist/index.js'
const db=new PGlite()
await db.exec(`CREATE TABLE roles(id text PRIMARY KEY,name text);CREATE TABLE modules(key text PRIMARY KEY);CREATE TABLE capabilities(key text PRIMARY KEY);
CREATE TABLE role_modules(role_id text,module_key text,PRIMARY KEY(role_id,module_key));CREATE TABLE role_capabilities(role_id text,capability_key text,PRIMARY KEY(role_id,capability_key));
CREATE TABLE profiles(id text PRIMARY KEY,role_id text,activo boolean);
INSERT INTO roles VALUES('st','Servicio Técnico'),('ventas','Ventas'),('admin','Admin');
INSERT INTO modules VALUES('mant_in_situ'),('mant_in_situ_regional');
INSERT INTO profiles VALUES('tecnico1','st',true),('tecnico2','st',true),('inactivo','st',false),('asesor','ventas',true),('administrador','admin',true);`)
const antes=(await db.query('SELECT * FROM profiles ORDER BY id')).rows
const sql=fs.readFileSync('supabase/migrations/20261019_personalizado_permiso_rol.sql','utf8')
await db.exec(sql);await db.exec(sql)
const filas=(await db.query(`SELECT p.id, p.activo AND EXISTS(SELECT 1 FROM role_modules rm WHERE rm.role_id=p.role_id AND rm.module_key='mant_in_situ_regional') AND EXISTS(SELECT 1 FROM role_capabilities rc WHERE rc.role_id=p.role_id AND rc.capability_key='mant_in_situ_personalizado') AS permitido FROM profiles p`)).rows
for(const id of ['tecnico1','tecnico2'])assert.equal(filas.find(f=>f.id===id).permitido,true)
for(const id of ['inactivo','asesor','administrador'])assert.equal(filas.find(f=>f.id===id).permitido,false)
assert.equal((await db.query("SELECT * FROM role_capabilities WHERE role_id='st'")).rows.length,1)
assert.equal((await db.query("SELECT * FROM role_modules WHERE role_id='st'")).rows.length,2)
assert.deepEqual((await db.query('SELECT * FROM profiles ORDER BY id')).rows,antes)
await db.close();console.log('Permiso validado: dos técnicos sin administración heredan acceso; otros roles e inactivos no; repetible y sin cambios en perfiles individuales.')
