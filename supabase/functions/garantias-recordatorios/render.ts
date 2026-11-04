// Arma el HTML del correo de recordatorio de garantía — mismo estilo que
// calibraciones-notificar/render.ts: estilos inline y tablas (no flex/grid)
// para Outlook y Gmail. Todo texto pasa por escapeHtml; enlaces solo https.

export interface FilaCorreo { label: string, valor: string }

export interface DatosRecordatorio {
  codigo: string          // "GAR-20"
  cliente: string
  estado: string
  fechaHora: string       // ya formateada en hora de Colombia
  nota?: string | null
  programadoPor?: string | null
  detalle: FilaCorreo[]
  garantiaUrl?: string | null
}

const MAX_TEXTO = 2000

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

const AZUL = '#0057b8'
const GRIS = '#6b7280'
const BORDE = '#e5e7eb'

function tabla(titulo: string, filas: FilaCorreo[]): string {
  const visibles = filas.filter(f => f.valor && f.valor.trim())
  if (!visibles.length) return ''
  const rows = visibles.map(f => `<tr>
      <td style="padding:7px 12px 7px 0;color:${GRIS};font-size:13px;vertical-align:top;white-space:nowrap;border-bottom:1px solid ${BORDE}">${txt(f.label)}</td>
      <td style="padding:7px 0;color:#111827;font-size:13px;vertical-align:top;border-bottom:1px solid ${BORDE}">${txt(f.valor)}</td>
    </tr>`).join('')
  return `
    <p style="margin:22px 0 6px;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${AZUL}">${txt(titulo)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${rows}</table>`
}

export function renderRecordatorio(d: DatosRecordatorio): string {
  const nota = txt(d.nota?.trim())
  const programadoPor = txt(d.programadoPor)
  const url = urlSegura(d.garantiaUrl)

  return `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <p style="margin:0;font-size:12px;color:${GRIS}">Garantías · Servicio Técnico Hanna</p>
  <p style="margin:4px 0 0;font-size:18px;font-weight:700">${txt(d.codigo)} · ${txt(d.cliente)}</p>

  <p style="margin:18px 0 8px;font-size:15px;font-weight:600">Recordatorio: debes gestionar esta garantía</p>
  <p style="margin:0;font-size:13px;color:${GRIS}">
    Programado para el <strong style="color:#111827">${txt(d.fechaHora)}</strong>
    · Estado actual:
    <span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#e8f0fb;border:1px solid ${AZUL};color:${AZUL};font-size:12px;font-weight:700">${txt(d.estado)}</span>
  </p>

  ${nota ? `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:20px;border-collapse:collapse">
    <tr><td style="padding:12px 16px;background:#fff8e6;border-left:4px solid #f59e0b;font-size:13px">
      <strong>Nota:</strong> ${nota.replace(/\n/g, '<br>')}
    </td></tr>
  </table>` : ''}

  ${tabla('Detalle de la garantía', d.detalle)}

  ${programadoPor ? `<p style="margin:20px 0 0;font-size:12px;color:${GRIS}">Recordatorio programado por: ${programadoPor}</p>` : ''}
  ${url ? `<p style="margin:16px 0 0"><a href="${url}" style="display:inline-block;padding:10px 18px;background:${AZUL};color:#ffffff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">Ver garantía</a></p>` : ''}
</div>`.trim()
}
