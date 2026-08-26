// Dispara la notificación a Power Automate ante un cambio de estado de una
// orden — vía la Edge Function calibraciones-notificar, que reenvía al
// webhook (guardado como secret, nunca expuesto aquí). No bloquea el guardado
// de la orden: los errores solo quedan en consola.
import { supabase } from '../../lib/supabase'
import type { OrdenCalibracion } from '../../types'

// Apagado a propósito: el flujo de Power Automate requiere OAuth de Entra ID
// (URL "Direct API") que todavía no está resuelto del lado de IT — hasta que
// eso se defina, la función y el secret quedan listos pero sin dispararse,
// para no llenar la consola de errores 401 en cada cambio de estado. Cuando
// IT confirme cómo autenticar la llamada, poner esto en `true`.
const NOTIFICACIONES_HABILITADAS = false

export function notificarCambioEstado(
  ordenId: string,
  estadoAnterior: string | null | undefined,
  estadoNuevo: string,
  orden: Pick<OrdenCalibracion, 'cliente' | 'numero_oc' | 'correo_asesor'>,
  usuario: string | null,
) {
  if (!NOTIFICACIONES_HABILITADAS) return
  if (!orden.correo_asesor) return

  supabase.functions.invoke('calibraciones-notificar', {
    body: {
      ordenId,
      cliente: orden.cliente,
      numeroOc: orden.numero_oc,
      correoAsesor: orden.correo_asesor,
      estadoAnterior: estadoAnterior || null,
      estadoNuevo,
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
    console.error('No se pudo notificar el cambio de estado a Power Automate:', motivo)
  })
}
