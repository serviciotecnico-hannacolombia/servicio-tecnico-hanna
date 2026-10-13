# Actualización regional: cobertura y recargo

Bogotá y Regional mantienen pantallas independientes. Cobertura regional: hasta 110 km por carretera de ida desde la oficina. Recargo por visita: `max(0, ida_km - 60) × tarifa_km`, inicial 300 COP/km, sin duplicar por regreso ni aplicar margen a esos kilómetros. El desplazamiento habitual conserva ida y vuelta, combustible, vehículo y tiempo.

Las geometrías se obtienen una vez de OSRM/OpenStreetMap, hasta la cabecera municipal, y se cruzan con el catálogo de casetas. Una estación puede cobrar en ambas direcciones; no se agrega dos veces en el mismo sentido. No se presupone una tarifa cero para casetas desconocidas. Los ajustes manuales confirmados sustituyen el total automático.

## Aplicación

Ejecutar `docs/sql/actualizar-regional-110-peajes.sql` una vez después de las migraciones regionales b–f y antes de desplegar el frontend. No se ha ejecutado en producción.

## Destinos pendientes

Las siguientes excepciones necesitan confirmar el total de peajes en Configuración regional. Los datos públicos no permiten confirmar todos los cruces, sentidos o tarifas; la aplicación identifica esa limitación en la cotización.

- barranquilla → CAMPO DE LA CRUZ: Peaje Ponedera.
- barranquilla → PONEDERA: Peaje Ponedera.
- barranquilla → SUAN: Peaje Ponedera.
- bucaramanga → SAN ALBERTO: Peaje Rioblanco - El Playón, LA PAZ, Peaje La Paz.
- bucaramanga → CÁCHIRA: Peaje Rioblanco - El Playón.
- bucaramanga → LA ESPERANZA: Peaje Rioblanco - El Playón, LA PAZ, Peaje La Paz.
- bucaramanga → LOS SANTOS: Peaje Mesa de los Santos.
- cali → PIENDAMÓ - TUNÍA: Peaje Tunia.
- medellin → GRANADA: Cocorná.
- medellin → LA PINTADA: LA PINTADA.
- medellin → SAN CARLOS: Cocorná.
- pereira → ARANZAZU: LA ESTRELLA.
- pereira → FILADELFIA: LA ESTRELLA.
- pereira → NEIRA: LA ESTRELLA.
- pereira → CAJAMARCA: Peaje Túnel de la Línea - Quindío, Caseta OSM 13620649544, Peaje Túnel de la Línea Tolíma.
