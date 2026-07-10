-- ============================================================
-- Reemplaza las políticas RLS "USING (true)" (o inconsistentes/
-- redundantes) por control real basado en has_module()/has_capability().
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "read_profiles"           ON profiles;
DROP POLICY IF EXISTS "admin_update_profiles"   ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;

CREATE POLICY "profiles select" ON profiles
  FOR SELECT TO authenticated USING (true); -- lo consume useProfiles.ts en toda la app (avatares, dropdowns)

CREATE POLICY "profiles update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR has_module('admin'))
  WITH CHECK (id = auth.uid() OR has_module('admin'));
  -- protect_profile_role_trigger (migración anterior) evita que alguien sin
  -- el módulo admin cambie su propio role_id/activo aunque la UPDATE pase.

-- ── roles / modules / capabilities / role_modules / role_capabilities ─────
ALTER TABLE roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE capabilities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_modules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_capabilities   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles select" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles write"  ON roles FOR ALL TO authenticated
  USING (has_module('admin')) WITH CHECK (has_module('admin'));

CREATE POLICY "modules select" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "capabilities select" ON capabilities FOR SELECT TO authenticated USING (true);
-- sin política de escritura: el catálogo de módulos/capacidades es fijo, se
-- siembra por migración; solo los roles son dinámicos.

CREATE POLICY "role_modules select" ON role_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_modules write"  ON role_modules FOR ALL TO authenticated
  USING (has_module('admin')) WITH CHECK (has_module('admin'));

CREATE POLICY "role_capabilities select" ON role_capabilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_capabilities write"  ON role_capabilities FOR ALL TO authenticated
  USING (has_module('admin')) WITH CHECK (has_module('admin'));
-- SELECT queda abierto en estas 5 tablas a propósito: useUser.ts necesita
-- poder leer el role_id -> permisos del usuario logueado sin ser admin.

-- ── otst_bodega: split ingreso/eliminar ────────────────────────────────────
DROP POLICY IF EXISTS "auth read otst_bodega" ON otst_bodega;
DROP POLICY IF EXISTS "auth all otst_bodega"  ON otst_bodega;

CREATE POLICY "bodega select" ON otst_bodega
  FOR SELECT TO authenticated USING (has_module('bodega'));

CREATE POLICY "bodega insert requiere ingreso" ON otst_bodega
  FOR INSERT TO authenticated
  WITH CHECK (has_module('bodega') AND has_capability('bodega_registrar_ingreso'));

CREATE POLICY "bodega update" ON otst_bodega
  FOR UPDATE TO authenticated
  USING (has_module('bodega')) WITH CHECK (has_module('bodega'));

CREATE POLICY "bodega delete requiere eliminar" ON otst_bodega
  FOR DELETE TO authenticated
  USING (has_module('bodega') AND has_capability('bodega_eliminar'));

DROP POLICY IF EXISTS "auth read otst_bodega_movimientos" ON otst_bodega_movimientos;
DROP POLICY IF EXISTS "auth all otst_bodega_movimientos"  ON otst_bodega_movimientos;

CREATE POLICY "movimientos select" ON otst_bodega_movimientos
  FOR SELECT TO authenticated USING (has_module('bodega'));

CREATE POLICY "movimientos insert" ON otst_bodega_movimientos
  FOR INSERT TO authenticated
  WITH CHECK (
    has_module('bodega')
    AND (tipo <> 'ingreso' OR has_capability('bodega_registrar_ingreso'))
  );
-- sin UPDATE/DELETE: la app nunca modifica movimientos, es un log de auditoría.

DROP POLICY IF EXISTS "auth read otst_bodega_zonas" ON otst_bodega_zonas;
DROP POLICY IF EXISTS "auth all otst_bodega_zonas"  ON otst_bodega_zonas;
CREATE POLICY "bodega_zonas select" ON otst_bodega_zonas FOR SELECT TO authenticated USING (has_module('bodega'));
CREATE POLICY "bodega_zonas write"  ON otst_bodega_zonas FOR ALL TO authenticated
  USING (has_module('bodega')) WITH CHECK (has_module('bodega'));

