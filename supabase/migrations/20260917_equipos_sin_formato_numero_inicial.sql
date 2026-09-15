-- ============================================================
-- El consecutivo SF-N arranca en 700 (numeración acordada con el
-- equipo), no en 1.
-- ============================================================

ALTER TABLE equipos_sin_formato ALTER COLUMN numero RESTART WITH 700;
