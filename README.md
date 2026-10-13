# Intranet — Servicio Técnico Hanna Instruments Colombia

Aplicación web interna para el equipo de Servicio Técnico de Hanna Instruments Colombia. Centraliza el seguimiento de OTSTs, equipos, calibraciones, garantías, consumibles y documentación técnica, con acceso según los permisos de cada usuario.

---

## Módulos

La navegación agrupa los módulos por área de negocio. Cada usuario ve los módulos y acciones autorizados por su rol.

### Control de Llamadas
Seguimiento diario de OTSTs asignadas al equipo. Permite importar la lista del día desde CSV, registrar el estado de cada llamada (Cierre, Contactado, Sin contacto, No llamado), ver el avance en tiempo real y archivar el día al finalizar. Incluye una carrera interna con puntaje por usuario y detección de clientes con múltiples OTSTs.

### Consumibles
Control de llegadas y destapes de soluciones técnicas (buffers, estándares, reactivos). Lee el código QR del envase en formato Hanna (`Ñ`-delimitado) y extrae automáticamente la referencia, lote, vencimiento, volumen y descripción. Lleva inventario de unidades en stock y destapadas, con historial completo y búsqueda por referencia o lote.

### Tarifas de Envío
Gestión de las tarifas de envío vigentes por transportadora y destino.

### Códigos y Partes
Consulta de códigos de repuestos y partes de instrumentos.

### Editor de Informes
Editor WYSIWYG para redactar y formatear informes técnicos con plantillas reutilizables.

### Indicadores
Tablero de metas e indicadores reales del área de servicio técnico.

### Correos integrados en Calibraciones
Preparación de correos que se abren en el cliente de correo del usuario:

- **Orden de Compra** — genera el correo al proveedor de calibración con destinatarios TO/CC configurados por proveedor, datos de la OC, NIT, RMV y fecha estimada de envío.
- **Certificados de Calibración** — genera el correo al cliente final con CC fijo a Servicio Técnico, saludo inclusivo (Estimado/Estimada) y nombre del cliente normalizado automáticamente desde el código de servicio.

Los destinatarios de cada proveedor se administran desde el panel de **Administración → Correos OC**.

Esta funcionalidad está integrada en los flujos de Calibraciones; no hay un módulo independiente de Correos. También existen notificaciones automáticas de calibraciones y pendientes logísticos mediante Edge Functions y Resend.

### Control VOID
Registro y control de los sellos VOID (blanco y gris) colocados a los equipos, organizado por libro (Calibración, Bogotá, Cali, Medellín, Bucaramanga, Pereira, CC No requerido, Sin Sistema, Reenvíos Logística). Lee el código QR del equipo para autocompletar referencia, número de serie y nombre, deja trazabilidad del documento de referencia (factura, remisión u OTST), mantiene historial de auditoría de cada registro y permite exportar a Excel.

### Bodega ST
Seguimiento de equipos en restauración dentro de la bodega de Servicio Técnico, desde el diagnóstico hasta quedar listos para despacho (En diagnóstico, En reparación, Incompleto/espera de partes, Restaurado y listo). Registra ubicación en estante, técnico responsable, partes requeridas y reparaciones realizadas, con indicadores por estado, historial de auditoría y exportación a Excel.

### Administración *(solo admins)*
Gestión de usuarios: creación, cambio de rol, activación/desactivación y eliminación. Administración de roles y permisos por módulo y por acción. Incluye la configuración de destinatarios de correo TO/CC por proveedor de calibración. Requiere acceso al módulo de Administración.

### Bodega (OTSTs)
Ubicación de OTSTs por zonas, columnas y filas, con registro de ingresos, traslados, contactos, retiros, novedades y pendientes. Es un módulo distinto de Bodega ST, que gestiona equipos en restauración.

### Calibraciones
Gestión de órdenes en laboratorio externo, in situ o sede Hanna Dorado. Seguimiento desde la creación de la OC hasta el envío de certificados y cierre, incluyendo mantenimiento, programación, envío, retorno, control de calidad y carga al sistema. Incluye logística, coordinación, análisis e historial de cambios.

### Certificados de Calidad
Preparación de certificados con plantillas de mediciones, soluciones patrón, checklist, adjuntos e historial. Transferencia de datos a la intranet Hanna mediante un userscript.

### Mantenimiento Programado
Registro de equipos y eventos de mantenimiento, periodicidad y próxima fecha de servicio. Permite incorporar información del equipo mediante QR.

### Tareas
Asignación de tareas a usuarios, fechas de vencimiento y seguimiento de pendientes y completadas. Son privadas por defecto: solo las ven el creador y el asignado. El creador puede hacerlas públicas al crear o editar; aparecen en **Todas** para los usuarios activos con acceso a Tareas. Solo el creador puede editar o eliminar, y el creador y el asignado pueden completar o reabrir.

### Reporte ST
Procesamiento de archivos CSV para analizar tiempos de servicio, horas hábiles, cumplimiento y excepciones, con exportación a Excel.

### Tickets de Fábrica
Registro, importación desde Excel y seguimiento de solicitudes a fábrica.

