import { emptyChecklist } from '../types';
import type { CertificadoGenerado, CertificadoPlantilla, ChecklistState, EquipoFila, MedicionBloque } from '../types';

export const emptyEquipo = (): EquipoFila => ({ id: crypto.randomUUID(), plantilla_id: null });

// Fecha local "AAAA-MM-DD" — toISOString() da la fecha en UTC, que en
// Colombia (UTC-5) ya es "mañana" desde las 7 p. m.
export function hoyLocal(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function emptyDraft(tecnico: string): CertificadoGenerado {
  return {
    equipos: [emptyEquipo()],
    soluciones: [],
    mediciones: [],
    checklist: emptyChecklist(),
    tecnico,
    fecha: hoyLocal(),
    adjuntos: [],
  };
}

// Compatibilidad con borradores guardados antes de que cada bloque de
// Mediciones quedara ligado a una fila de Equipos por id: se regeneran ids
// y se re-vinculan los bloques existentes a su fila por plantilla_id
// (mejor esfuerzo — son datos de historial, no algo crítico).
export function normalizeLoadedDraft(draft: CertificadoGenerado): CertificadoGenerado {
  const usedBloqueIdx = new Set<number>();
  const equipos = (draft.equipos ?? []).map(e => ({ ...e, id: e.id || crypto.randomUUID() }));
  const mediciones = equipos.map(e => {
    const idx = (draft.mediciones ?? []).findIndex((b, i) =>
      !usedBloqueIdx.has(i) && (b.equipo_id === e.id || (!b.equipo_id && b.plantilla_id === e.plantilla_id))
    );
    if (idx === -1) return null;
    usedBloqueIdx.add(idx);
    const b = draft.mediciones[idx];
    return { ...b, lote: b.lote ?? '', fecha_vencimiento: b.fecha_vencimiento ?? '', equipo_id: e.id };
  }).filter((b): b is MedicionBloque => !!b);

  return {
    ...draft,
    // Un borrador guardado sin filas dejaría la tabla de Equipos sin ningún
    // selector de plantilla; siempre se deja al menos una fila vacía.
    equipos: equipos.length ? equipos : [emptyEquipo()],
    mediciones,
    soluciones: draft.soluciones ?? [],
    checklist: { ...emptyChecklist(), ...draft.checklist },
    tecnico: draft.tecnico ?? '',
    fecha: draft.fecha ?? '',
    adjuntos: draft.adjuntos ?? [],
  };
}

// El checklist se RECALCULA por completo cada vez que cambia qué plantillas
// están elegidas — no se van acumulando marcas de plantillas anteriores. Si
// no fuera así, cada cambio de plantilla solo suma ítems y, tras probar
// varias, casi todo termina marcado y todas se ven "iguales". Los ítems
// "extra" escritos a mano por el técnico no vienen de ninguna plantilla, así
// que se conservan tal cual.
export function recomputeChecklist(equipos: EquipoFila[], plantillas: CertificadoPlantilla[], prev: ChecklistState): ChecklistState {
  const checklist = emptyChecklist();
  checklist.extra_test_funcional = prev.extra_test_funcional;
  checklist.extra_embalaje = prev.extra_embalaje;
  checklist.extra_control_estetico = prev.extra_control_estetico;

  equipos.forEach(e => {
    const plantilla = e.plantilla_id ? plantillas.find(p => p.id === e.plantilla_id) : undefined;
    if (!plantilla) return;
    plantilla.test_funcional_items.forEach(i => { checklist.test_funcional[i] = true; });
    plantilla.embalaje_items.forEach(i => { checklist.embalaje[i] = true; });
    plantilla.control_estetico_items.forEach(i => { checklist.control_estetico[i] = true; });
  });

  return checklist;
}

export function bloqueDesdePlantilla(plantilla: CertificadoPlantilla, equipoId: string): MedicionBloque {
  return {
    // Sin valor de ejemplo: la plantilla solo trae la estructura, la
    // referencia real la escribe el técnico para cada certificado.
    titulo: '',
    filas: plantilla.filas.map(f => ({ ...f })),
    notas: plantilla.notas_generales || '',
    // Lote y vencimiento son del producto físico certificado, no de la
    // plantilla reutilizable — siempre arrancan vacíos, el técnico los
    // llena para este certificado en concreto.
    lote: '',
    fecha_vencimiento: '',
    plantilla_id: plantilla.id,
    equipo_id: equipoId,
  };
}

// La fila `rowIndex` pasa a usar `plantilla`: queda dueña de un único bloque
// de mediciones — si ya tenía uno (de una plantilla anterior), se reemplaza
// en vez de acumularse — y el checklist se recalcula. Los bloques quedan en
// el mismo orden que las filas de Equipos (si no, cambiar la plantilla de la
// primera fila mandaba su tabla al final de lo que se pega en la intranet).
export function aplicarPlantilla(
  draft: CertificadoGenerado, rowIndex: number, plantilla: CertificadoPlantilla, plantillas: CertificadoPlantilla[],
): CertificadoGenerado {
  const equipoId = draft.equipos[rowIndex].id;
  const equipos = draft.equipos.map((e, i) => i === rowIndex ? { ...e, plantilla_id: plantilla.id } : e);
  const nuevo = bloqueDesdePlantilla(plantilla, equipoId);
  const mediciones = equipos
    .map(e => e.id === equipoId ? nuevo : draft.mediciones.find(b => b.equipo_id === e.id))
    .filter((b): b is MedicionBloque => !!b);
  return { ...draft, equipos, mediciones, checklist: recomputeChecklist(equipos, plantillas, draft.checklist) };
}

// Quita la fila y su bloque de mediciones — nunca deja un bloque huérfano
// en la sección de Mediciones — y recalcula el checklist sin esa plantilla.
export function quitarEquipo(draft: CertificadoGenerado, rowIndex: number, plantillas: CertificadoPlantilla[]): CertificadoGenerado {
  const equipoId = draft.equipos[rowIndex].id;
  const equipos = draft.equipos.filter((_, i) => i !== rowIndex);
  return {
    ...draft,
    equipos,
    mediciones: draft.mediciones.filter(b => b.equipo_id !== equipoId),
    checklist: recomputeChecklist(equipos, plantillas, draft.checklist),
  };
}

// Simétrico al anterior: quitar el bloque desde Mediciones (la "X" de esa
// tarjeta) también des-selecciona la plantilla en su fila de Equipos, para
// que el selector no se quede apuntando a una plantilla sin bloque, y
// recalcula el checklist sin esa plantilla.
export function quitarBloque(draft: CertificadoGenerado, bloque: MedicionBloque, plantillas: CertificadoPlantilla[]): CertificadoGenerado {
  const equipos = draft.equipos.map(e => e.id === bloque.equipo_id ? { ...e, plantilla_id: null } : e);
  return {
    ...draft,
    mediciones: draft.mediciones.filter(b => b !== bloque),
    equipos,
    checklist: recomputeChecklist(equipos, plantillas, draft.checklist),
  };
}
