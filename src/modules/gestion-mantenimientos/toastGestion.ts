import {toast as notificar} from 'sonner'

// Sonner renders outside the module. Give only these notifications resolved colors.
function estilo() {
  const contenedor = document.querySelector('.gm-workspace')
  if (!contenedor) return {}
  const css = getComputedStyle(contenedor)
  return {background:css.getPropertyValue('--surface').trim(), color:css.getPropertyValue('--text').trim(), borderColor:css.getPropertyValue('--border').trim()}
}
export const toast = {
  success: (...[mensaje, opciones]: Parameters<typeof notificar.success>) => notificar.success(mensaje, {...opciones, style:{...estilo(), ...opciones?.style}}),
  error: (...[mensaje, opciones]: Parameters<typeof notificar.error>) => notificar.error(mensaje, {...opciones, style:{...estilo(), ...opciones?.style}}),
}
