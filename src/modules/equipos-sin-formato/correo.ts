// Genera el mailto: que se abre al crear un registro de "Equipos Sin
// Formato" y al reenviarlo desde el estado "Recibido" — misma lógica que
// src/modules/calibraciones/correo.ts: no hay envío real desde el
// servidor, solo se arma la URL mailto y se abre el cliente de correo.
import { linkOtst } from './hooks/useEquiposSinFormato'
import type { EquipoSinFormato } from '../../types'

export const CC_SERVICIO_TECNICO = 'serviciotecnico@hannacolombia.com'

// URL pública de producción — fija, en vez de window.location.origin, para
// que el link del correo sea siempre el mismo sin importar desde dónde se
// dispare (local, preview, producción).
const APP_URL = 'https://servicio.tecnico.hannacolombia.com'

interface ItemMailto {
  referencia: string
  serial: string
  observaciones: string
}

export function generarMailtoSinFormato(
  sf: Pick<EquipoSinFormato, 'numero' | 'razon_social'>,
  items: ItemMailto[],
  asesorCorreo: string,
): string {
  const subject = `[Sin Formato] SF-${sf.numero} - ${sf.razon_social}`
  // Enlace al módulo en general, no al registro puntual: el ID en la URL
  // hacía el link muy largo y feo como texto plano (el body de un mailto
  // no admite HTML, así que nunca se ve como un link clickeable real).
  const enlace = `${APP_URL}/equipos-sin-formato`

  const bloquesEquipos = items.flatMap((it, i) => [
    '',
    items.length > 1 ? `Equipo ${i + 1}:` : 'Equipo:',
    `• Referencia: ${it.referencia}${it.serial ? ` con serial ${it.serial}` : ''}`,
    ...(it.observaciones ? [`• Observaciones: ${it.observaciones}`] : []),
  ])

  const body = [
    'Cordial saludo,',
    '',
    'Por medio del presente, me permito remitir la relación del equipo o los equipos que han sido recibidos sin el respectivo formato de ingreso, con el fin de solicitar su amable gestión para la regularización de esta información.',
    '',
    `• Cliente: ${sf.razon_social}`,
    ...bloquesEquipos,
    '',
    'Agradecemos su colaboración en la revisión y en el envío del número de preingreso en respuesta a este correo, con el fin de proceder con el ingreso al sistema.',
    '',
    `Puedes hacer seguimiento a este registro (SF-${sf.numero}) en el sistema aquí: ${enlace}`,
    '',
    'Quedo atenta a cualquier información adicional que se requiera.',
    '',
    'Cordialmente,',
  ].join('\n')

  const params = [
    `cc=${encodeURIComponent(CC_SERVICIO_TECNICO)}`,
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ].join('&')

  return `mailto:${encodeURIComponent(asesorCorreo)}?${params}`
}

// Notificación de "Ingresado" — no es un mailto: se responde dentro del
// hilo de correo original (el mismo donde el asesor mandó el preingreso),
// así que el botón solo copia el cuerpo al portapapeles para pegarlo ahí.
// Puramente informativo, sin "quedo atento/a" — y con los OTST como enlaces
// reales (no solo texto plano), para que Outlook los pegue ya clickeables.
export function generarNotificacionIngresado(
  sf: Pick<EquipoSinFormato, 'razon_social'>,
  cantidadEquipos: number,
  otstCodigos: string[],
): { text: string, html: string } {
  const plural = cantidadEquipos > 1
  const sujeto = plural ? 'Los equipos' : 'El equipo'
  const verbo = plural ? 'fueron ingresados' : 'fue ingresado'
  const otstEtiqueta = otstCodigos.length > 1 ? 'las OTST' : 'la OTST'

  const otstTexto = otstCodigos.map(c => linkOtst(c)).join(', ')
  const otstHtml = otstCodigos.map(c => `<a href="${linkOtst(c)}">${c}</a>`).join(', ')

  const text = `Buen día,\n\n${sujeto} del cliente ${sf.razon_social} ${verbo} bajo ${otstEtiqueta} ${otstTexto}.`
  const html = `<p>Buen día,</p><p>${sujeto} del cliente ${sf.razon_social} ${verbo} bajo ${otstEtiqueta} ${otstHtml}.</p>`

  return { text, html }
}

// Copia al portapapeles con formato real (HTML) además del texto plano —
// así un enlace pegado en Outlook/Gmail queda clickeable, no como una URL
// suelta. Si el navegador no soporta ClipboardItem (Safari viejo, contexto
// no seguro), cae de vuelta a solo texto plano.
export async function copiarConFormato(text: string, html: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ])
      return true
    }
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
}
