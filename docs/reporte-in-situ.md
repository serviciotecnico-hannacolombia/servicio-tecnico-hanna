# Reporte in situ

Ubicación: Gestión de mantenimientos → Reportes → Reporte de visitas in situ. Usa los permisos existentes de Gestión; las funciones y políticas SQL verifican `gestion_mantenimientos_permitido()`.

## Revisión en localhost

En desarrollo se guarda por usuario en el navegador, separado de solicitudes y consultas. Para la revisión de 2025, la base privada se prepara en `.cache/reporte-in-situ-preview/base-2025.json` (excluida de Git). Un middleware exclusivo de Vite en desarrollo la ofrece para precargarla una sola vez por usuario al abrir el reporte, conservando registros y reclasificaciones existentes. No se incluye el Excel ni su contenido en el código o en la compilación de producción. Si el archivo local no existe, se puede importar desde la interfaz.

En Carga de históricos, selecciona el Excel, revisa los años, errores, nuevos registros y posibles duplicados; después confirma. Se reconocen las dos estructuras del archivo de 2025, con o sin NIT/asesor y departamento. Las filas sin referencia se omiten. Las fechas provienen de FECHA, no del nombre de la hoja. Los intervalos no numéricos se conservan en observaciones, sin calcular vencimiento. Se ignoran los resultados antiguos de fórmulas de próximo servicio.

Cada registro ingresa como preventivo y se puede reclasificar conservando su auditoría. La próxima fecha sólo se muestra para preventivos con periodicidad válida. El historial agrupa referencia y serial; los seriales ausentes o marcadores no se agrupan. La identidad para detectar duplicados compara fecha, referencia, serial, cliente, ciudad, informe y documento; excluye tipo y hoja. Revisa que las intervenciones repetidas tengan sus números de informe/documento correctos.

El CSV exporta los resultados filtrados; no reemplaza un respaldo completo de auditoría.

## Producción

Revisar y ejecutar `docs/sql/instalar-reporte-in-situ.sql` después del SQL de Gestión de mantenimientos y antes de publicar el código. Crea una tabla independiente y dos funciones para importar y reclasificar. No modifica tablas de solicitudes o consultas. La auditoría usa el usuario autenticado del servidor; las escrituras directas quedan revocadas. La importación de cada archivo es atómica. La reclasificación usa revisión para evitar sobrescribir cambios concurrentes.

Después de desplegar, un usuario autorizado debe importar el Excel y confirmar los registros. El guardado local no se sincroniza automáticamente con Supabase. No se ha ejecutado SQL en la base remota.

## Verificación

- `node --test src/modules/gestion-mantenimientos/intervenciones.test.mjs`
- `npm run build`
- SQL local: instalar `@electric-sql/pglite` en `.cache/gestion-sql-check` y ejecutar `node docs/sql/reporte-in-situ.test.mjs`.

Para verificar el archivo privado sin agregarlo al repositorio, definir `REPORTE_EXCEL_PRUEBA` con su ruta al ejecutar las pruebas. La prueba espera los 314 registros del archivo original de 2025.

## Programación, buzón y perfiles

La vista principal es una tabla compacta con filtros por fecha de intervención o próximo servicio, año, hoja/zona, departamento, ciudad, referencia y serial. El selector de meses filtra próximos servicios. Todas las columnas siguen disponibles en una vista alternativa. El semáforo considera el último preventivo por referencia y serial identificable; los anteriores son historial. Los seriales desconocidos no se agrupan.

Gestión incluye un buzón para los destinatarios configurados. Los valores iniciales son 90, 30 y 7 días, además de vencidos. El estado de lectura usa intervención + próxima fecha + prioridad: al cambiar de prioridad aparece un aviso nuevo, sin repetirlo diariamente. Los avisos se calculan al abrir Gestión. No hay envío de correo ni proceso de notificación en segundo plano instalado.

Instalar `docs/sql/instalar-alertas-in-situ.sql` después del SQL del reporte. Identifica una sola vez el perfil activo de Andrés Latorre y fija su UUID como propietario. Si no existe exactamente una coincidencia, la instalación se detiene para verificar el perfil. La cuenta propietaria se fija por UUID, de modo que otro usuario no adquiere sus facultades al cambiar de nombre. La migración final permite delegación explícita y configuración de semáforo mediante sus casillas correspondientes. Los destinatarios iniciales son los perfiles activos de Andrés Latorre, Brayan Galeano y Juan Camilo Peñuela; revisar su resolución en la sección Perfiles y accesos.

