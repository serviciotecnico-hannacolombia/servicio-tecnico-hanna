// Contenido del correo de cambio de estado (ver notificaciones.ts y la Edge
// Function calibraciones-notificar): qué se registró en el paso, un resumen
// fijo de la orden y el próximo paso con su fecha estimada. Se arma aquí y
// no en la función porque depende de la modalidad y de helpers del frontend
// — la función solo lo dibuja. Las filas sin valor se omiten.
import { ESTADO_LABEL, MODALIDAD_LABEL, sumarDias } from './hooks/useCalibraciones'
import { fmtFecha } from './ui'
import { linkOtst, parseOtstCodes } from './vistas/CamposCompartidos'
import type { EstadoCalibracion, OrdenCalibracion, RvCalibrItem } from '../../types'

export interface FilaCorreo { label: string, valor: string, url?: string }

export interface ContenidoCorreoEstado {
  titular: string
  detalles: FilaCorreo[]
  proximoPaso: string | null
  resumen: FilaCorreo[]
}

type Orden = Partial<OrdenCalibracion>

function texto(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function fecha(v: string | null | undefined): string {
  return v ? fmtFecha(v.slice(0, 10)) : ''
}

function filas(...items: [string, string][]): FilaCorreo[] {
  return items.filter(([, valor]) => valor).map(([label, valor]) => ({ label, valor }))
}

function resumenOrden(o: Orden, servicios: RvCalibrItem[]): FilaCorreo[] {
  const resumen = filas(
    ['N° OC', texto(o.numero_oc)],
    ['Cliente', texto(o.cliente)],
    ['Modalidad', o.modalidad ? MODALIDAD_LABEL[o.modalidad] : ''],
    ['Proveedor (laboratorio)', texto(o.proveedor)],
  )
  // Una fila por OTST para que cada código lleve su propio enlace.
  for (const codigo of parseOtstCodes(o.otst)) {
    resumen.push({ label: 'OTST', valor: codigo, url: linkOtst(codigo) ?? undefined })
  }
  resumen.push(...filas(
    ['RMV/FV', texto(o.rmv_fv)],
    ['Cantidad de equipos', texto(o.cantidad_equipos)],
    ['Servicios', servicios.map(s => `${s.codigo} — ${s.magnitud}`).join(', ')],
  ))
  return resumen
}

export function contenidoCorreoEstado(estadoNuevo: EstadoCalibracion, o: Orden, servicios: RvCalibrItem[]): ContenidoCorreoEstado {
  const esLaboratorio = o.modalidad === 'laboratorio_externo'
  const resumen = resumenOrden(o, servicios)
  const base = (titular: string, detalles: FilaCorreo[], proximoPaso: string | null): ContenidoCorreoEstado =>
    ({ titular, detalles, proximoPaso, resumen })

  switch (estadoNuevo) {
    case 'en_mantenimiento_reparacion':
      return base('El equipo entró a mantenimiento y reparación', filas(
        ['Salida estimada de mantenimiento', fecha(o.fecha_salida_mantenimiento)],
      ), o.fecha_salida_mantenimiento
        ? `Salida de mantenimiento estimada para el ${fecha(o.fecha_salida_mantenimiento)}.`
        : 'Salida de mantenimiento por definir.')

    case 'para_enviar':
      return base('El equipo está listo para enviar al laboratorio', filas(
        ['Salida de mantenimiento', fecha(o.fecha_salida_mantenimiento_real)],
        ['Nota de mantenimiento', texto(o.nota_mantenimiento)],
        ['Fecha programada de envío', fecha(o.fecha_programada_envio)],
      ), o.fecha_programada_envio
        ? `Envío al laboratorio programado para el ${fecha(o.fecha_programada_envio)}.`
        : 'Envío al laboratorio por programar.')

    case 'en_programacion_visita':
    case 'visita_programada':
      return base(estadoNuevo === 'visita_programada' ? 'La visita del metrólogo está programada' : 'La visita del metrólogo está en programación', filas(
        ['Fecha estimada de la visita', fecha(o.fecha_programada_envio)],
        ['Salida de mantenimiento', fecha(o.fecha_salida_mantenimiento_real)],
        ['Nota de mantenimiento', texto(o.nota_mantenimiento)],
      ), o.fecha_programada_envio
        ? `Visita del metrólogo(a) el ${fecha(o.fecha_programada_envio)}.`
        : 'Fecha de la visita por confirmar.')

    case 'enviado':
      return base('El equipo fue enviado al laboratorio', filas(
        ['Fecha de envío', fecha(o.fecha_envio)],
        ['Laboratorio', texto(o.proveedor)],
        ['Nota de envío', texto(o.nota_envio)],
      ), 'Llegada al laboratorio en máximo 3 días hábiles.')

    case 'en_calibracion':
      if (esLaboratorio) {
        return base('El laboratorio recibió el equipo', filas(
          ['Código de recepción', texto(o.codigo_recepcion)],
          ['Códigos de certificados', texto(o.codigos_certificados)],
          ['Inicio de calibración', fecha(o.certificado_fecha_inicio)],
          ['Fin estimado de calibración', fecha(o.certificado_fecha_fin)],
        ), o.certificado_fecha_fin
          ? `Fin de calibración estimado para el ${fecha(o.certificado_fecha_fin)}; después el equipo regresa a Hanna.`
          : 'Calibración en curso en el laboratorio.')
      }
      return base('La calibración en sitio comenzó', filas(
        ['Llegada del metrólogo(a)', fecha(o.fecha_llegada_metrologo)],
      ), 'Al terminar la calibración, pasa a control de calidad.')

    case 'en_retorno':
      return base('El equipo viene de regreso a Hanna', filas(
        ['Fecha de retorno', fecha(o.fecha_retorno)],
        ['Nota de retorno', texto(o.nota_retorno)],
        ['Códigos de certificados', texto(o.codigos_certificados)],
      ), 'Llegada a Hanna en máximo 3 días hábiles.')

    case 'control_calidad':
      if (esLaboratorio) {
        return base('El equipo llegó a Hanna', filas(
          ['Fecha de llegada', fecha(o.fecha_llegada_hanna)],
          ['Carta de entrega', texto(o.carta_entrega)],
        ), 'Revisión de control de calidad en 1 día hábil.')
      }
      return base('La calibración en sitio terminó', filas(
        ['Fin de calibración', fecha(o.certificado_fecha_fin)],
        ['Metrólogo(a)', texto(o.nombre_metrologo)],
        ['Códigos de referencia', texto(o.codigos_referencia)],
      ), o.certificado_fecha_fin
        ? `Certificados estimados para el ${fecha(sumarDias(o.certificado_fecha_fin, 10))} (guía, +10 días).`
        : 'Revisión de control de calidad.')

    case 'carga_al_sistema':
      return base('El control de calidad fue aprobado', filas(
        ['Fecha de control de calidad', fecha(o.fecha_control_calidad)],
        ['Notas de control de calidad', texto(o.notas_control_calidad)],
      ), 'Carga de la calibración y los certificados al sistema.')

    case 'envio_certificados':
      return base('Los certificados están listos para enviar', esLaboratorio
        ? filas(
          ['Fecha de control de calidad', fecha(o.fecha_control_calidad)],
          ['Notas de control de calidad', texto(o.notas_control_calidad)],
          ['Códigos de certificados', texto(o.codigos_certificados)],
        )
        : filas(
          ['Código de recepción', texto(o.codigo_recepcion)],
          ['Inicio de calibración', fecha(o.certificado_fecha_inicio)],
          ['Finalización estimada', fecha(o.certificado_fecha_fin)],
          ['Códigos de certificados', texto(o.codigos_certificados)],
        ), 'Envío de los certificados al cliente.')

    case 'terminado':
      return base('Los certificados fueron entregados ✓', filas(
        ['Fecha de entrega del certificado', fecha(o.fecha_entrega_certificado)],
        ['Carta del certificado', texto(o.carta_certificado)],
        ['Códigos de certificados', texto(o.codigos_certificados)],
      ), null)

    default:
      return base(`La orden pasó a ${ESTADO_LABEL[estadoNuevo] || estadoNuevo}`, [], null)
  }
}
