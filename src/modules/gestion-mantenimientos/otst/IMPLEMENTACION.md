# OTST y facturación técnica

Implementación local dentro de Gestión de mantenimientos. No cambia autenticación, permisos globales ni rutas compartidas. Reutiliza los permisos existentes: ver para consulta, importar para cargas, editar para revisiones, estadísticas para facturación y exportar para descargas.

Los archivos suministrados se conservan en semilla.preview.json, ignorado por Git y cargado sólo en desarrollo. Producción no incluye estos datos: necesita importación manual. IndexedDB conserva por usuario los reportes, las filas originales y el historial de revisiones en ese navegador. No hay sincronización compartida ni SQL desplegado. El respaldo JSON contiene el estado local; no se implementó restauración desde ese respaldo.

El reporte general conserva 38.594 filas de origen, 17.899 OTST y 38.230 filas distintas para consulta. No se eliminan OTST anuladas ni componentes sin código. Cotizaciones compartidas se listan sin atribuir todos sus conceptos a cada equipo. La identidad de revisión usa OTST, referencia, serial y NIT. Los registros sin serial identificable sólo se acotan por cliente/referencia y no se consolidan como un único equipo.

La facturación conserva 6.095 líneas, con ocurrencias independientes para líneas iguales. Al importar de nuevo se reemplazan todas las líneas de cada documento incluido (tipo+número); se mantienen otros documentos y años. Por tanto debe importarse el reporte completo de cada documento, no extractos parciales de sus líneas. El reporte general aplica la misma regla por OTST. No se ejecutan asociaciones automáticas de facturación a equipos. NIT, cliente y fechas sirven para consulta, no para afirmar vínculos inexistentes.

La clasificación usa una lista de familias reconocidas y excepciones explícitas: 70001.01 correctivo OTST; 70001.02 in situ; 70001.03 preventivo OTST; MANTIT.03 y MANSAMPLER.03 in situ. RV CALIBR se mantiene separado porque no hay evidencia suficiente para asignar ámbito a cada calibración.

Neto = suma de FAV positivas + NCRV negativas, por fecha de documento. Tipo desconocido o signo inconsistente se conserva y se excluye con aviso. No se cambia el signo dos veces ni se exige conciliación de refacturaciones. El indicador mide facturación, no recaudo ni servicios únicos. Sin meta objetivo suministrada no se calcula un porcentaje de cumplimiento. En el reporte completo: 3.060.427.916 bruto, -331.990.840 créditos, 2.728.437.076 neto. Pruebas verifican conciliación total/segmentos, notas crédito, reimportación y límites de identidad.

Pendiente para operación compartida: persistencia y autorización en servidor. También quedan pendientes los vínculos manuales de facturas a equipos y la verificación humana de los resultados técnicos. La navegación y los reportes ya permiten consultar ambas fuentes sin inventar esos vínculos.
