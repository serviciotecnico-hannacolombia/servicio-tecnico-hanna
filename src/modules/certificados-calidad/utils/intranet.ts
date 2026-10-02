import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { buildAllBloquesHtml, formatMesAnioTexto } from './mediciones';
import { CHECKLIST_BASE } from '../types';
import type { ArchivoCertificado, CertificadoGenerado, CertificadoPlantilla, MedicionBloque } from '../types';

// Marcador que el userscript de la intranet busca en el portapapeles para
// reconocer que el texto copiado es un certificado (y no cualquier otra cosa
// que el técnico haya copiado antes o después).
const MARKER = 'HANNA_CERT_V1:';

// Suficiente para armar el certificado en la intranet sin apurarse, pero sin
// dejar el enlace de descarga vivo indefinidamente en el portapapeles.
const ADJUNTO_URL_TTL_SEGUNDOS = 300;

export interface IntranetChecklistPayload {
  testFuncional: string[];
  testFuncionalExtra: string[];
  embalaje: string[];
  embalajeExtra: string[];
  controlEstetico: string[];
  controlEsteticoExtra: string[];
}

export interface IntranetAdjunto {
  nombre: string;
  url: string;
}

// Solución estándar cuyo certificado de análisis (COA) el userscript busca
// en documentation.hannainst.com por código y lote, y adjunta. Esa página no
// permite consultas desde otro sitio (sin CORS), por eso lo hace el
// userscript con GM_xmlhttpRequest y no esta app.
export interface IntranetCoa {
  codigo: string;
  lote: string;
}

export interface IntranetPayload {
  // Equipos NO se copia: la intranet ya los carga sola al buscar por número
  // de factura ("Cargar Datos"). Aquí solo se usa esa fila para elegir la
  // plantilla de Mediciones — ver EquiposSelector.
  soluciones: {
    codigo: string; lote: string;
    fechaExpiracion: string;     // "Diciembre 2030", como en los certificados reales
    fechaExpiracionIso: string;  // "AAAA-MM", para <input type="month"/"date">
    descripcion: string;
  }[];
  // Puede traer marcadores {{EQUIPO<n>.codigo|nombre|serie}} que el
  // userscript reemplaza con la fila de Equipos de la intranet del bloque n
  // (ver `bloques`), para no reescribir lo que "Cargar Datos" ya trae.
  medicionesHtml: string;
  // Uno por bloque de Mediciones, en orden. `pista`: código con el que
  // buscar su fila en Equipos (el del producto, el título escrito o el de la
  // plantilla específica); vacío = se empareja por orden.
  bloques: { pista: string }[];
  checklist: IntranetChecklistPayload;
  fecha: string;        // ISO yyyy-mm-dd, para <input type="date">
  fechaDisplay: string;  // dd/mm/aaaa, para campos de texto simples
  tecnico: string;
  adjuntos: IntranetAdjunto[];
  coas: IntranetCoa[];
}

function formatFechaDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// La intranet solo tiene checkbox para los ítems de CHECKLIST_BASE. Un ítem
// marcado que no está ahí ("Reactivo.", "Dos cubetas.") va a los cuadros de
// texto junto con los extra escritos a mano — si no, el userscript no
// encontraba su checkbox y se perdía.
function separarChecklist(record: Record<string, boolean>, base: readonly string[], extras: string[]) {
  const marcados = Object.entries(record).filter(([, v]) => v).map(([k]) => k);
  const fueraDeBase = marcados.filter(k => !base.includes(k));
  const escritos = extras.map(s => s.trim()).filter(Boolean);
  return {
    checks: marcados.filter(k => base.includes(k)),
    extras: [...fueraDeBase, ...escritos.filter(e => !fueraDeBase.includes(e))],
  };
}

