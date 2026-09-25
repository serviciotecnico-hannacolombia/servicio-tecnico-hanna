import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Save, RotateCcw, ClipboardCopy } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../hooks/useUser';
import { EquiposSelector } from './EquiposSelector';
import { SolucionesPatronPicker } from './SolucionesPatronPicker';
import { MedicionesEditor } from './MedicionesEditor';
import { ChecklistPanel } from './ChecklistPanel';
import { ArchivosAdjuntosPanel } from './ArchivosAdjuntosPanel';
import { usePlantillas, useSolucionesPatron, useArchivosCertificado, useInvalidateCertificadosCalidad } from '../hooks/useCertificadosCalidad';
import { copyForIntranet } from '../utils/intranet';
import { emptyChecklist } from '../types';
import type { CertificadoGenerado, CertificadoPlantilla, ChecklistState, EquipoFila, MedicionBloque } from '../types';

const emptyEquipo = (): EquipoFila => ({ id: crypto.randomUUID(), plantilla_id: null });

// Compatibilidad con borradores guardados antes de que cada bloque de
// Mediciones quedara ligado a una fila de Equipos por id: se regeneran ids
// y se re-vinculan los bloques existentes a su fila por plantilla_id
// (mejor esfuerzo — son datos de historial, no algo crítico).
function normalizeLoadedDraft(draft: CertificadoGenerado): CertificadoGenerado {
  const usedBloqueIdx = new Set<number>();
  const equipos = draft.equipos.map(e => ({ ...e, id: e.id || crypto.randomUUID() }));
  const mediciones = equipos.map(e => {
    const idx = draft.mediciones.findIndex((b, i) =>
      !usedBloqueIdx.has(i) && (b.equipo_id === e.id || (!b.equipo_id && b.plantilla_id === e.plantilla_id))
    );
    if (idx === -1) return null;
    usedBloqueIdx.add(idx);
    const b = draft.mediciones[idx];
    return { lote: '', fecha_vencimiento: '', ...b, equipo_id: e.id };
  }).filter((b): b is MedicionBloque => !!b);

  return { ...draft, equipos, mediciones, adjuntos: draft.adjuntos ?? [] };
}

