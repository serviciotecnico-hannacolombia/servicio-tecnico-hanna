// Dispara la notificación por correo ante un cambio de estado de una orden
// — vía la Edge Function calibraciones-notificar, que envía directamente con
// Resend (al asesor, con copia a Servicio Técnico). El contenido (lo
// registrado en el paso, resumen y próximo paso) lo arma correoEstado.ts.
// No bloquea el guardado de la orden: los errores solo quedan en consola.
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { ESTADO_LABEL } from './hooks/useCalibraciones'
import { contenidoCorreoEstado, resumenOrden } from './correoEstado'
import { fmtFecha, fechaLocalISO } from './ui'
import type { EstadoCalibracion, OrdenCalibracion, OrdenCalibracionEquipo, OrdenCalibracionNovedad, RvCalibrItem } from '../../types'

export function notificarCambioEstado(
  ordenId: string,
  estadoAnterior: string | null | undefined,
  estadoNuevo: string,
  orden: Partial<OrdenCalibracion>,
  servicios: RvCalibrItem[],
  usuario: string | null,
) {
  if (!orden.correo_asesor) return

  const label = (estado: string) => ESTADO_LABEL[estado as EstadoCalibracion] || estado
  const contenido = contenidoCorreoEstado(estadoNuevo as EstadoCalibracion, orden, servicios)

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
      ...contenido,
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

// Dispara el correo a Brayan al crear un pendiente en Logística — vía la
// Edge Function logistica-notificar-pendiente. Igual que notificarCambioEstado,
// no bloquea la creación del pendiente: los errores solo quedan en consola.
export function notificarPendienteLogistica(cliente: string, mensaje: string) {
  supabase.functions.invoke('logistica-notificar-pendiente', {
    body: { cliente, mensaje },
  }).then(async ({ error }) => {
    if (!error) return
    let motivo: unknown = error.message
    const context = (error as { context?: Response }).context
    if (context) {
      try { motivo = (await context.clone().json()).error ?? motivo } catch { /* no era JSON */ }
    }
    console.error('No se pudo notificar el pendiente de logística:', motivo)
  })
}

export type EventoNovedad = 'abierta' | 'avance' | 'resuelta'

const TITULAR_NOVEDAD: Record<EventoNovedad, string> = {
  abierta: 'Se registró una novedad en la orden',
  avance: 'Nuevo avance en la novedad',
  resuelta: 'La novedad fue resuelta',
}

function fechaHora(iso: string): string {
  const d = new Date(iso)
  return `${fmtFecha(fechaLocalISO(iso))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Correo de una novedad (apertura, avance con "Notificar al asesor" o
// resolución) — misma Edge Function que el cambio de estado, con tipo
// 'novedad'. estadoNuevo va fijo en "Novedad" para que el asunto sea siempre
// "NUMERO · CLIENTE — Novedad" y Outlook lo agrupe en un solo hilo. Lleva el
// historial completo de la novedad. No bloquea el guardado.
export function notificarNovedad(
  evento: EventoNovedad,
  novedad: OrdenCalibracionNovedad,
  orden: Partial<OrdenCalibracion>,
  equipos: OrdenCalibracionEquipo[],
  servicios: RvCalibrItem[],
  nombreUsuario: (id: string | null) => string,
  usuario: string | null,
) {
  if (!orden.correo_asesor || !orden.id) return

  const afectados = equipos.filter(e => novedad.equipos_ids.includes(e.id))
  const historialNovedad = [
    { label: `${fechaHora(novedad.created_at)} · ${nombreUsuario(novedad.abierta_por)}`, valor: `Novedad registrada: ${novedad.detalle}` },
    ...novedad.avances.map(a => ({ label: `${fechaHora(a.created_at)} · ${nombreUsuario(a.usuario_id)}`, valor: a.mensaje })),
    ...(novedad.resuelta_at ? [{ label: `${fechaHora(novedad.resuelta_at)} · ${nombreUsuario(novedad.resuelta_por)}`, valor: `Solución: ${novedad.resolucion || '—'}` }] : []),
  ]

  supabase.functions.invoke('calibraciones-notificar', {
    body: {
      tipo: 'novedad',
      ordenId: orden.id,
      cliente: orden.cliente,
      numeroOc: orden.numero_oc,
      correoAsesor: orden.correo_asesor,
      estadoNuevo: 'Novedad',
      ordenUrl: `${window.location.origin}/calibraciones/${orden.id}`,
      usuario,
      titular: TITULAR_NOVEDAD[evento],
      etapa: ESTADO_LABEL[novedad.etapa] || novedad.etapa,
      detalleNovedad: novedad.detalle,
      resuelta: !!novedad.resuelta_at,
      resolucion: novedad.resolucion,
      equipos: afectados.map(e => ({ label: e.referencia, valor: [e.serial, e.id_equipo ? `ID ${e.id_equipo}` : ''].filter(Boolean).join(' · ') })),
      historialNovedad,
      resumen: resumenOrden(orden, servicios),
    },
  }).then(async ({ error }) => {
    if (!error) return
    let motivo: unknown = error.message
    const context = (error as { context?: Response }).context
    if (context) {
      try { motivo = (await context.clone().json()).error ?? motivo } catch { /* no era JSON */ }
    }
    console.error('No se pudo notificar la novedad:', motivo)
    toast.warning('La novedad quedó guardada, pero no se pudo enviar el correo al asesor(a)')
  })
}
