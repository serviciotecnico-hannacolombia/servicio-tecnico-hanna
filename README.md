# Intranet — Servicio Técnico Hanna Instruments Colombia

Aplicación web interna para el equipo de Servicio Técnico de Hanna Instruments Colombia. Centraliza el seguimiento diario de llamadas, el control de consumibles, la gestión de tarifas, certificados y órdenes de compra en una sola herramienta de uso exclusivo del equipo.

---

## Módulos

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

### Correos
Generación rápida de correos preformateados que se abren directamente en el cliente de correo del usuario (sin APIs externas):

- **Orden de Compra** — genera el correo al proveedor de calibración con destinatarios TO/CC configurados por proveedor, datos de la OC, NIT, RMV y fecha estimada de envío.
- **Certificados de Calibración** — genera el correo al cliente final con CC fijo a Servicio Técnico, saludo inclusivo (Estimado/Estimada) y nombre del cliente normalizado automáticamente desde el código de servicio.

Los destinatarios de cada proveedor se administran desde el panel de **Administración → Correos OC**.

### Control VOID
Registro y control de los sellos VOID (blanco y gris) colocados a los equipos, organizado por libro (Calibración, Bogotá, Cali, Medellín, Bucaramanga, Pereira, CC No requerido, Sin Sistema, Reenvíos Logística). Lee el código QR del equipo para autocompletar referencia, número de serie y nombre, deja trazabilidad del documento de referencia (factura, remisión u OTST), mantiene historial de auditoría de cada registro y permite exportar a Excel.

### Bodega ST
Seguimiento de equipos en restauración dentro de la bodega de Servicio Técnico, desde el diagnóstico hasta quedar listos para despacho (En diagnóstico, En reparación, Incompleto/espera de partes, Restaurado y listo). Registra ubicación en estante, técnico responsable, partes requeridas y reparaciones realizadas, con indicadores por estado, historial de auditoría y exportación a Excel.

### Administración *(solo admins)*
Gestión de usuarios: creación, cambio de rol, activación/desactivación y eliminación. Incluye la configuración de destinatarios de correo TO/CC por proveedor de calibración.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilos | CSS variables (design tokens), estilos inline |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime) |
| Estado servidor | TanStack Query v5 |
| Formularios | React Hook Form + Zod |
| Gráficas | Recharts |
| Iconos | Lucide React |
| Notificaciones | Sonner |
| Routing | React Router v7 |

---

## Desarrollo local

```bash
npm install
npm run dev
```

Requiere un archivo `.env` con las variables de Supabase:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```

---

## Despliegue

La aplicación está configurada para Vercel con soporte de SPA routing (`vercel.json` incluido). Cualquier push a `main` genera un despliegue automático.

---

Desarrollado por [@brayansgl](https://www.instagram.com/brayansgl) 🐱
