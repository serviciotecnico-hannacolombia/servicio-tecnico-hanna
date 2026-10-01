import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { buildAllBloquesHtml } from './mediciones';
import type { ArchivoCertificado, CertificadoGenerado } from '../types';

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

export interface IntranetPayload {
  // Equipos NO se copia: la intranet ya los carga sola al buscar por número
  // de factura ("Cargar Datos"). Aquí solo se usa esa fila para elegir la
  // plantilla de Mediciones — ver EquiposSelector.
  soluciones: { codigo: string; lote: string; fechaExpiracion: string; descripcion: string }[];
  medicionesHtml: string;
  checklist: IntranetChecklistPayload;
  fecha: string;        // ISO yyyy-mm-dd, para <input type="date">
  fechaDisplay: string;  // dd/mm/aaaa, para campos de texto simples
  tecnico: string;
  adjuntos: IntranetAdjunto[];
}

function formatFechaDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// Los certificados de soluciones estándar solo traen mes y año de
// vencimiento (nunca un día exacto), así que fecha_expiracion se captura
// como "AAAA-MM" (<input type="month">) y se muestra como "MM-AAAA" para no
// insinuar nunca un día que no podemos garantizar.
function formatMesAnio(mesAnio: string): string {
  if (!mesAnio) return '';
  const [y, m] = mesAnio.split('-');
  if (!y || !m) return mesAnio;
  return `${m}-${y}`;
}

function checkedItems(record: Record<string, boolean>): string[] {
  return Object.entries(record).filter(([, v]) => v).map(([k]) => k);
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

export async function buildIntranetPayload(draft: CertificadoGenerado, archivos: ArchivoCertificado[]): Promise<IntranetPayload> {
  return {
    soluciones: draft.soluciones.map(s => ({
      codigo: s.codigo, lote: s.lote, fechaExpiracion: formatMesAnio(s.fecha_expiracion), descripcion: s.descripcion,
    })),
    medicionesHtml: buildAllBloquesHtml(draft.mediciones),
    checklist: {
      testFuncional: checkedItems(draft.checklist.test_funcional),
      testFuncionalExtra: draft.checklist.extra_test_funcional.filter(Boolean),
      embalaje: checkedItems(draft.checklist.embalaje),
      embalajeExtra: draft.checklist.extra_embalaje.filter(Boolean),
      controlEstetico: checkedItems(draft.checklist.control_estetico),
      controlEsteticoExtra: draft.checklist.extra_control_estetico.filter(Boolean),
    },
    fecha: draft.fecha || '',
    fechaDisplay: formatFechaDisplay(draft.fecha || ''),
    tecnico: draft.tecnico || '',
    adjuntos: await buildAdjuntosPayload(draft.adjuntos, archivos),
  };
}

export async function copyForIntranet(draft: CertificadoGenerado, archivos: ArchivoCertificado[]) {
  if (draft.mediciones.length === 0) {
    toast.error('Selecciona al menos una plantilla en Equipos antes de copiar');
    return;
  }
  const payload = await buildIntranetPayload(draft, archivos);
  try {
    await navigator.clipboard.writeText(MARKER + JSON.stringify(payload));
    toast.success('Certificado copiado — ve a la intranet y usa "Pegar desde Servicio Técnico" (tienes 5 min para pegar los adjuntos)');
  } catch {
    toast.error('No se pudo copiar al portapapeles');
  }
}
