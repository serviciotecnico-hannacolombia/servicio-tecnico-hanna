-- Refuerza a nivel de base de datos que no existan dos registros VOID con el
-- mismo sello "VOID Blanco" (la app ya lo valida antes de insertar/editar,
-- esto cubre condiciones de carrera con varios usuarios a la vez).
CREATE UNIQUE INDEX IF NOT EXISTS void_registros_void_blanco_unique_idx
  ON void_registros (upper(trim(void_blanco)));