En localhost la configuración y lecturas se guardan en el navegador. La administración se identifica por el nombre del perfil únicamente para esa vista previa. En producción se exige el UUID fijo. Los controles individuales se amplían con la migración final de permisos de visitas; los otros módulos conservan sus permisos generales de rol.

## Permisos individuales de visitas

Instalar al final `docs/sql/instalar-permisos-visitas-in-situ.sql`, después de las tablas del reporte y de alertas. Desde Perfiles y accesos el propietario configura lectura, registro individual, edición/reclasificación, importación, exportación CSV y buzón. Acceso completo concede esas seis acciones, sin delegar administración. Los demás módulos conservan sus permisos de rol.

La lectura es requisito para todas las acciones. Los destinatarios iniciales obtienen lectura y buzón; el propietario tiene siempre acceso completo. La configuración permite retirar también la lectura: la política RLS oculta los registros y las funciones rechazan las operaciones. Cada cambio de permisos se audita con administrador, usuario, antes, después y fecha. Las cuentas inactivas no tienen acceso aunque existan permisos.

La edición de una intervención conserva su identificador, autor original y auditoría. Registra valores anteriores y nuevos y comprueba la revisión para evitar sobrescribir cambios de otra persona. Los formularios y acciones se muestran según los permisos; los perfiles asignados pueden entrar a Gestión desde la barra lateral sin recibir permisos de cotizaciones o consultas.

En la vista local se simulan los permisos en este navegador, con actualización de permisos cada 30 segundos. En producción se verifican en cada operación SQL. El propietario se autoriza mediante su UUID fijo. Ninguna migración se ha ejecutado en Supabase.

Pruebas adicionales: `node --test src/modules/gestion-mantenimientos/permisosInSitu.test.mjs` y `node docs/sql/permisos-visitas-in-situ.test.mjs` (PostgreSQL local con PGlite).

## Hoja de vida y periodicidad acordada

365 días es sólo el valor inicial al registrar un preventivo. El cliente define la periodicidad; se modifica en el formulario y cada intervención conserva su propio intervalo. La ficha muestra por separado la programación vigente del equipo y todas sus intervenciones históricas.

Registrar nuevo servicio desde la ficha conserva referencia, serial y datos del equipo y propone el intervalo del último preventivo, sin copiar factura, informe, observaciones ni auditoría de la visita anterior. Se puede cambiar el intervalo antes de guardar.

Un preventivo posterior sustituye la programación del anterior. Un equipo atendido en 2024 y de nuevo en 2026 no genera un pendiente artificial de 2025: el próximo vencimiento se calcula desde el preventivo de 2026 con su periodicidad. Los intervalos viejos permanecen en el historial y en las columnas del Excel, sin entrar a la programación vigente ni al buzón. Correctivos e informes de atención no sustituyen por sí solos un preventivo.

## Recomendaciones por serial

En registro individual, el campo de número de serie busca coincidencias mientras se escribe. Presenta hasta ocho equipos distintos, agrupados por referencia y serial, con los datos de la intervención más reciente. Los marcadores sin serial identificable no se recomiendan. Si el serial coincide con varias referencias, se muestran separadas para elegir explícitamente.

Al usar una recomendación se completan referencia, serial, cliente, contacto y ubicación y, para preventivos, se propone la periodicidad del último preventivo. Se conservan el identificador, fecha, tipo, documento, informe y observaciones del nuevo borrador. Cada servicio queda como una intervención nueva vinculada por referencia y serial a la misma hoja de vida. El formulario de edición no muestra sugerencias para evitar reasociar una intervención por accidente.

## Estadísticas de intervenciones

Gestión → Reportes → Estadísticas de intervenciones. Usa el permiso de lectura del reporte de visitas. Los filtros de año se aplican a la fecha real de la intervención, con tipo, zona, departamento, ciudad y búsqueda por referencia, serial, cliente o código.

Las barras cuentan intervenciones históricas, no próximos vencimientos. Se muestran referencias, códigos de mantenimiento in situ, tipos, ciudades, años y meses. El total de equipos identificados es distinto del total de intervenciones. Los registros sin serial identificable no se cuentan como equipos únicos.

El código de servicio se obtiene comparando `referencia` con `codigos_inet.codigo`, usando `codigo_mantenimiento_insitu` como código asignado en Mantenimiento in situ. Se usa la asignación actual del catálogo, no un código facturado histórico que no está en el Excel. Las referencias con el mismo código se suman y las no relacionadas aparecen como Sin código asociado. Si el catálogo no se puede consultar, los otros gráficos siguen disponibles.

