-- Bodega ST: marcar si el equipo que ya salió a una bodega destino
-- (Principal, Incompletos o PNC) fue entregado físicamente a logística.

ALTER TABLE bodega_st_registros ADD COLUMN IF NOT EXISTS entregado_logistica boolean NOT NULL DEFAULT false;