DROP POLICY IF EXISTS "auth read otst_bodega_config" ON otst_bodega_config;
DROP POLICY IF EXISTS "auth all otst_bodega_config"  ON otst_bodega_config;
CREATE POLICY "bodega_config select" ON otst_bodega_config FOR SELECT TO authenticated USING (has_module('bodega'));
CREATE POLICY "bodega_config write"  ON otst_bodega_config FOR ALL TO authenticated
  USING (has_module('bodega')) WITH CHECK (has_module('bodega'));

DROP POLICY IF EXISTS "auth read otst_bodega_pendientes" ON otst_bodega_pendientes;
DROP POLICY IF EXISTS "auth all otst_bodega_pendientes"  ON otst_bodega_pendientes;
CREATE POLICY "bodega_pendientes select" ON otst_bodega_pendientes FOR SELECT TO authenticated USING (has_module('bodega'));
CREATE POLICY "bodega_pendientes write"  ON otst_bodega_pendientes FOR ALL TO authenticated
  USING (has_module('bodega')) WITH CHECK (has_module('bodega'));

-- ── codigos_inet: editar_codigos / gestion_codigos / importar_csv_codigos
--    colapsan en una sola condición de escritura (misma tabla, mismo set
--    de roles hoy — ver plan) ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso autenticado"                    ON codigos_inet;
DROP POLICY IF EXISTS "Admin puede eliminar codigos_inet"      ON codigos_inet;
DROP POLICY IF EXISTS "Admin puede insertar codigos_inet"      ON codigos_inet;
DROP POLICY IF EXISTS "Lectura autenticada - codigos_inet"     ON codigos_inet;

CREATE POLICY "codigos_inet select" ON codigos_inet
  FOR SELECT TO authenticated USING (has_module('codigos'));

