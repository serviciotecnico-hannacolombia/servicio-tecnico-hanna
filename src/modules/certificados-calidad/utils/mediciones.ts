import { ENCABEZADO_PATRON_DEFAULT, type MedicionBloque } from '../types';

// Los certificados de fábrica solo traen mes y año de vencimiento (nunca un
// día exacto), así que las fechas de vencimiento se capturan como "AAAA-MM"
// y se muestran como "MM-AAAA" para no insinuar nunca un día que no está
// garantizado (así sale "F. de Vencimiento" en los certificados reales).
export function formatMesAnio(mesAnio: string): string {
  if (!mesAnio) return '';
  const [y, m] = mesAnio.split('-');
  if (!y || !m) return mesAnio;
  return `${m}-${y}`;
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// "AAAA-MM" → "Diciembre 2030": así aparece la Fecha de Expiración de las
// soluciones estándar en los certificados reales (en la intranet es un campo
// de texto libre, se imprime tal cual).
export function formatMesAnioTexto(mesAnio: string): string {
  if (!mesAnio) return '';
  const [y, m] = mesAnio.split('-');
  const mes = MESES[Number(m) - 1];
  return y && mes ? `${mes} ${y}` : mesAnio;
}

// Las celdas de la tabla van dentro de HTML que la intranet renderiza: un
// valor como "<0.05 ppm" o "A&B" rompería la tabla si se pega sin escapar.
// Las entidades ya escritas ("&lt;", "&#177;") se respetan: no se
// convierten en "&amp;lt;", que la intranet mostraría literal.
function escapeHtml(text: string): string {
  return text.replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Marcador que el userscript reemplaza con el dato de la tabla Equipos de la
// intranet (que "Cargar Datos" llena desde la factura): el bloque N toma la
// fila de su equipo — ver resolverEquipos en el userscript.
export type CampoEquipo = 'codigo' | 'nombre' | 'serie';
export const marcadorEquipo = (indiceBloque: number, campo: CampoEquipo) => `{{EQUIPO${indiceBloque + 1}.${campo}}}`;

// Bloques de verificación de un producto (reactivos, soluciones): su texto
// trae "[código]" y su encabezado es Ref./Lote/Vencimiento del producto.
// Bomba y similares, sin tabla pero sin "[código]", no llevan ese encabezado.
export const esBloqueDeProducto = (bloque: MedicionBloque) => bloque.filas.length === 0 && /\[código\]/i.test(bloque.notas);

export interface OpcionesHtml {
  // Solo para "Copiar para Intranet": los campos que el técnico dejó vacíos
  // y que la intranet ya conoce (código, nombre y serie del equipo) salen
  // como marcadores. En las copias manuales se omiten, como siempre.
  indice?: number;
  marcadores?: boolean;
}

export function buildBloqueHtml(bloque: MedicionBloque, { indice = 0, marcadores = false }: OpcionesHtml = {}): string {
  const desdeEquipo = (valor: string, campo: CampoEquipo) => valor || (marcadores ? marcadorEquipo(indice, campo) : '');

  // Bloques sin tabla (reactivo/solución/bomba/titulador): el técnico llena
  // Lote y Vencimiento en campos separados y amigables, no como texto libre
  // — el encabezado se arma solo, pegado al párrafo sin línea en blanco de
  // por medio (igual que en el certificado real), y "[código]" dentro del
  // texto se reemplaza por el Código del producto ("HI 93735-01") — no hay
  // que editarlo a mano.
  if (bloque.filas.length === 0) {
    const producto = esBloqueDeProducto(bloque);
    const referencia = producto ? desdeEquipo(bloque.titulo.trim(), 'nombre') : bloque.titulo.trim();
    const lote = producto ? desdeEquipo(bloque.lote.trim(), 'serie') : bloque.lote.trim();
    const encabezado: string[] = [];
    if (referencia) encabezado.push(`Ref. ${referencia}`);
    if (lote) encabezado.push(`Lote: ${lote}`);
    if (bloque.fecha_vencimiento) encabezado.push(`F. de Vencimiento: ${formatMesAnio(bloque.fecha_vencimiento)}`);
    const codigo = desdeEquipo(bloque.codigo?.trim() ?? '', 'codigo') || referencia;
    const notas = codigo ? bloque.notas.trim().replace(/\[código\]/gi, codigo) : bloque.notas.trim();
    return [...encabezado, notas].filter(Boolean).join('\n');
  }

  const partes: string[] = [];
  if (bloque.notas.trim()) partes.push(bloque.notas.trim());
  const filasHtml = bloque.filas
    .map(f => `  <tr><td>${escapeHtml(f.valor)}</td><td>${escapeHtml(f.estandar)}</td><td>${escapeHtml(f.tolerancia)}</td></tr>`)
    .join('\n');
  const titulo = bloque.titulo.trim() ? escapeHtml(bloque.titulo.trim()) : desdeEquipo('', 'codigo');
  partes.push(
    `<table border="1" align="center">\n  <tr><th>${titulo}</th><th>${escapeHtml(bloque.encabezado_patron?.trim() || ENCABEZADO_PATRON_DEFAULT)}</th><th>Tolerancia</th></tr>\n${filasHtml}\n</table>`
  );
  return partes.join('\n\n');
}

export function buildAllBloquesHtml(bloques: MedicionBloque[], { marcadores = false }: Pick<OpcionesHtml, 'marcadores'> = {}): string {
  return bloques.map((b, indice) => buildBloqueHtml(b, { indice, marcadores })).filter(Boolean).join('\n\n');
}
