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
import { emptyDraft, emptyEquipo, normalizeLoadedDraft, aplicarPlantilla, quitarEquipo, quitarBloque } from '../utils/draft';
import type { CertificadoGenerado, MedicionBloque } from '../types';

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
  // técnico) — ver aplicarPlantilla.
  const handleSelectPlantilla = (rowIndex: number, plantillaId: string) => {
    const plantilla = plantillasActivas.find(p => p.id === plantillaId);
    if (!plantilla) return;
    setDraft(prev => aplicarPlantilla(prev, rowIndex, plantilla, plantillasActivas));
  };

  const handleRemoveEquipo = (rowIndex: number) => setDraft(prev => quitarEquipo(prev, rowIndex, plantillasActivas));
  const handleRemoveBloque = (bloque: MedicionBloque) => setDraft(prev => quitarBloque(prev, bloque, plantillasActivas));

  const handleNuevo = () => {
    if (!window.confirm('¿Descartar este borrador y empezar uno nuevo?')) return;
    setDraft(emptyDraft(displayName));
  };

  const handleGuardar = async () => {
    if (draft.mediciones.length === 0) { toast.error('Selecciona al menos una plantilla en Equipos'); return; }
    setSaving(true);
    const datos = {
      equipos: draft.equipos.filter(e => e.plantilla_id),
      soluciones: draft.soluciones,
      mediciones: draft.mediciones,
      checklist: draft.checklist,
      tecnico: draft.tecnico || null,
      fecha: draft.fecha || null,
      adjuntos: draft.adjuntos,
    };
    // Si el borrador ya está en el historial (se guardó antes o se cargó
    // desde allí), se actualiza esa misma fila — antes cada clic en
    // "Guardar borrador" agregaba un duplicado al historial.
    const tabla = () => supabase.from('certificados_calidad_generados');
    const insertar = () => tabla().insert({ ...datos, created_by: user?.id ?? null }).select('id').maybeSingle();
    let yaExistia = !!draft.id;
    let { data, error } = draft.id
      ? await tabla().update(datos).eq('id', draft.id).select('id').maybeSingle()
      : await insertar();
    // Lo borraron del historial mientras seguía abierto aquí: se guarda de nuevo.
    if (!error && !data && yaExistia) {
      yaExistia = false;
      ({ data, error } = await insertar());
    }
    setSaving(false);
    if (error || !data) { toast.error('Error al guardar borrador: ' + (error?.message ?? 'sin respuesta')); return; }
    setDraft(prev => ({ ...prev, id: data.id }));
    invalidate();
    toast.success(yaExistia ? 'Borrador actualizado en el historial' : 'Borrador guardado en el historial');
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
        <MedicionesEditor bloques={draft.mediciones} plantillas={plantillas} onChange={mediciones => patch({ mediciones })} onRemoveBloque={handleRemoveBloque} />
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
