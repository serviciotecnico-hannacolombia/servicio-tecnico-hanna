import type { MedicionBloque } from '../types';

// Los certificados de fábrica solo traen mes y año de vencimiento (nunca un
// día exacto), así que las fechas de vencimiento se capturan como "AAAA-MM"
// y se muestran como "MM-AAAA" para no insinuar nunca un día que no está
// garantizado — tanto en Mediciones como en Soluciones Estándar.
export function formatMesAnio(mesAnio: string): string {
  if (!mesAnio) return '';
  const [y, m] = mesAnio.split('-');
  if (!y || !m) return mesAnio;
  return `${m}-${y}`;
}

// Las celdas de la tabla van dentro de HTML que la intranet renderiza: un
// valor como "<0.05 ppm" o "A&B" rompería la tabla si se pega sin escapar.
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildBloqueHtml(bloque: MedicionBloque): string {
  // Bloques sin tabla (reactivo/solución/bomba/titulador): el técnico llena
  // Lote y Vencimiento en campos separados y amigables, no como texto libre
  // — el encabezado se arma solo, pegado al párrafo sin línea en blanco de
  // por medio (igual que en el certificado real), y "[código]" dentro del
  // texto se reemplaza por la misma Referencia — no hay que editarlo a mano.
  if (bloque.filas.length === 0) {
    const referencia = bloque.titulo.trim();
    const encabezado: string[] = [];
    if (referencia) encabezado.push(`Ref. ${referencia}`);
    if (bloque.lote.trim()) encabezado.push(`Lote: ${bloque.lote.trim()}`);
    if (bloque.fecha_vencimiento) encabezado.push(`F. de Vencimiento: ${formatMesAnio(bloque.fecha_vencimiento)}`);
    const notas = referencia ? bloque.notas.trim().replace(/\[código\]/gi, referencia) : bloque.notas.trim();
    return [...encabezado, notas].filter(Boolean).join('\n');
  }

  const partes: string[] = [];
  if (bloque.notas.trim()) partes.push(bloque.notas.trim());
  const filasHtml = bloque.filas
    .map(f => `  <tr><td>${escapeHtml(f.valor)}</td><td>${escapeHtml(f.estandar)}</td><td>${escapeHtml(f.tolerancia)}</td></tr>`)
    .join('\n');
  partes.push(
    `<table border="1" align="center">\n  <tr><th>${escapeHtml(bloque.titulo)}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>\n${filasHtml}\n</table>`
  );
  return partes.join('\n\n');
}

export function buildAllBloquesHtml(bloques: MedicionBloque[]): string {
  return bloques.map(buildBloqueHtml).filter(Boolean).join('\n\n');
}
