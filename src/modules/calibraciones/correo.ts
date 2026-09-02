// Genera los mailto: para los dos correos que se disparan dentro del flujo
// de calibraciones — misma lógica que el módulo de Correos
// (src/modules/formatos/correos): no hay envío real desde el servidor, solo
// se arma la URL mailto y se abre el cliente de correo del usuario.
import { MODALIDAD_LABEL } from './hooks/useCalibraciones'
import { parseOtstCodes } from './vistas/CamposCompartidos'
import { fmtFecha } from './ui'
import type { CorreoDestinatario, OrdenCalibracion } from '../../types'

export const CC_SERVICIO_TECNICO = 'serviciotecnico@hannacolombia.com'

// "NOMBRE CLIENTE SAS" → "Nombre Cliente Sas"
export function capitalizarNombre(nombre: string): string {
  return nombre.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// Correo al proveedor con la Orden de Compra — se dispara al crear una
// orden nueva, antes de guardarla. Usa los mismos destinatarios TO/CC
// configurados en Correos → Orden de Compra (tabla correos_destinatarios).
export function generarMailtoOC(destinatarios: CorreoDestinatario[], orden: Partial<OrdenCalibracion>): string | null {
  const to = destinatarios.filter(d => d.tipo === 'to').map(d => d.email).join(',')
  if (!to) return null
  const cc = destinatarios.filter(d => d.tipo === 'cc').map(d => d.email).join(',')
  const otstCodigos = parseOtstCodes(orden.otst)

  const subject = `OC: ${orden.numero_oc || ''} ${orden.cliente || ''}`.trim()

  const body = [
    'Estimados,',
    '',
    'Adjunto encontrarán la Orden de Compra correspondiente a los siguientes instrumentos para calibración:',
    '',
    `  • Cliente   : ${orden.cliente || ''}`,
    `  • RMV/FV    : ${orden.rmv_fv || ''}`,
    ...(otstCodigos.length ? [`  • OTST      : ${otstCodigos.join(', ')}`] : []),
    `  • N° OC     : ${orden.numero_oc || ''}`,
    `  • Modalidad : ${orden.modalidad ? MODALIDAD_LABEL[orden.modalidad] : ''}`,
    ...(orden.modalidad === 'in_situ' && orden.lugar_ejecucion ? [`  • Lugar     : ${orden.lugar_ejecucion}`] : []),
    ...(orden.fecha_programada_envio ? [`  • Fecha ideal de envío/visita : ${fmtFecha(orden.fecha_programada_envio)}`] : []),
    '',
    'Quedo atento a cualquier novedad.',
    '',
    'Saludos,',
  ].join('\n')

  const params: string[] = []
  if (cc) params.push(`cc=${encodeURIComponent(cc)}`)
  params.push(`subject=${encodeURIComponent(subject)}`)
  params.push(`body=${encodeURIComponent(body)}`)

  return `mailto:${to}?${params.join('&')}`
}

// Correo al cliente final con los certificados — se dispara al confirmar
// "Envío de certificados", antes de pasar la orden a "Terminado". Misma
// plantilla que Correos → Certificados de Calibración, con copia al
// asesor(a) de la orden y a Servicio Técnico.
export function generarMailtoCertificados(
  correoCliente: string, correoAsesor: string | null | undefined, numeroOC: string, cliente: string,
  contacto: string, genero: 'M' | 'F',
): string {
  const clienteNormalizado = capitalizarNombre(cliente)
  const saludo = contacto.trim()
    ? genero === 'F' ? `Estimada ${contacto.trim()},` : `Estimado ${contacto.trim()},`
    : 'Buen día,'
  const articulo = genero === 'F' ? 'de la cliente' : 'del cliente'

  const body = [
    saludo,
    '',
    'Cordial Saludo,',
    '',
    `Adjunto enviamos los certificados de calibración ${articulo} ${clienteNormalizado}.`,
    '',
    'Agradecemos su confianza en nosotros para sus necesidades de calibración.',
    '',
    'Cordialmente,',
  ].join('\n')

  const cc = [correoAsesor?.trim(), CC_SERVICIO_TECNICO].filter(Boolean).join(',')
  const subject = `${numeroOC || ''} ${cliente || ''}`.trim()
  const params = [
    `cc=${encodeURIComponent(cc)}`,
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ].join('&')

  return `mailto:${encodeURIComponent(correoCliente)}?${params}`
}
