import type { MedicionBloque } from '../types';

// Los certificados de fábrica solo traen mes y año de vencimiento (nunca un
// día exacto), así que fecha_vencimiento se captura como "AAAA-MM" y se
// muestra como "MM-AAAA" para no insinuar nunca un día que no está
// garantizado — igual que en Soluciones Estándar (ver utils/intranet.ts).
function formatMesAnio(mesAnio: string): string {
  if (!mesAnio) return '';
  const [y, m] = mesAnio.split('-');
  if (!y || !m) return mesAnio;
  return `${m}-${y}`;
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
    .map(f => `  <tr><td>${f.valor}</td><td>${f.estandar}</td><td>${f.tolerancia}</td></tr>`)
    .join('\n');
  partes.push(
    `<table border="1" align="center">\n  <tr><th>${bloque.titulo}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>\n${filasHtml}\n</table>`
  );
  return partes.join('\n\n');
}

export function buildAllBloquesHtml(bloques: MedicionBloque[]): string {
  return bloques.map(buildBloqueHtml).filter(Boolean).join('\n\n');
}
