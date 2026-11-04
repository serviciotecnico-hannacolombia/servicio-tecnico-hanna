# Rediseño de Gestión de mantenimientos

## Alcance
Entrada existente: /gestion-mantenimientos/*, renderizada por GestionMantenimientosPage.tsx. AparienciaGestion envuelve exclusivamente esa página, incluidos los modales existentes y la presentación de gráficos.

No se modificaron rutas compartidas, Sidebar, autenticación, permisos, fuentes de datos, almacenamiento ni cálculos. Se verificaron las huellas SHA-256 de los 415 archivos externos al módulo: sin cambios ni archivos nuevos fuera de su carpeta. La rama ya tenía cambios anteriores en algunos de esos archivos; se conservaron.

GuardarSolicitud e IdentificarConsulta, utilizados por los cotizadores, conservan sus importaciones y estilos. gestion.css tampoco se modificó en esta iteración.

## Archivos y mejoras
- AparienciaGestion.tsx y temaGestion.ts: selector Claro/Oscuro/Sistema, seguimiento de la preferencia del dispositivo, sincronización entre pestañas y recuperación si localStorage está bloqueado.
- Preferencia local independiente: hanna-gestion-mantenimientos:apariencia:v1. No modifica el tema global ni añade estilos a body o html.
- aparienciaGestion.css: reglas encapsuladas bajo .gm-workspace; superficies, contraste, formularios, tablas, estados, gráficos, modales, diseño adaptable y movimiento reducido.
- uiGestion.tsx: variantes locales de Header y Card; adaptación del botón compartido para enlaces legibles en oscuro. Conserva propiedades y acciones.
- toastGestion.ts: sólo las notificaciones originadas dentro de Gestión reciben los colores locales resueltos. El Toaster global no cambia.
- GestionMantenimientosPage.tsx e IndiceGestion.tsx: cabecera de operaciones y accesos por tareas. Los indicadores siguen siendo opcionales. HANNA / OTS sigue identificado como módulo pendiente.
- GraficoIntervenciones.tsx, AnalisisCostosSolicitudes.tsx, BuzonInSitu.tsx y ReporteInSitu.tsx: contraste de gráficos, tooltips y estados adaptado al tema, sin cambiar cifras ni filtros.
- OportunidadesInSitu.tsx, NuevaOportunidadInSitu.tsx, EstadisticasIntervenciones.tsx, PerfilesAccesosInSitu.tsx, ReporteConsultas.tsx, ResolverCodigoEstadisticas.tsx y PanelPresentacion.tsx: utilizan las variantes visuales locales en lugar de modificar componentes compartidos.
- temaGestion.test.mjs: pruebas de tema, aislamiento y contraste.

## Verificación
- 63 pruebas de Node aprobadas: cálculos, programación, oportunidades, permisos, rutas, almacenamiento, vistas guardadas y cinco pruebas nuevas de tema.
- Persistencia independiente, modo Sistema, almacenamiento bloqueado y render de controles comprobados por pruebas.
- Contraste AA de textos, enlaces y botones comprobado en ambas paletas; todos los selectores nuevos están encapsulados.
- ESLint del módulo y compilación de producción aprobados. Permanece el aviso anterior de tamaño del bundle.
- Revisión visual en navegador con una página temporal de componentes reales, sin sesión ni escritura de registros. Para el gráfico se utilizó un agregado de los 314 registros del archivo 2025 existente. La página y el agregado temporal se eliminaron al terminar.
- Revisados: entrada por tareas en claro y oscuro, persistencia de oscuro al recargar, dona, tabla, selección de categoría, presentación y salida por Escape.
- Aislamiento observado: Gestión en oscuro con fondo rgb(16,25,35); el elemento exterior conservó fondo blanco y texto rgb(10,15,26).

## Límites pendientes
La aplicación estaba en login y no se dispuso de una sesión autenticada para recorrer las acciones con permisos reales. No se sustituyó la autenticación.

El navegador perdió la conexión con localhost (ERR_NETWORK_CHANGED) durante la revisión del formulario y bloqueó su página de error. Quedan pendientes el recorrido completo autenticado, la revisión visual móvil, el formulario completo y la lectura final de la consola. No se afirma que esas comprobaciones estén completas.

No requiere migraciones SQL, dependencias nuevas ni cambios de configuración general.

## Segunda iteración: composición de estadísticas
Se reorganizó el visor de gráficos con botones de presentación, una zona gráfica principal y una columna lateral de lectura (total, porcentaje representado y tres categorías con más registros). Los accesos de esa columna utilizan los mismos eventos de consulta de registros existentes. La tabla conserva todas las categorías y sus porcentajes originales.

EstadisticasIntervenciones ahora presenta filtros plegables con contador de filtros activos y una franja de resumen compacta. Los indicadores por mes y año comienzan en columnas; siguen disponibles las otras cinco presentaciones. El índice de indicadores tiene accesos en cuadrícula. Los cambios se limitan a GraficoIntervenciones.tsx, EstadisticasIntervenciones.tsx, IndiceGestion.tsx y analiticaGestion.css, además de esta documentación y la prueba de aislamiento CSS.

Compilación y ESLint aprobados; pruebas de agrupación, porcentajes, rutas y tema aprobadas. Esta iteración no tiene un recorrido visual autenticado: no había una sesión disponible en el navegador de pruebas.

## Apariencia personalizable (selector actual)
Se retiró Sistema y el grupo de botones. El botón desplegable Apariencia contiene dos selectores: Modo (Claro/Oscuro) y Paleta de color (Azul HANNA, Cian, Celeste, Rosa y Lavanda). La paleta coordina superficies, bordes, enlaces y botones, con matices y degradados suaves en el fondo y la cabecera. Los colores semánticos de estados se conservan.

La misma clave local almacena ahora modo y paleta como JSON. Las preferencias antiguas Claro/Oscuro se conservan; Sistema pasa a Claro. No se sigue ni se cambia el tema del dispositivo. El panel se cierra con Escape o al pulsar fuera; las preferencias se sincronizan entre pestañas. paletasGestion.css sólo utiliza selectores encapsulados del módulo.

Las cinco pruebas actualizadas cubren persistencia de las diez combinaciones, migración de preferencias antiguas, valores inválidos, aislamiento, render del desplegable y contraste AA de textos, enlaces y botones. No se confirmó la vista autenticada en el navegador: la herramienta de inspección agotó su tiempo de espera.

### Ampliación de paletas
Se añadieron Menta, Durazno, Ámbar y Coral, para un total de nueve paletas. Cian turquesa adopta matices verdes y Celeste matices azules para diferenciarlos. Cada paleta incluye superficies claras y oscuras y una muestra con degradado; los estados mantienen sus colores semánticos. Las pruebas de persistencia, render, aislamiento y contraste AA cubren las 18 combinaciones de modo y paleta.


### Navegación por tareas sin accesos duplicados
Se retiró la barra de accesos directos que repetía las tarjetas de entrada. Un único botón Regresar lleva al nivel superior dentro de Gestión: los apartados principales vuelven a In situ y los indicadores a su selección anterior. Solicitudes y oportunidades conservan su acceso al análisis, pero utilizan el regreso común para volver al listado. Las rutas de destino existentes, los permisos y las acciones de los registros se conservan. La navegación al nivel superior se verifica también para enlaces directos y recargas.