// El checklist se RECALCULA por completo cada vez que cambia qué plantillas
// están elegidas — no se van acumulando marcas de plantillas anteriores. Si
// no fuera así, cada cambio de plantilla solo suma ítems y, tras probar
// varias, casi todo termina marcado y todas se ven "iguales". Los ítems
// "extra" escritos a mano por el técnico no vienen de ninguna plantilla, así
// que se conservan tal cual.
function recomputeChecklist(equipos: EquipoFila[], plantillas: CertificadoPlantilla[], prev: ChecklistState): ChecklistState {
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

function emptyDraft(tecnico: string): CertificadoGenerado {
  return {
    equipos: [emptyEquipo()],
    soluciones: [],
    mediciones: [],
    checklist: emptyChecklist(),
    tecnico,
    fecha: new Date().toISOString().slice(0, 10),
    adjuntos: [],
  };
}

interface CrearCertificadoTabProps {
  initialDraft?: CertificadoGenerado | null;
}

export function CrearCertificadoTab({ initialDraft }: CrearCertificadoTabProps) {
  const { user, displayName } = useUser();
  const { data: plantillas = [] } = usePlantillas();
  const { data: solucionesCatalogo = [] } = useSolucionesPatron();
  const { data: archivos = [] } = useArchivosCertificado();
  const invalidate = useInvalidateCertificadosCalidad();

  const [draft, setDraft] = useState<CertificadoGenerado>(() =>
    initialDraft ? normalizeLoadedDraft(initialDraft) : emptyDraft(displayName)
  );
  const [saving, setSaving] = useState(false);

  const plantillasActivas = useMemo(() => plantillas.filter(p => p.activo), [plantillas]);

  const plantillasSeleccionadas = useMemo(() => {
    const map = new Map<string, typeof plantillasActivas[number]>();
    draft.equipos.forEach(e => {
      if (!e.plantilla_id) return;
      const p = plantillasActivas.find(pl => pl.id === e.plantilla_id);
      if (p) map.set(p.id, p);
    });
    return [...map.values()];
  }, [draft.equipos, plantillasActivas]);

  const categorias = useMemo(
    () => [...new Set(plantillasSeleccionadas.map(p => p.categoria).filter(Boolean) as string[])],
    [plantillasSeleccionadas]
  );

  const patch = (p: Partial<CertificadoGenerado>) => setDraft(prev => ({ ...prev, ...p }));

  // Disparado por el <select> de plantilla de una fila (acción explícita del
  // técnico): esa fila queda dueña de un único bloque de mediciones — si ya
  // tenía uno (de una plantilla anterior), se reemplaza en vez de acumularse,
  // y se pre-marca el checklist de la nueva plantilla.
  const handleSelectPlantilla = (rowIndex: number, plantillaId: string) => {
    const plantilla = plantillasActivas.find(p => p.id === plantillaId);
    if (!plantilla) return;

    setDraft(prev => {
      const equipoId = prev.equipos[rowIndex].id;
      const equipos = prev.equipos.map((e, i) => i === rowIndex ? { ...e, plantilla_id: plantillaId } : e);

      const bloque: MedicionBloque = {
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

      const checklist = recomputeChecklist(equipos, plantillasActivas, prev.checklist);
      const mediciones = [...prev.mediciones.filter(b => b.equipo_id !== equipoId), bloque];

      return { ...prev, equipos, mediciones, checklist };
    });
  };

  // Quita la fila y su bloque de mediciones — nunca deja un bloque huérfano
  // en la sección de Mediciones — y recalcula el checklist sin esa plantilla.
  const handleRemoveEquipo = (rowIndex: number) => {
    setDraft(prev => {
      const equipoId = prev.equipos[rowIndex].id;
      const equipos = prev.equipos.filter((_, i) => i !== rowIndex);
      return {
        ...prev,
        equipos,
        mediciones: prev.mediciones.filter(b => b.equipo_id !== equipoId),
        checklist: recomputeChecklist(equipos, plantillasActivas, prev.checklist),
      };
    });
  };

  // Simétrico al anterior: quitar el bloque desde Mediciones (la "X" de esa
  // tarjeta) también des-selecciona la plantilla en su fila de Equipos, para
  // que el selector no se quede apuntando a una plantilla sin bloque — si el
  // técnico la vuelve a elegir por error, no pasaría nada (mismo valor) — y
  // recalcula el checklist sin esa plantilla.
  const handleRemoveBloque = (bloque: MedicionBloque) => {
    setDraft(prev => {
      const equipos = prev.equipos.map(e => e.id === bloque.equipo_id ? { ...e, plantilla_id: null } : e);
      return {
        ...prev,
        mediciones: prev.mediciones.filter(b => b !== bloque),
        equipos,
        checklist: recomputeChecklist(equipos, plantillasActivas, prev.checklist),
      };
    });
  };

  const handleNuevo = () => {
    if (!window.confirm('¿Descartar este borrador y empezar uno nuevo?')) return;
    setDraft(emptyDraft(displayName));
  };

  const handleGuardar = async () => {
    if (draft.mediciones.length === 0) { toast.error('Selecciona al menos una plantilla en Equipos'); return; }
    setSaving(true);
    const { error } = await supabase.from('certificados_calidad_generados').insert({
      equipos: draft.equipos.filter(e => e.plantilla_id),
      soluciones: draft.soluciones,
      mediciones: draft.mediciones,
      checklist: draft.checklist,
      tecnico: draft.tecnico || null,
      fecha: draft.fecha || null,
      adjuntos: draft.adjuntos,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error('Error al guardar borrador: ' + error.message); return; }
    invalidate();
    toast.success('Borrador guardado en el historial');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Equipos">
        <EquiposSelector
          equipos={draft.equipos}
          onAddRow={() => patch({ equipos: [...draft.equipos, emptyEquipo()] })}
          onRemoveRow={handleRemoveEquipo}
          onSelectPlantilla={handleSelectPlantilla}
          plantillas={plantillasActivas}
        />
      </Card>

      <Card title="Soluciones Estándar / Equipos Patrón Utilizados">
        <SolucionesPatronPicker
          soluciones={draft.soluciones}
          onChange={soluciones => patch({ soluciones })}
          catalogo={solucionesCatalogo}
          categorias={categorias}
        />
      </Card>

      <Card title="Mediciones">
        <MedicionesEditor bloques={draft.mediciones} onChange={mediciones => patch({ mediciones })} onRemoveBloque={handleRemoveBloque} />
      </Card>

      <Card title="Test Funcional, Test Físico y Embalaje">
        <ChecklistPanel checklist={draft.checklist} onChange={checklist => patch({ checklist })} />
      </Card>

      <Card title="Otros">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <Input label="Fecha" type="date" value={draft.fecha} onChange={e => patch({ fecha: e.target.value })} />
          <Input label="Técnico" value={draft.tecnico} onChange={e => patch({ tecnico: e.target.value })} />
        </div>
      </Card>

      <Card title="Archivos Adjuntos Disponibles">
        <ArchivosAdjuntosPanel
          archivos={archivos}
          plantillasSeleccionadas={plantillasSeleccionadas}
          seleccionados={draft.adjuntos}
          onChangeSeleccionados={adjuntos => patch({ adjuntos })}
        />
      </Card>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={handleNuevo}>
          <RotateCcw size={15} /> Nuevo borrador
        </Button>
        <Button variant="ghost" onClick={() => copyForIntranet(draft, archivos)}>
          <ClipboardCopy size={15} /> Copiar para Intranet
        </Button>
        <Button onClick={handleGuardar} disabled={saving}>
          <Save size={15} /> {saving ? 'Guardando...' : 'Guardar borrador'}
        </Button>
      </div>
    </div>
  );
}
