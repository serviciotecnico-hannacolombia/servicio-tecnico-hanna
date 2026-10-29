// Arma el HTML del correo de cambio de estado — separado de index.ts para
// poder previsualizarlo sin Deno ni Resend. Estilos inline y tablas (no
// flex/grid) para que se vea bien en Outlook y Gmail. Todo valor que llega
// del cliente pasa por escapeHtml; los enlaces solo se aceptan si son https.

export interface FilaCorreo { label: string, valor: string, url?: string }

export interface DatosCorreo {
  ordenId: string
  cliente?: string | null
  numeroOc?: string | null
  estadoAnterior?: string | null
  estadoNuevo: string
  ordenUrl?: string | null
  usuario?: string | null
  titular?: string | null
  detalles?: unknown
  proximoPaso?: string | null
  resumen?: unknown
  // Correo de novedad (tipo = 'novedad'): en vez de "anterior → nuevo" se
  // muestra la etapa, el detalle, los equipos afectados y el historial de
  // la novedad. El asunto lo arma index.ts igual que el de estado.
  tipo?: string | null
  etapa?: string | null
  detalleNovedad?: string | null
  resuelta?: boolean | null
  resolucion?: string | null
  equipos?: unknown
  historialNovedad?: unknown
}

const MAX_FILAS = 30
const MAX_TEXTO = 1000

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function txt(v: unknown): string {
  return v == null ? '' : escapeHtml(String(v).slice(0, MAX_TEXTO))
}

function urlSegura(v: unknown): string | null {
  return typeof v === 'string' && /^https:\/\//i.test(v) ? escapeHtml(v) : null
}

// Acepta solo arrays de { label, valor, url? } con texto — cualquier otra
// cosa se descarta (el body viene del navegador).
export function parseFilas(raw: unknown): FilaCorreo[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, MAX_FILAS).flatMap(f => {
    if (!f || typeof f !== 'object') return []
    const { label, valor, url } = f as Record<string, unknown>
    if (typeof label !== 'string' || (typeof valor !== 'string' && typeof valor !== 'number')) return []
    if (!String(valor).trim()) return []
    return [{ label, valor: String(valor), url: typeof url === 'string' ? url : undefined }]
  })
}

const AZUL = '#0057b8'
const GRIS = '#6b7280'
const BORDE = '#e5e7eb'

function tabla(titulo: string, filas: FilaCorreo[]): string {
  if (!filas.length) return ''
  const rows = filas.map(f => {
    const url = urlSegura(f.url)
    const valor = url
      ? `<a href="${url}" style="color:${AZUL};font-weight:600;text-decoration:none">${txt(f.valor)} &#8599;</a>`
      : txt(f.valor).replace(/\n/g, '<br>')
    return `<tr>
      <td style="padding:7px 12px 7px 0;color:${GRIS};font-size:13px;vertical-align:top;white-space:nowrap;border-bottom:1px solid ${BORDE}">${txt(f.label)}</td>
      <td style="padding:7px 0;color:#111827;font-size:13px;vertical-align:top;border-bottom:1px solid ${BORDE}">${valor}</td>
    </tr>`
  }).join('')
  return `
    <p style="margin:22px 0 6px;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${AZUL}">${txt(titulo)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${rows}</table>`
}

function franja(texto: string, fondo: string, borde: string, etiqueta = ''): string {
  if (!texto) return ''
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:14px;border-collapse:collapse">
    <tr><td style="padding:12px 16px;background:${fondo};border-left:4px solid ${borde};font-size:13px">
      ${etiqueta ? `<strong>${etiqueta}</strong> ` : ''}${texto.replace(/\n/g, '<br>')}
    </td></tr>
  </table>`
}

function renderNovedad(d: DatosCorreo): string {
  const resuelta = !!d.resuelta
  const etapa = txt(d.etapa)
  const fondo = resuelta ? '#e8f7ee' : '#fff8e6'
  const borde = resuelta ? '#16a34a' : '#f59e0b'
  const color = resuelta ? '#15803d' : '#b45309'
  const etiqueta = `${resuelta ? 'Novedad resuelta' : 'Novedad'}${etapa ? ` · ${etapa}` : ''}`
  return `
  <p style="margin:0">
    <span style="display:inline-block;padding:3px 12px;border-radius:20px;background:${fondo};border:1px solid ${borde};color:${color};font-size:13px;font-weight:700">${etiqueta}</span>
  </p>
  ${franja(txt(d.detalleNovedad), '#fff8e6', '#f59e0b')}
  ${resuelta ? franja(txt(d.resolucion), '#e8f7ee', '#16a34a', 'Solución:') : ''}
  ${tabla('Equipos afectados', parseFilas(d.equipos))}
  ${tabla('Historial de la novedad', parseFilas(d.historialNovedad))}`
}

export function renderCorreo(d: DatosCorreo): string {
  const detalles = parseFilas(d.detalles)
  const resumen = parseFilas(d.resumen)
  const numeroOc = txt(d.numeroOc)
  const cliente = txt(d.cliente)
  const estadoNuevo = txt(d.estadoNuevo)
  const estadoAnterior = txt(d.estadoAnterior)
  const titular = txt(d.titular) || `La orden cambió de estado`
  const proximoPaso = txt(d.proximoPaso)
  const usuario = txt(d.usuario)
  const ordenUrl = urlSegura(d.ordenUrl)

  return `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <p style="margin:0;font-size:12px;color:${GRIS}">Calibraciones · Servicio Técnico Hanna</p>
  <p style="margin:4px 0 0;font-size:18px;font-weight:700">${numeroOc || txt(d.ordenId)}${cliente ? ` · ${cliente}` : ''}</p>

  <p style="margin:18px 0 8px;font-size:15px;font-weight:600">${titular}</p>
  ${d.tipo === 'novedad' ? renderNovedad(d) : `
  <p style="margin:0">
    ${estadoAnterior ? `<span style="color:${GRIS};font-size:13px;text-decoration:line-through">${estadoAnterior}</span> <span style="color:${GRIS}">&rarr;</span> ` : ''}
    <span style="display:inline-block;padding:3px 12px;border-radius:20px;background:#e8f0fb;border:1px solid ${AZUL};color:${AZUL};font-size:13px;font-weight:700">${estadoNuevo}</span>
  </p>`}

  ${tabla('Lo registrado en este paso', detalles)}

  ${proximoPaso ? `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:20px;border-collapse:collapse">
    <tr><td style="padding:12px 16px;background:#fff8e6;border-left:4px solid #f59e0b;font-size:13px">
      <strong>Próximo paso:</strong> ${proximoPaso}
    </td></tr>
  </table>` : ''}

  ${tabla('Resumen de la orden', resumen)}

  ${usuario ? `<p style="margin:20px 0 0;font-size:12px;color:${GRIS}">Actualizado por: ${usuario}</p>` : ''}
  ${ordenUrl ? `<p style="margin:16px 0 0"><a href="${ordenUrl}" style="display:inline-block;padding:10px 18px;background:${AZUL};color:#ffffff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">Ver orden</a></p>` : ''}
</div>`.trim()
}
