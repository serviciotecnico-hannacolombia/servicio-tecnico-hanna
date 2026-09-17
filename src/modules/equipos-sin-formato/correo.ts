// Genera el mailto: que se abre al crear un registro de "Equipos Sin
// Formato" y al reenviarlo desde el estado "Recibido" — misma lógica que
// src/modules/calibraciones/correo.ts: no hay envío real desde el
// servidor, solo se arma la URL mailto y se abre el cliente de correo.
import type { EquipoSinFormato } from '../../types'

export const CC_SERVICIO_TECNICO = 'serviciotecnico@hannacolombia.com'

interface ItemMailto {
  referencia: string
  serial: string
  observaciones: string
}

export function generarMailtoSinFormato(
  sf: Pick<EquipoSinFormato, 'id' | 'numero' | 'razon_social'>,
  items: ItemMailto[],
  asesorCorreo: string,
): string {
  const subject = `[Sin Formato] SF-${sf.numero} - ${sf.razon_social}`
  const enlace = `${window.location.origin}/equipos-sin-formato/${sf.id}`

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
    `Puedes consultar y hacer seguimiento a este registro aquí: ${enlace}`,
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
