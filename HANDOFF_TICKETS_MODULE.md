# Traspaso: Módulo "Tickets a Fábrica"

> Archivo temporal de contexto para retomar este trabajo desde otra máquina/usuario
> con otra sesión de Claude Code. Bórralo cuando el módulo ya esté mezclado a `main`
> y confirmado en producción — no es documentación permanente del proyecto.

## Qué es esto

Nuevo módulo que reemplaza el seguimiento en Notion de fallas/novedades de
equipos reportadas a fábrica (tickets). Vive en la rama
**`feat/modulo-tickets-fabrica`**.

## Estado actual (todo lo de código está listo)

- Frontend completo: formulario, tabla, modal de edición, tipos, hook de datos.
- Ruta `/tickets`, entrada en el sidebar (grupo "Estratégico"), guardado por
  módulo (`ModuleGuard`), label en Administración → Roles.
- Migración SQL escrita pero **NO aplicada todavía** en Supabase:
  [supabase/migrations/20260908_modulo_tickets_fabrica.sql](supabase/migrations/20260908_modulo_tickets_fabrica.sql)
- `npx tsc --noEmit` y `npx eslint` pasan limpio.
- Probado visualmente en `npm run dev` (con el `ModuleGuard` quitado
  temporalmente para poder verlo sin la migración corrida — ya se restauró
  antes de este commit, así que en este punto el módulo es invisible/
  inaccesible hasta que la migración se ejecute).

## Lo único que falta para terminar

1. **Correr la migración en Supabase** (el usuario no tenía acceso al
   dashboard cuando se construyó esto — hay que confirmar si ya lo tiene):
   - Entrar a app.supabase.com → el proyecto correcto → SQL Editor → pegar
     el contenido de `supabase/migrations/20260908_modulo_tickets_fabrica.sql`
     → Run.
   - Verificar con:
     ```sql
     select * from modules where key = 'tickets';
     select r.name from role_modules rm join roles r on r.id = rm.role_id where rm.module_key = 'tickets';
     ```
     Debe existir el módulo `tickets` y accesos para los roles
     `Servicio Técnico` y `Admin` (así se decidió con el usuario — no todos
     los roles).
2. **Probar en `npm run dev`** con datos reales: crear un ticket, escanear/
   pistolear QR (equipo normal y equipo madre), editar, eliminar, verificar
   que el sidebar muestre "Tickets a Fábrica" para un usuario con rol
   Servicio Técnico o Admin.
3. **Commit + push** de la rama (si no se ha hecho ya — revisa `git log` y
   `git status` primero).
4. **Abrir un Pull Request** `feat/modulo-tickets-fabrica` → `main` en
   GitHub (`gh pr create` o desde la web). El usuario prefirió PR en vez de
   push directo para este módulo por ser grande y nuevo.
5. Una vez mezclado, **borrar este archivo** (`HANDOFF_TICKETS_MODULE.md`) en
   un commit aparte.

## Decisiones de diseño ya tomadas (no las re-preguntes)

- **Acceso**: solo roles `Servicio Técnico` y `Admin` (ver
  `role_modules` en la migración).
- **Campo "Nombre"**: es el número de ticket que genera la plataforma de
  fábrica (no un ID autogenerado por la app). En UI se ve como un prefijo
  fijo **"Ticket ID: "** + el usuario solo escribe el número. Se guarda
  concatenado en la columna `nombre` (ej. `"Ticket ID: 22790"`).
- **Estado** (antes "Respuesta" en la idea original, se renombró): 7
  opciones fijas (`exportacion_garantia`, `consulta_resuelta`,
  `pendiente_feedback`, `exportacion`, `denegada_garantia`, `en_espera`,
  `cambio_garantia`). Al elegir un estado aparece un textarea "Detalle del
  estado" con placeholder contextual distinto por estado (patrón inspirado
  en Bodega ST, ver `ESTADO_NOTA_PLACEHOLDER` en
  `src/modules/tickets/types.ts`) — es un solo campo de texto libre, no
  columnas separadas por estado.
- **Equipo madre/hijo**: checkbox "Es una sonda/electrodo (equipo hijo)".
  Si se marca, se despliega un bloque para capturar el equipo madre
  (código/serial/nombre) con su propio reconocimiento de QR + botón de
  modo manual, independiente del QR del equipo principal. Objetivo:
  trazabilidad cuando falla solo un componente y no el equipo completo.
- **QR**: reutiliza `parseEquipoQR` de `src/modules/void/utils/qrParser.ts`
  (mismo parser que VOID y Bodega ST). Placeholder de ambos inputs de QR es
  simplemente **"QR AQUÍ"** (a petición explícita del usuario, sin el texto
  "PISTOLEAR").
- **Sin tabla de auditoría** (`_auditoria`) para este módulo — se decidió no
  replicar el patrón de VOID/Bodega ST porque no es el patrón mayoritario
  en el proyecto (Calibraciones, Tareas, Mantenimiento tampoco la tienen).

## Archivos tocados/creados en esta rama

Nuevos:
- `src/modules/tickets/types.ts`
- `src/modules/tickets/hooks/useTickets.ts`
- `src/modules/tickets/components/TicketForm.tsx`
- `src/modules/tickets/components/EditTicketModal.tsx`
- `src/modules/tickets/components/TicketsTable.tsx`
- `src/modules/tickets/pages/TicketsPage.tsx`
- `supabase/migrations/20260908_modulo_tickets_fabrica.sql`

Modificados:
- `src/App.tsx` (ruta `/tickets`)
- `src/components/layout/Sidebar.tsx` (item en grupo "Estratégico")
- `src/lib/constants.ts` (`MODULE_ROUTES`)
- `src/modules/admin/components/RolesMatrix.tsx` (`MODULE_LABELS`)
- `src/types/index.ts` (`ModuleKey` incluye `'tickets'`)

## Si algo no cuadra

Si el usuario dice que ya corrió la migración pero el módulo no aparece en
el sidebar: probablemente cerró sesión y no volvió a entrar (el rol/módulos
se cargan al iniciar sesión) — pedirle que cierre sesión y vuelva a entrar,
o revisar `useUser.ts` / la tabla `role_modules` directamente.
