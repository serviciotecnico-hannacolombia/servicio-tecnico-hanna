-- Agrega marca de prioridad a las llamadas del diario, para fijarlas al inicio de la lista.
alter table public.llamadas_diario
  add column if not exists prioridad boolean not null default false;

create index if not exists idx_llamadas_diario_prioridad
  on public.llamadas_diario (fecha_dia, prioridad desc, created_at asc);
