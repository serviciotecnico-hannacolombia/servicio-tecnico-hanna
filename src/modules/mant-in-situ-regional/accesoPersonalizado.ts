// Permiso del rol: no depende de usuario, nombre, correo ni acceso a Administración.
export function puedeUsarPersonalizado(activo: boolean, accesoRegional: boolean, permisoPersonalizado: boolean) {
  return activo && accesoRegional && permisoPersonalizado
}
