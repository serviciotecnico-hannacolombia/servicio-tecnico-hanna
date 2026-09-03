-- ============================================================
-- Trazabilidad de origen para codigos_accesorios: distingue los pares
-- que vinieron del catálogo oficial de Hanna (seed inicial / futuras
-- reimportaciones del Excel) de los que un técnico agregó a mano tras
-- descubrir en campo que un accesorio también aplica a otro equipo.
-- ============================================================

ALTER TABLE codigos_accesorios
  ADD COLUMN origen  text NOT NULL DEFAULT 'catalogo' CHECK (origen IN ('catalogo', 'manual')),
  ADD COLUMN usuario text;
-- El DEFAULT 'catalogo' se aplica también a los 11.153 registros ya
-- existentes (todos vinieron del Excel) — no requiere backfill aparte.
