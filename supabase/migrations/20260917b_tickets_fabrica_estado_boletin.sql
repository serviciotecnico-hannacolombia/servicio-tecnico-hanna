-- Tickets a Fábrica: nuevo estado "Boletín Técnico".

ALTER TABLE tickets_fabrica DROP CONSTRAINT IF EXISTS tickets_fabrica_estado_check;

ALTER TABLE tickets_fabrica ADD CONSTRAINT tickets_fabrica_estado_check CHECK (estado IN (
  'exportacion_garantia', 'consulta_resuelta', 'pendiente_feedback',
  'exportacion', 'denegada_garantia', 'en_espera', 'cambio_garantia',
  'boletin_tecnico'
));