// Genera un enlace firmado (temporal) por cada adjunto seleccionado, para que
// el userscript de la intranet pueda descargarlo y adjuntarlo sin necesitar
// acceso directo al bucket privado. Los que fallen se omiten con un aviso —
// mejor copiar el resto del certificado que bloquear todo por un archivo.
async function buildAdjuntosPayload(adjuntoIds: string[], archivos: ArchivoCertificado[]): Promise<IntranetAdjunto[]> {
  const seleccionados = adjuntoIds
    .map(id => archivos.find(a => a.id === id))
    .filter((a): a is ArchivoCertificado => !!a);

  const resultados = await Promise.all(seleccionados.map(async a => {
    const { data, error } = await supabase.storage
      .from('certificados-calidad')
      .createSignedUrl(a.storage_path, ADJUNTO_URL_TTL_SEGUNDOS);
    if (error || !data) {
      toast.error(`No se pudo preparar el adjunto "${a.nombre_archivo}": ${error?.message || 'sin URL'}`);
      return null;
    }
    return { nombre: a.nombre_archivo, url: data.signedUrl };
  }));

  return resultados.filter((a): a is IntranetAdjunto => !!a);
}

export interface CopyOptions {
  adjuntarCoa?: boolean;
  plantillas?: CertificadoPlantilla[];
}

// Las plantillas por equipo se llaman como el código del equipo ("HI 98501");
// las de familia no ("pH", "Temperatura").
const pareceCodigoDeEquipo = (codigo: string) => /^HI\s*\d/i.test(codigo.trim());

function pistaDeBloque(bloque: MedicionBloque, plantillas: CertificadoPlantilla[]): string {
  const plantilla = plantillas.find(p => p.id === bloque.plantilla_id);
  const desdePlantilla = plantilla && pareceCodigoDeEquipo(plantilla.codigo) ? plantilla.codigo : '';
  const titulo = bloque.filas.length > 0 ? bloque.titulo.trim() : '';
  return bloque.codigo?.trim() || titulo || desdePlantilla;
}

export async function buildIntranetPayload(
  draft: CertificadoGenerado, archivos: ArchivoCertificado[], { adjuntarCoa = false, plantillas = [] }: CopyOptions = {},
): Promise<IntranetPayload> {
  const tf = separarChecklist(draft.checklist.test_funcional, CHECKLIST_BASE.test_funcional, draft.checklist.extra_test_funcional);
  const em = separarChecklist(draft.checklist.embalaje, CHECKLIST_BASE.embalaje, draft.checklist.extra_embalaje);
  const ce = separarChecklist(draft.checklist.control_estetico, CHECKLIST_BASE.control_estetico, draft.checklist.extra_control_estetico);
  return {
    soluciones: draft.soluciones.map(s => ({
      codigo: s.codigo,
      lote: s.lote,
      fechaExpiracion: formatMesAnioTexto(s.fecha_expiracion),
      fechaExpiracionIso: s.fecha_expiracion ? s.fecha_expiracion.slice(0, 7) : '',
      descripcion: s.descripcion,
    })),
    medicionesHtml: buildAllBloquesHtml(draft.mediciones, { marcadores: true }),
    bloques: draft.mediciones.map(b => ({ pista: pistaDeBloque(b, plantillas) })),
    checklist: {
      testFuncional: tf.checks,
      testFuncionalExtra: tf.extras,
      embalaje: em.checks,
      embalajeExtra: em.extras,
      controlEstetico: ce.checks,
      controlEsteticoExtra: ce.extras,
    },
    fecha: draft.fecha || '',
    fechaDisplay: formatFechaDisplay(draft.fecha || ''),
    tecnico: draft.tecnico || '',
    adjuntos: await buildAdjuntosPayload(draft.adjuntos, archivos),
    coas: adjuntarCoa
      ? draft.soluciones.filter(s => s.codigo.trim() && s.lote.trim()).map(s => ({ codigo: s.codigo.trim(), lote: s.lote.trim() }))
      : [],
  };
}

export async function copyForIntranet(draft: CertificadoGenerado, archivos: ArchivoCertificado[], opciones: CopyOptions = {}) {
  if (draft.mediciones.length === 0) {
    toast.error('Selecciona al menos una plantilla en Equipos antes de copiar');
    return;
  }
  const payload = await buildIntranetPayload(draft, archivos, opciones);
  try {
    await navigator.clipboard.writeText(MARKER + JSON.stringify(payload));
    toast.success('Certificado copiado — ve a la intranet y usa "Pegar desde Servicio Técnico" (tienes 5 min para pegar los adjuntos)');
  } catch {
    toast.error('No se pudo copiar al portapapeles');
  }
}
