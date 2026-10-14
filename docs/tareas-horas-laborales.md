# Tareas: tiempo de atención

El tiempo empieza en created_at y termina en completado_at para tareas completadas. Para pendientes se calcula hasta el momento de consulta. Representa tiempo transcurrido de atención, no horas de trabajo efectivo. Al reabrir, vuelve a calcularse desde la creación; no se descuentan periodos de cierres anteriores porque no existe un historial de esos cambios. Completadas sin fecha de cierre muestran dato no disponible.

Horario de Colombia: lunes a jueves 07:30–17:00 y viernes 07:30–16:00. Jornada continua, sin descontar almuerzo por defecto. No cuenta sábados, domingos ni festivos nacionales. Se muestra en las tarjetas y en Tiempo (horas hábiles) del CSV, redondeado a dos decimales. El cálculo es independiente de la zona horaria del navegador.

## Preparación para aplicar

1. Ejecutar docs/sql/actualizar-tareas-privacidad.sql completo en SQL Editor del proyecto correcto. Incluye columna de privacidad, RLS y protección de edición. No elimina tareas y puede repetirse. No se ha aplicado en producción.
2. Integrar y desplegar la rama de Tareas. El merge lo realiza el usuario.
3. Recargar la sesión y comprobar una tarea privada y una pública con creador, asignado y tercero, y completar una tarea para ver sus horas.

La compatibilidad temporal permite crear privadas antes de aplicar el SQL. Las públicas requieren la migración. El reporte conserva su rango de fechas y no incluye ID ni visibilidad.

## Calendario

Fuente de festivos: Ley 51 de 1983 y Ley 2578 de 2026; traslado del descanso de julio según Circular 23 de 2026 de MinTIC: https://normograma.mintic.gov.co/mintic/compilacion/docs/circular_mintic_0023_2026.htm . Se corrige el calendario compartido: en 2026 el 9 de julio es laborable y el descanso corresponde al 13 de julio. Esto también corrige los otros módulos que usan ese calendario.
