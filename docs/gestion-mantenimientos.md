# Gestión de mantenimientos

El SQL está preparado para revisión y aplicación por el administrador; no se ha ejecutado contra la base compartida. Archivo: docs/sql/instalar-gestion-mantenimientos.sql (mismo contenido que la migración 20261019).

## Vista previa local

En Vite dev se guardan solicitudes en localStorage, por usuario y navegador, con aviso visible. No se sincronizan con producción. Usar Respaldo JSON para conservar cálculos e historial completos antes de borrar datos o cambiar de equipo. El CSV permite revisar y reportar las solicitudes filtradas. No importar automáticamente el respaldo a producción: revisar los registros antes de su futura migración.

## Publicación

1. Revisar y aplicar el SQL con transacción, antes de publicar el frontend. Requiere las tablas y permisos regionales existentes.
2. El módulo se asigna a Servicio Técnico que ya tenga acceso regional. Solo ese rol puede leer y escribir; otras asignaciones del módulo no sustituyen la restricción al rol.
3. Actualizar sesión/permisos después de aplicar la instalación.
4. En producción las escrituras pasan por RPC, no por guardado local. Si falta la instalación, se muestra el error y no se simula éxito.

## Cálculo y seguimiento

El margen fijo es 5 % del subtotal completo (incluido Otros), redondeado a pesos. Se guardan cliente, origen, destino final, cotización opcional, creador, días, equipos, tarifas, desglose y total. Los importes son una instantánea: cambiar tarifas futuras no altera solicitudes guardadas.

El número de cotización se puede asociar después. Estados: pendiente, cotizada, aprobada, rechazada, programada, realizada y cancelada. Cotizada/aprobada/rechazada/programada/realizada requieren cotización. Rechazo y cancelación requieren motivo. Cada actualización genera un evento con fecha y usuario; se conserva la cotización histórica.

Las RPC generan el historial en el servidor y verifican versión para detectar actualizaciones concurrentes. No hay eliminación física ni modificación de la instantánea desde la pantalla. Permitir correcciones de estado mantiene el historial.

## Ciudades de origen y destino

Al guardar se selecciona municipio con búsqueda por nombre o código DANE y filtro por departamento, tanto en origen como en destino. Se incluye un respaldo de 267 municipios ya guardados en los catálogos Bogotá y regionales, y se unen todos los destinos disponibles en las tablas existentes sin aplicar límites de distancia. La dirección es opcional. Código DANE, municipio, departamento y detalle quedan en la instantánea JSON, además del texto legible; no se requiere SQL adicional. Los registros anteriores siguen siendo compatibles.

## Registro de consultas normal y regional

Aplicar, después del SQL de gestión, docs/sql/instalar-registro-consultas-mantenimientos.sql. Añade permiso mant_consultas_reportes a Servicio Técnico (rol de Andrés Latorre confirmado por el usuario). Los demás usuarios pueden consultar las calculadoras según sus módulos, pero no leer el registro. El servidor determina el usuario, correo y fecha a partir de la sesión y perfiles. No admite edición ni eliminación directa de registros.

Antes de revelar el precio se pide razón social y zona/barrio/sede. La consulta se registra al pulsar Consultar valor; modificar datos, equipos, cantidades o destino invalida el precio revelado. Se reutiliza el identificador al reintentar para no duplicar una misma consulta. Si falla el registro, no se revela el precio. En Vite dev la vista previa se guarda solo en el navegador; el reporte permite revisar las consultas hechas con distintos usuarios en ese mismo navegador.

Gestión se divide en Solicitudes y seguimiento, y Registro de consultas. El CSV de consultas contiene una fila por equipo con la identificación de la consulta, fecha, usuario, razón social y ubicación. El total repetido es de la consulta completa; no sumarlo entre filas de sus equipos. Los filtros se aplican antes de exportar, con fechas de Bogotá. La capacidad nueva se carga al renovar la sesión.