Se puede seleccionar cada barra o una fila de la tabla accesible para consultar las intervenciones que la componen. La vista limita las categorías del gráfico a 12, 20 o 40, indicando los totales representados; la tabla de datos conserva todas las categorías. El detalle muestra hasta 100 intervenciones y su total.

## Gráficos por tipo, corrección de códigos y oportunidades

Las estadísticas se separan en preventivos, correctivos e informes de atención. Sólo los preventivos usan el código de Mantenimiento in situ y su periodicidad. Correctivos muestran clientes y recurrencia de equipos; atención muestra motivos: revisión de funcionamiento, orientación al cliente u otra atención. Los registros antiguos sin motivo permanecen sin clasificar, hasta que se editen.

Cada gráfico tiene selector independiente de barras horizontales, columnas o líneas. La tabla de datos mantiene acceso a los registros para todas las presentaciones.

Desde el detalle se puede Resolver código: corregir la referencia de esta intervención usando una referencia del catálogo, o asignar un código a la referencia del catálogo. Corregir el registro usa el permiso editar de visitas; cambiar la asignación compartida requiere además módulo mant_in_situ y capacidad mant_in_situ_editar, verificados por la RPC existente. En desarrollo la asignación se simula para estadísticas en el navegador; no se modifica el catálogo real. En producción se reutiliza mant_in_situ_asignar_codigo. Una referencia inexistente debe corregirse a su referencia real o darse de alta en el módulo correspondiente; no se crean referencias ficticias.

Desde la ficha de cualquier intervención o el detalle de un gráfico se crea una oportunidad comercial. La cotización se hace en la intranet principal de HANNA: aquí se registra su número, asesor responsable, necesidad detectada, valor opcional y seguimiento. Estados: pendiente de cotización, cotizada, en seguimiento, ganada o perdida. Cotizada, seguimiento y ganada requieren número de cotización; los cierres requieren resultado o motivo. Cada cambio se audita y usa revisión para evitar sobrescrituras.

Gestión incluye Seguimiento comercial. Las oportunidades se vinculan al identificador de la intervención y conservan cliente, referencia, serial y tipo de origen de la creación. Pueden surgir de cualquiera de los tres tipos de servicio. Las estadísticas incorporan sus estados y cierres según las intervenciones filtradas.

Instalar al final `docs/sql/instalar-oportunidades-in-situ.sql`, después del SQL de permisos. Agrega el motivo de atención y su persistencia, y una tabla comercial independiente con RLS y funciones de creación/seguimiento. Usa los permisos existentes: ver para consulta, registrar para crear y editar para seguimiento. No crea ni envía cotizaciones a sistemas externos. No se ha ejecutado en Supabase.

Verificación SQL local: `node docs/sql/oportunidades-in-situ.test.mjs`. La instalación completa y el flujo se prueban con PGlite sin conexión a la base remota.

## Presentación de gráficos

Las paletas diferencian preventivos, correctivos, atención y comercial. Los colores de categorías son estables por nombre. Ganada usa verde y Perdida rojo en el seguimiento comercial. Cada gráfico permite cantidad o porcentaje del total de sus datos filtrados, con etiquetas, leyenda interactiva y detalle en tooltip. Los porcentajes no se recalculan sobre las primeras categorías cuando el gráfico tiene un límite: la cobertura muestra qué parte del total queda visible. En gráficos densos de columnas/líneas se omiten etiquetas flotantes superpuestas; los valores completos siguen disponibles en el tooltip y la tabla.

## Direcciones y recarga

Los apartados usan rutas propias bajo Gestión: `/solicitudes`, `/comercial`, `/perfiles-y-accesos`, `/reportes/consultas`, `/reportes/visitas/preventivo` y `/reportes/estadisticas/preventivo`. En visitas y estadísticas el último segmento puede ser preventivo, correctivo o atencion. La ruta determina la sección y tipo al recargar o navegar con Atrás/Adelante. Los enlaces se pueden copiar o abrir en otra pestaña.

La ficha del equipo usa `?equipo=<uuid>` y el seguimiento comercial `?oportunidad=<uuid>`, por lo que vuelven a abrirse después de cargar los datos al recargar. Cerrar esas fichas sólo elimina ese parámetro, conservando la ruta. Las solicitudes conservan su parámetro `solicitud` existente.

Si se requiere iniciar sesión, se conserva el destino de Gestión y se valida antes de volver: no se aceptan URLs externas ni apartados inexistentes. Se mantienen los permisos de cada vista. La configuración de Cloudflare ya sirve rutas desconocidas como SPA, por lo que admite la recarga de rutas internas.

## Buzón organizado para históricos de varios años

