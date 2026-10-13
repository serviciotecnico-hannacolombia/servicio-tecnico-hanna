# Datos y validación de Mantenimiento In Situ Regional

## Orígenes y cobertura

Las direcciones provienen del usuario. Los puntos de oficina se obtuvieron de enlaces oficiales de Hanna y de los edificios en los mapas enlazados, evitando usar el centro de la ciudad. Los enlaces originales están guardados junto a cada sede en `supabase/data/mant-in-situ-regional.json`.

| Oficina | Destinos <= 60 km viales de ida | Fuente del punto |
|---|---:|---|
| Barranquilla | 16 | [Smart Office Center](https://www.waze.com/live-map/directions/co/atlantico/barranquilla/smart-office-center?to=place.ChIJUx4xWqYt9I4RuvIdhwWlzZU) |
| Bucaramanga | 13 | [Mapa enlazado por Hanna](https://hannacolombia.com/bucaramanga-asesoria/) |
| Cali | 22 | [Mapa enlazado por Hanna](https://maps.app.goo.gl/WA5SbLDLnWFVyn8y7) |
| Medellín | 34 | [Edificio 43 Avenida, mapa enlazado por Hanna](https://maps.app.goo.gl/mPp1VM6bwKmfjcwJ8) |
| Pereira | 24 | [Edificio Alturia](https://www.waze.com/es-419/live-map/directions?from=place.w.186318896.1863254496.12000105) |

Los puntos de Cali y Medellín corresponden al cruce/edificio enlazado por Hanna; el de Pereira corresponde al edificio Alturia. Representan el acceso al edificio, no la ubicación de una oficina en un piso. La ruta se ajusta a la red vial de OSRM.

Se extrajeron 1.122 municipios y 186 peajes del HTML entregado. Solo se guardaron 109 rutas regionales y 74 peajes de referencia cercanos a las sedes. Bogotá y el resto de la aplicación offline no se importaron. El hash SHA-256 del archivo fuente quedó guardado para identificar la versión sin distribuir el HTML completo.

El radio geográfico de 60 km se utiliza únicamente para reducir candidatos. El criterio final es **distancia vial de ida <= 60 km desde la oficina**, sin redondear ni aplicar margen. La vuelta se consulta por separado porque los sentidos pueden tener recorridos distintos. No se filtra por departamento: las rutas admitidas incluyen municipios de Cauca, Magdalena, Caldas y Quindío, además de los departamentos de las sedes. El destino es la cabecera municipal del catálogo; una dirección de cliente diferente puede requerir revisión.

Ejemplos precalculados: Cali–Yumbo 18,4259 km de ida y 14,9121 km de vuelta; Pereira–Circasia 32,9564 km de ida y 34,1898 km de vuelta. Las distancias y tiempos son una estimación de la red vial en la fecha guardada, sin tráfico en vivo.

## Precio y peajes

Los precios, tiempos, asignaciones y excepciones iniciales se copian desde las tablas actuales de Bogotá **al ejecutar la migración de datos**. No hay sincronización posterior. Cada sede tiene sus códigos y sus asignaciones de equipos. El precio real regional queda pendiente del Excel; los 550.000 COP usados en las pruebas son un ejemplo, no una tarifa aplicada.

En la ciudad de la sede solo se cobra servicio base. Para los demás municipios se usa el motor existente con la ciudad base seleccionada: horas disponibles después del viaje, jornadas necesarias, vehículo, combustible y peajes por visita. No hay vuelos, hotel ni alimentación.

Las tarifas de peajes del HTML son históricas. Ni cercanía al punto ni rutas antiguas desde el centro permiten asegurar los peajes de la nueva ruta de oficina. Por eso no se asignan automáticamente ni se asume tarifa cero. Cada destino requiere total ida/regreso confirmado y nota de fuente/fecha; mientras esté pendiente no se muestra un total final ni se permite copiar cotización. La ciudad sede no requiere peajes.

## Aplicación de migraciones

Aplicar `20261013b_mant_in_situ_regional.sql` y después `20261013c_mant_in_situ_regional_datos.sql`, una vez cada una, desde Supabase SQL Editor. Ambas usan transacciones. Requieren las tablas actuales del módulo In Situ y la columna `codigos_inet.codigo_mantenimiento_insitu` ya migradas. Revisar que el módulo de Bogotá tenga configuración y precios antes de ejecutarlas. Si falla una consulta en una transacción, ejecutar `ROLLBACK` antes de reintentar.

No se ha aplicado SQL a producción desde este trabajo. No ejecutar los scripts de extracción para instalar el módulo: los datos ya están incluidos en las migraciones.

## Reproducción y pruebas

Para regenerar rutas se requiere acceso de red y el HTML fuente: `node scripts/preparar-regional.mjs "ruta/al/archivo.html"`. Después ejecutar `node scripts/generar-migracion-regional.mjs` y revisar el diff. Los scripts solo se usan durante mantenimiento de datos; no forman parte del frontend. Respeta las pausas incluidas entre consultas al servicio público.

- `node --test src/modules/mant-in-situ-regional/regional.test.mjs`: cobertura, ejemplos, cálculo regional y regresión de Bogotá.
- `node scripts/validar-migracion-regional.mjs "ruta/a/pglite/dist/index.js"`: migraciones reales sobre PostgreSQL embebido con fixtures; restricciones, permisos y aislamiento por sede. Requiere `@electric-sql/pglite` instalado aparte; no modifica producción.
- `npm run build` y lint de los archivos modificados.

Después de aplicar las migraciones: entrar con un rol de consulta y otro de edición; probar cambio de sede, departamento, municipio y equipo, confirmar un destino sin peajes y uno con peajes, y modificar un precio en Cali verificando que Pereira y Bogotá conserven sus valores.
