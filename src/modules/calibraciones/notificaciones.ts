// Dispara la notificación por correo ante un cambio de estado de una orden
// — vía la Edge Function calibraciones-notificar, que envía directamente con
// Resend (al asesor, con copia a Servicio Técnico). No bloquea el guardado
// de la orden: los errores solo quedan en consola.
import { supabase } from '../../lib/supabase'
import { ESTADO_LABEL } from './hooks/useCalibraciones'
import type { EstadoCalibracion, OrdenCalibracion } from '../../types'

export function notificarCambioEstado(
  ordenId: string,
  estadoAnterior: string | null | undefined,
  estadoNuevo: string,
  orden: Pick<OrdenCalibracion, 'cliente' | 'numero_oc' | 'correo_asesor'>,
  usuario: string | null,
) {
  if (!orden.correo_asesor) return

  const label = (estado: string) => ESTADO_LABEL[estado as EstadoCalibracion] || estado

  supabase.functions.invoke('calibraciones-notificar', {
    body: {
      ordenId,
      cliente: orden.cliente,
      numeroOc: orden.numero_oc,
      correoAsesor: orden.correo_asesor,
      estadoAnterior: estadoAnterior ? label(estadoAnterior) : null,
      estadoNuevo: label(estadoNuevo),
      ordenUrl: `${window.location.origin}/calibraciones/${ordenId}`,
      usuario,
    },
  }).then(async ({ error }) => {
    if (!error) return
    // FunctionsHttpError trae el Response crudo en .context — el body tiene
    // el { success:false, error: '<motivo real>' } que arma la función.
    let motivo: unknown = error.message
    const context = (error as { context?: Response }).context
    if (context) {
      try { motivo = (await context.clone().json()).error ?? motivo } catch { /* no era JSON */ }
    }
    console.error('No se pudo notificar el cambio de estado:', motivo)
  })
}
