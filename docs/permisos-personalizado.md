# Personalizado: acceso por rol

Aplicar docs/sql/habilitar-personalizado-servicio-tecnico.sql antes de publicar el frontend. El script es repetible y no se ha ejecutado en la base compartida. Su consulta final debe mostrar personalizado, acceso_regional y catalogo_bogota en true para Servicio Técnico. Si no devuelve filas, comprobar el nombre real del rol antes de continuar.

En Administración → Roles, seleccionar Servicio Técnico. En Mant. In Situ Regional debe estar habilitada la capacidad «Usar cotizador Personalizado (equipos y viajes)». El SQL la asigna automáticamente al rol completo, y asegura acceso al catálogo Bogotá y al módulo regional. No asigna permisos a un usuario individual ni concede edición de precios.

Después de instalar el SQL y desplegar, todos los integrantes de ese rol deben cerrar sesión y volver a entrar para cargar los permisos. Los usuarios deben tener el perfil activo y el role_id correcto; el script no cambia la pertenencia a roles de perfiles existentes.

La comprobación de Personalizado usa el permiso heredado del rol, sin consultar su nombre ni requerir acceso a Administración. Los permisos de almacenamiento y del reporte de Gestión conservan sus propias verificaciones.