### Equipos Sin Formato
Seguimiento desde la recepción hasta el ingreso, pasando por pendiente y preingresado, con equipos asociados, anulación e historial.

### Garantías
Seguimiento de PNC, nota de venta, importación, informe y finalización, con responsables, notas, anulación e historial.

### Mantenimiento In Situ
Cálculo del servicio por equipos y destino, considerando horas de trabajo, desplazamiento, combustible, peajes y precios configurables.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilos | CSS variables (design tokens), estilos inline |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Estado servidor | TanStack Query v5 |
| Formularios | React Hook Form + Zod |
| Gráficas | Recharts |
| Iconos | Lucide React |
| Notificaciones | Sonner |
| Routing | React Router v7 |
| CSV y Excel | Papa Parse + SheetJS (`xlsx`) |
| Funciones de servidor | Supabase Edge Functions (Deno) |
| Correos automáticos | Resend, desde Edge Functions |

El navegador consulta Supabase con la clave pública del proyecto. La interfaz aplica controles de autenticación, módulos y capacidades; las políticas de seguridad por fila (RLS) y las funciones SQL controlan el acceso en la base de datos. Control de Llamadas utiliza Realtime; otros módulos emplean consultas e invalidación de caché o actualización periódica.

### Estructura

```text
src/
  components/       # Autenticación, layout y componentes de interfaz
  hooks/            # Usuario, permisos y perfiles compartidos
  lib/              # Supabase, QueryClient, constantes y calendario
  modules/          # Páginas, hooks y lógica de cada módulo
  styles/           # Estilos globales y variables de diseño
  types/            # Modelos y claves de permisos compartidos
  utils/            # Utilidades comunes
supabase/
  migrations/       # Esquema, políticas RLS, funciones y datos iniciales
  functions/        # Gestión de usuarios y notificaciones
userscripts/        # Integraciones con la intranet Hanna
```

---

## Desarrollo local

Requiere Node.js compatible con la versión de Vite instalada, npm y un proyecto Supabase con el esquema y permisos correspondientes. Copiar `.env.example` a `.env` en la raíz y completar las variables antes de iniciar.

```bash
npm ci
npm run dev
```

`npm ci` instala las versiones del archivo `package-lock.json`. Para agregar o actualizar dependencias, usar `npm install` y revisar los cambios en el lockfile.

Variables del archivo `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```

Las variables `VITE_*` se incluyen en el cliente. No colocar claves `service_role` ni secretos de correo en ellas, ni subir `.env` al repositorio. Reiniciar Vite si se cambian estas variables.

En PowerShell, si se bloquea `npm.ps1`, usar `npm.cmd ci` y `npm.cmd run dev`.

### Comandos disponibles

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo; abrir la dirección local que muestre Vite. |
| `npm run build` | Comprobación TypeScript y compilación de producción en `dist/`. |
| `npm run lint` | Análisis estático con ESLint. |
| `npm run preview` | Vista previa local de la compilación. |

Actualmente no hay un script de pruebas automatizadas en `package.json`.

## Supabase e integraciones

Las migraciones versionan la evolución de tablas, permisos, auditoría y catálogos. Antes de usar una base nueva o actualizar un entorno, revisar y aplicar las migraciones correspondientes en orden. La compilación del frontend no aplica migraciones ni despliega funciones de servidor.

| Edge Function | Propósito |
|---|---|
| `manage-users` | Creación y eliminación de usuarios, validando acceso a Administración. |
| `self-signup` | Registro de usuarios según las validaciones de la función. |
| `calibraciones-notificar` | Notificaciones por correo de cambios de estado de calibraciones. |
| `logistica-notificar-pendiente` | Notificaciones por correo de pendientes logísticos. |

Según la función, se utilizan `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; las funciones de correo también requieren `RESEND_API_KEY` y `RESEND_FROM_EMAIL`. Estos secretos se configuran en Supabase y permanecen en el servidor.

Los scripts de `userscripts/` generan QR para Mantenimiento Programado y transfieren datos de Certificados de Calidad a la intranet Hanna. Se instalan por separado en un gestor de userscripts compatible; no forman parte del bundle de Vite.

---

## Despliegue

Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el entorno de compilación del proveedor y ejecutar `npm run build`.

### Cloudflare Workers

`wrangler.jsonc` configura el worker `servicio-tecnico-hanna` para servir `dist/`, con soporte de navegación SPA. Con las credenciales y permisos de Cloudflare configurados:

```bash
npm run build
npx wrangler deploy
```

### Vercel

El repositorio también conserva `vercel.json`, con una reescritura hacia `index.html` para las rutas SPA. Usar `npm run build` como comando de compilación y `dist` como directorio de salida.

Los despliegues automáticos por rama dependen de la integración configurada en el proveedor de alojamiento.

## Colaboración con Git

Crear una rama por mejora o corrección, mantener los commits enfocados y abrir un pull request hacia `main`. Describir el cambio y su validación; ejecutar `npm run build` y `npm run lint` cuando corresponda y documentar cualquier fallo pendiente. Revisar el diff antes del merge y excluir archivos de entorno, secretos y cambios ajenos a la tarea.

---

Desarrollado por [@brayansgl](https://www.instagram.com/brayansgl) 🐱