CREATE POLICY "codigos_inet write" ON codigos_inet
  FOR ALL TO authenticated
  USING (has_module('codigos') AND has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos']))
  WITH CHECK (has_module('codigos') AND has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos']));

DROP POLICY IF EXISTS "Acceso autenticado"                  ON codigos_sp_price;
DROP POLICY IF EXISTS "Lectura autenticada - codigos_sp_price" ON codigos_sp_price;

CREATE POLICY "codigos_sp_price select" ON codigos_sp_price
  FOR SELECT TO authenticated USING (has_module('codigos'));

CREATE POLICY "codigos_sp_price write" ON codigos_sp_price
  FOR ALL TO authenticated
  USING (has_module('codigos') AND has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos']))
  WITH CHECK (has_module('codigos') AND has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos']));

-- ── tarifas_envio: único camino de escritura es el import CSV ─────────────
DROP POLICY IF EXISTS "Admin edita tarifas_envio"          ON tarifas_envio;
DROP POLICY IF EXISTS "Lectura autenticada - tarifas_envio" ON tarifas_envio;

CREATE POLICY "tarifas_envio select" ON tarifas_envio
  FOR SELECT TO authenticated USING (has_module('tarifas'));

CREATE POLICY "tarifas_envio write" ON tarifas_envio
  FOR ALL TO authenticated
  USING (has_module('tarifas') AND has_capability('importar_csv_tarifas'))
  WITH CHECK (has_module('tarifas') AND has_capability('importar_csv_tarifas'));

-- ── consumibles ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read/write" ON consumibles_llegada;
CREATE POLICY "consumibles_llegada select" ON consumibles_llegada FOR SELECT TO authenticated USING (has_module('consumibles'));
CREATE POLICY "consumibles_llegada write"  ON consumibles_llegada FOR ALL TO authenticated
  USING (has_module('consumibles')) WITH CHECK (has_module('consumibles'));

DROP POLICY IF EXISTS "Authenticated users can read/write" ON consumibles_destape;
CREATE POLICY "consumibles_destape select" ON consumibles_destape FOR SELECT TO authenticated USING (has_module('consumibles'));
CREATE POLICY "consumibles_destape write"  ON consumibles_destape FOR ALL TO authenticated
  USING (has_module('consumibles')) WITH CHECK (has_module('consumibles'));

-- ── indicadores ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Acceso autenticado - metas" ON indicadores_metas;
CREATE POLICY "indicadores_metas select" ON indicadores_metas FOR SELECT TO authenticated USING (has_module('indicadores'));
CREATE POLICY "indicadores_metas write"  ON indicadores_metas FOR ALL TO authenticated
  USING (has_module('indicadores')) WITH CHECK (has_module('indicadores'));

DROP POLICY IF EXISTS "Acceso autenticado - reales" ON indicadores_reales;
CREATE POLICY "indicadores_reales select" ON indicadores_reales FOR SELECT TO authenticated USING (has_module('indicadores'));
CREATE POLICY "indicadores_reales write"  ON indicadores_reales FOR ALL TO authenticated
  USING (has_module('indicadores')) WITH CHECK (has_module('indicadores'));

-- ── llamadas: sin split para importar_csv_llamadas (no se puede distinguir
--    en RLS de altas/bajas manuales — ver plan; se gatea solo en UI) ───────
DROP POLICY IF EXISTS "auth_all" ON llamadas_diario;
CREATE POLICY "llamadas_diario select" ON llamadas_diario FOR SELECT TO authenticated USING (has_module('llamadas'));
CREATE POLICY "llamadas_diario write"  ON llamadas_diario FOR ALL TO authenticated
  USING (has_module('llamadas')) WITH CHECK (has_module('llamadas'));

DROP POLICY IF EXISTS "auth_all" ON llamadas_historico;
CREATE POLICY "llamadas_historico select" ON llamadas_historico FOR SELECT TO authenticated USING (has_module('llamadas'));
CREATE POLICY "llamadas_historico write"  ON llamadas_historico FOR ALL TO authenticated
  USING (has_module('llamadas')) WITH CHECK (has_module('llamadas'));

DROP POLICY IF EXISTS "auth read llamadas_cierres" ON llamadas_cierres;
DROP POLICY IF EXISTS "auth all llamadas_cierres"  ON llamadas_cierres;
CREATE POLICY "llamadas_cierres select" ON llamadas_cierres FOR SELECT TO authenticated USING (has_module('llamadas'));
CREATE POLICY "llamadas_cierres write"  ON llamadas_cierres FOR ALL TO authenticated
  USING (has_module('llamadas')) WITH CHECK (has_module('llamadas'));

DROP POLICY IF EXISTS "auth_all" ON carrera_config;
CREATE POLICY "carrera_config select" ON carrera_config FOR SELECT TO authenticated USING (has_module('llamadas'));
CREATE POLICY "carrera_config write"  ON carrera_config FOR ALL TO authenticated
  USING (has_module('llamadas')) WITH CHECK (has_module('llamadas'));

-- ── correos: lectura cruzada correos/admin, escritura solo admin ──────────
DROP POLICY IF EXISTS "auth read proveedores" ON correos_proveedores;
DROP POLICY IF EXISTS "auth all proveedores"  ON correos_proveedores;
CREATE POLICY "correos_proveedores select" ON correos_proveedores
  FOR SELECT TO authenticated USING (has_module('correos') OR has_module('admin'));
CREATE POLICY "correos_proveedores write" ON correos_proveedores
  FOR ALL TO authenticated USING (has_module('admin')) WITH CHECK (has_module('admin'));

DROP POLICY IF EXISTS "auth read destinatarios" ON correos_destinatarios;
DROP POLICY IF EXISTS "auth all destinatarios"  ON correos_destinatarios;
CREATE POLICY "correos_destinatarios select" ON correos_destinatarios
  FOR SELECT TO authenticated USING (has_module('correos') OR has_module('admin'));
CREATE POLICY "correos_destinatarios write" ON correos_destinatarios
  FOR ALL TO authenticated USING (has_module('admin')) WITH CHECK (has_module('admin'));