El acceso compacto muestra un icono de buzón y contador; los avisos sólo se abren al pulsarlo, en una ventana separada. Se muestran 8 por página inicialmente, con opciones de 15 o 25. Se puede buscar por cliente, equipo, serial o ubicación, alternar sin leer/leídos/todos, filtrar por año del servicio previsto, prioridad, departamento o ciudad y agrupar por prioridad, cliente, ciudad o año. El orden se aplica dentro del grupo seleccionado.

Se distinguen los años de intervención realmente cargados de los años previstos para servicio. Los avisos se recalculan con todo el historial disponible, sin considerar una programación antigua vigente cuando existe un preventivo posterior. El mensaje del buzón explica que aún pueden incorporarse otros servicios históricos y que éstos actualizan el próximo vencimiento.

Marcar esta página como leída sólo afecta a sus avisos visibles (máximo 25); cada aviso también puede volver a sin leer. Leer no confirma la ejecución del mantenimiento. Las lecturas compartidas se paginan para conservar más de 1000 avisos con varios años de historial.

Aplicar `docs/sql/actualizar-buzon-in-situ.sql` después del SQL de permisos para habilitar volver a sin leer en producción. Sólo modifica las lecturas del usuario autenticado con acceso al buzón. En localhost funciona con el guardado del navegador; el SQL no se ha ejecutado en Supabase.

## Entrada directa y configuración por función

La cabecera de Gestión ofrece el buzón compacto y una llave de configuración a la derecha. La navegación tiene accesos directos a Solicitudes, Visitas y equipos, Estadísticas, Consultas y Oportunidades, sin pasar por una segunda fila de reportes. El tipo de servicio queda en un selector compacto junto al título. Las rutas anteriores siguen funcionando y conservan el apartado al recargar.

La llave abre Perfiles y accesos. Las casillas se agrupan por funciones: visitas (lectura, creación, edición, importación, exportación y asignación de códigos), solicitudes (lectura, creación, seguimiento y exportación), consultas (lectura y exportación), estadísticas, comercial (lectura, creación de oportunidades y seguimiento), buzón, semáforo y administración de accesos.

Acceso completo concede las funciones operativas. Dar o quitar accesos de Gestión se marca por separado y sólo lo puede conceder o retirar la cuenta propietaria, ligada al UUID ya instalado de Andrés Latorre. Un administrador delegado puede gestionar otros perfiles ordinarios, pero no su propio perfil, la cuenta propietaria ni otros administradores delegados. Los cambios se auditan. La delegación puede darse sin habilitar lectura de equipos.

Aplicar al final `docs/sql/actualizar-funciones-y-accesos-gestion.sql`, después de las migraciones de oportunidades y buzón y con las tablas anteriores de solicitudes y consultas instaladas. Migra las casillas previas conservando su alcance original y la compatibilidad de los permisos de solicitudes/consultas de perfiles aún no configurados. Después de guardar un perfil, sus casillas explícitas determinan el acceso dentro del módulo, incluso si el rol anterior lo permitía. No modifica profiles.role_id, role_modules ni role_capabilities.

Las políticas y funciones SQL aplican lectura y escritura por apartado. Asignar códigos desde Gestión tiene una función de entrada con su casilla y conserva además la validación de permisos del catálogo de Mantenimiento in situ. No se conceden permisos del catálogo ni de otros módulos por esta pantalla. El SQL está preparado y no ejecutado en Supabase.

Prueba de integración local: `node docs/sql/funciones-y-accesos-gestion.test.mjs`, que instala todas las etapas, comprueba delegación, revocación, RLS, operaciones separadas y que los roles generales permanezcan intactos.

## Control de solicitudes y pruebas
El tablero distingue solicitudes reales y de prueba. Los indicadores excluyen pruebas; el listado permite ver reales, pruebas o todas. La clasificación es reversible y auditada, requiere solicitudes_editar y revisión vigente. Aplicar `docs/sql/actualizar-solicitudes-prueba.sql` después de la migración de funciones y accesos. No se ha aplicado remotamente.

### Catálogo nacional de Personalizado
Respaldo ampliado a partir de CITY_DATABASE del cotizador original entregado por el usuario (App_Precios_HANNA_Offline_Final.html): 1122 municipios originales, combinados por código DANE con los destinos existentes. Incluye Arauca. Uso exclusivo del catálogo de ubicaciones de Gestión/Personalizado; no se modifican cobertura regional por oficina, rutas, peajes ni tarifas. No se presenta como actualización oficial del catálogo.

