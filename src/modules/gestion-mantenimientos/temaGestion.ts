export type PreferenciaTemaGestion = 'claro' | 'oscuro'
export const PALETAS_GESTION = {hanna:'Azul HANNA', cian:'Cian turquesa', celeste:'Celeste', rosa:'Rosa', lavanda:'Lavanda', menta:'Menta', durazno:'Durazno', ambar:'Ámbar', coral:'Coral'} as const
export type PaletaGestion = keyof typeof PALETAS_GESTION
export interface AparienciaGuardadaGestion {modo: PreferenciaTemaGestion; paleta: PaletaGestion}
export const CLAVE_TEMA_GESTION = 'hanna-gestion-mantenimientos:apariencia:v1'

export function validarTemaGestion(valor: unknown): PreferenciaTemaGestion {
  return valor === 'oscuro' ? 'oscuro' : 'claro'
}
export function validarAparienciaGestion(valor: unknown): AparienciaGuardadaGestion {
  if (valor && typeof valor === 'object') {
    const datos = valor as Record<string, unknown>
    return {modo:validarTemaGestion(datos.modo), paleta:typeof datos.paleta === 'string' && Object.hasOwn(PALETAS_GESTION, datos.paleta) ? datos.paleta as PaletaGestion : 'hanna'}
  }
  // Preserve explicit preferences saved by the previous selector. System becomes light.
  return {modo:validarTemaGestion(valor), paleta:'hanna'}
}
export function interpretarTemaGestion(valor: string | null): AparienciaGuardadaGestion {
  try { return validarAparienciaGestion(JSON.parse(valor ?? 'null')) }
  catch { return validarAparienciaGestion(valor) }
}
export function leerTemaGestion(almacen: Pick<Storage, 'getItem'>): AparienciaGuardadaGestion {
  try { return interpretarTemaGestion(almacen.getItem(CLAVE_TEMA_GESTION)) }
  catch { return validarAparienciaGestion(null) }
}
export function guardarTemaGestion(almacen: Pick<Storage, 'setItem'>, tema: AparienciaGuardadaGestion) {
  try { almacen.setItem(CLAVE_TEMA_GESTION, JSON.stringify(validarAparienciaGestion(tema))); return true }
  catch { return false }
}
export function colorEstadoGestion(color: string) {
  return `color-mix(in srgb, ${color} var(--gm-status-weight, 100%), var(--text))`
}
