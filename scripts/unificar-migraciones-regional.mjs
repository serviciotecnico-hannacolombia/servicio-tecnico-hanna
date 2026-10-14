// Documento de instalación manual; fuera de migrations para evitar aplicación doble.
import fs from 'node:fs'
const archivos = [
  '20261013b_mant_in_situ_regional.sql',
  '20261013c_mant_in_situ_regional_datos.sql',
  '20261013d_refractometros_in_situ.sql',
  '20261013e_regional_catalogo_excel.sql',
  '20261013f_regional_acceso_roles.sql',
]
const encabezado = `-- INSTALACIÓN COMPLETA: MANTENIMIENTO IN SITU REGIONAL
-- Copiar TODO este archivo en Supabase SQL Editor y ejecutar una sola vez.
-- Requiere el módulo In Situ Bogotá ya configurado.
-- No usar si ya se aplicó alguna migración regional: el control inicial se detendrá.
-- Todo se aplica en una única transacción. Si falla, no queda instalado parcialmente.
-- Al terminar: cerrar sesión y volver a entrar en la intranet.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname='public' AND tablename LIKE 'mant_regional_%') THEN
    RAISE EXCEPTION 'Ya existen tablas regionales. No repetir la instalación completa: comprobar las migraciones aplicadas';
  END IF;
END $$;

`
const cuerpo = archivos.map(nombre => {
  const sql = fs.readFileSync(`supabase/migrations/${nombre}`,'utf8').replace(/^(BEGIN|COMMIT);\r?$/gm,'')
  return `-- ============================================================\n-- ${nombre}\n-- ============================================================\n${sql}\n`
}).join('\n')
fs.mkdirSync('docs/sql',{recursive:true})
fs.writeFileSync('docs/sql/instalar-mant-in-situ-regional.sql',encabezado+cuerpo+'\nCOMMIT;\n')
console.log('Documento SQL completo generado: docs/sql/instalar-mant-in-situ-regional.sql')