### Análisis presupuestado de solicitudes
Desplegable independiente con filtro por año de creación, departamento y alcance (por defecto aprobadas/programadas/realizadas). Siempre excluye pruebas. Suma el margen guardado por solicitud una vez, sin sumar eventos de historial. Días promedio = suma días / solicitudes; noche promedio = total hospedaje / noches; promedio por viaje con hotel = total hospedaje / solicitudes con hotel. Extremos se comparan por noche y enlazan el registro. Tiquetes son ida+vuelta. Datos presupuestados, no ejecución ni utilidad; sin cambios SQL adicionales. Departamentos ausentes en registros antiguos no se infieren desde texto libre.

### Solicitudes: consulta primero
La entrada abre sólo el libro de trabajo con búsqueda, filtro de estado y selección reales/pruebas. Se eliminan los contadores por estado de esta vista. El botón Ver indicadores abre `?vista=indicadores`; allí quedan resumen, gráfica y análisis de costos. Recargar conserva esta selección. Elegir un estado de la gráfica regresa al listado filtrado. Abrir/cerrar una solicitud conserva la vista de origen.

### Presentaciones de gráficos
Selector compartido: barras, columnas, líneas, pastel, dona y tabla. Pastel/dona representan el total completo, no sólo el top N; si hay más de 7 categorías se muestran 6 principales y un grupo restante. Ese grupo abre la tabla completa para elegir la categoría real. Los ceros permanecen en tabla. No se cambian estados ni filtros al cambiar la representación. Colores semánticos de los siete estados de solicitudes; tablas accesibles con cantidades y porcentajes.

### Detalles básicos y personalizados
Dentro del mismo botón de indicadores, selector de detalles básicos (estados/avance) o personalizados (costos/viajes). Modo en URL `detalle=personalizado`. Casillas para tiquetes, hospedaje, alimentación, margen, extremos y comparación por departamento. Comparación configurable por indicador y presentación (tabla/barras/columnas). Promedio tiquetes = ida+regreso / viajes aéreos del departamento; terrestres excluidos del denominador. Sin casos aplicables se muestra Sin datos. Promedios comparables, no pastel de promedios.

### Vistas guardadas y presentación
El análisis personalizado permite guardar hasta 15 vistas por usuario en localStorage del navegador (filtros, casillas, indicador y presentación; nunca registros ni permisos). Se pueden recuperar y quitar. No requiere SQL ni sincroniza entre equipos. Modo presentación en gráficos compartidos y análisis personalizado: panel expandido, configuración oculta, contexto visible, salida con botón/Escape y foco contenido/restaurado. Las gráficas de intervenciones muestran tipo, período, filtros geográficos y búsqueda vigentes.

### Historial sin desglose mensual en pantalla
Se retira la franja de doce contadores mensuales de próximos servicios y su filtro asociado. El historial conserva búsqueda, año, ubicación, equipo, serial y prioridad. El CSV sigue exportando todas las filas filtradas (no sólo la página), con fechas de intervención y próximo servicio para agrupar por mes fuera de la intranet.

## Oportunidades manuales, OS y reporte comercial
La página Oportunidades permite crear directamente una oportunidad con OS de exactamente cuatro cifras (texto, conserva ceros iniciales), número externo de oportunidad, cliente, tipo de servicio, necesidad y asesor. Referencia y serial opcionales en origen manual. Puede relacionarse al crear o después con una intervención registrada de cualquiera de los tres tipos; los datos se toman del registro en servidor, no se confía en una copia enviada por el navegador.
El seguimiento registra cotización externa, monto COP y resultado. Rechazo sin cotización = oportunidad rechazada; con cotización = cotización rechazada. Cierre exige motivo/resultado. El número de cotización ya asociado no puede vaciarse. Identificación, relación, estados, montos y motivos se conservan en historial con revisión optimista. No crea cotizaciones en la intranet principal.
Reporte opcional por año de creación, tipo, estado y búsqueda: creadas, con cotización, aprobadas, rechazos separados por etapa y montos registrados/acumulados. Cada fila se cuenta una vez, no cada evento; indicadores de cotización y estado se solapan y no deben sumarse. Aprobaciones sin monto se identifican. Manuales no vinculadas aparecen en este reporte; el gráfico de intervenciones sólo cuenta las vinculadas a sus registros filtrados.
### SQL adicional
Aplicar `docs/sql/actualizar-oportunidades-manuales.sql` después de la migración de funciones y accesos. SQL preparado y probado en PGlite, sin ejecutar en Supabase. Hace nullable la relación, agrega OS/número externo y su índice único normalizado, funciones seguras y auditoría. Registros antiguos conservan identificadores vacíos hasta completarlos al editar; no se inventan valores. Permisos existentes oportunidades_crear/oportunidades_editar/comercial.
