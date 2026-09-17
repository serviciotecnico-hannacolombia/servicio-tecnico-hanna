import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Save, RotateCcw } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../hooks/useUser';
import { EquiposSelector } from './EquiposSelector';
import { SolucionesPatronPicker } from './SolucionesPatronPicker';
import { MedicionesBox } from './MedicionesBox';
import { ChecklistPanel } from './ChecklistPanel';
import { ArchivosAdjuntosPanel } from './ArchivosAdjuntosPanel';
import { usePlantillas, useSolucionesPatron, useArchivosCertificado, useInvalidateCertificadosCalidad } from '../hooks/useCertificadosCalidad';
import { emptyChecklist } from '../types';
import type { CertificadoGenerado, ChecklistState, EquipoFila } from '../types';

const emptyEquipo = (): EquipoFila => ({ codigo: '', nombre: '', serie: '', sello_calidad: '', plantilla_id: null });

function emptyDraft(tecnico: string): CertificadoGenerado {
  return {
    tipo_doc: 'Factura',
    numero_doc: '',
    nit: '',
    razon_social: '',
    equipos: [emptyEquipo()],
    soluciones: [],
    mediciones: '',
    checklist: emptyChecklist(),
    tecnico,
    fecha: new Date().toISOString().slice(0, 10),
  };
}

// Las plantillas guardan {{CODIGO}} en el título de su tabla (ver
// PlantillasCatalogoTab) — al aplicarlas se reemplaza por el código real de
// factura de esa fila, o por el código de la propia plantilla si esa fila
// todavía no tiene uno escrito.
const applyPlaceholder = (text: string, codigo: string) => text.split('{{CODIGO}}').join(codigo);

interface CrearCertificadoTabProps {
  initialDraft?: CertificadoGenerado | null;
}

export function CrearCertificadoTab({ initialDraft }: CrearCertificadoTabProps) {
  const { user, displayName } = useUser();
  const { data: plantillas = [] } = usePlantillas();
  const { data: solucionesCatalogo = [] } = useSolucionesPatron();
  const { data: archivos = [] } = useArchivosCertificado();
  const invalidate = useInvalidateCertificadosCalidad();

  const [draft, setDraft] = useState<CertificadoGenerado>(() => initialDraft ?? emptyDraft(displayName));
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
  // técnico, no matching automático por texto): copia el bloque de
  // mediciones (con el título sustituido) y pre-marca el checklist.
  const handleSelectPlantilla = (rowIndex: number, plantillaId: string) => {
    const plantilla = plantillasActivas.find(p => p.id === plantillaId);
    if (!plantilla) return;

    setDraft(prev => {
      const equipos = prev.equipos.map((e, i) => i === rowIndex
        ? { ...e, plantilla_id: plantillaId, codigo: e.codigo || plantilla.codigo, nombre: e.nombre || plantilla.nombre || '' }
        : e);
      const codigoReal = equipos[rowIndex].codigo || plantilla.codigo;

      const bloque = [plantilla.mediciones_html, plantilla.notas_generales]
        .filter((t): t is string => !!t)
        .map(t => applyPlaceholder(t, codigoReal))
        .join('\n\n');
      const mediciones = [prev.mediciones, bloque].filter(Boolean).join('\n\n---\n\n');

      const checklist: ChecklistState = {
        ...prev.checklist,
        test_funcional: { ...prev.checklist.test_funcional },
        embalaje: { ...prev.checklist.embalaje },
        control_estetico: { ...prev.checklist.control_estetico },
      };
      plantilla.test_funcional_items.forEach(i => { checklist.test_funcional[i] = true; });
      plantilla.embalaje_items.forEach(i => { checklist.embalaje[i] = true; });
      plantilla.control_estetico_items.forEach(i => { checklist.control_estetico[i] = true; });

      return { ...prev, equipos, mediciones, checklist };
    });
  };

  const handleNuevo = () => {
    if (!window.confirm('¿Descartar este borrador y empezar uno nuevo?')) return;
    setDraft(emptyDraft(displayName));
  };

  const handleGuardar = async () => {
    if (!draft.numero_doc.trim()) { toast.error('Ingresa el número de documento'); return; }
    setSaving(true);
    const { error } = await supabase.from('certificados_calidad_generados').insert({
      tipo_doc: draft.tipo_doc,
      numero_doc: draft.numero_doc,
      nit: draft.nit || null,
      razon_social: draft.razon_social || null,
      equipos: draft.equipos.filter(e => e.codigo.trim()),
      soluciones: draft.soluciones,
      mediciones: draft.mediciones,
      checklist: draft.checklist,
      tecnico: draft.tecnico || null,
      fecha: draft.fecha || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error('Error al guardar borrador: ' + error.message); return; }
    invalidate();
    toast.success('Borrador guardado en el historial');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Definición de Documento">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <Select
            label="Tipo"
            value={draft.tipo_doc}
            onChange={e => patch({ tipo_doc: e.target.value })}
            options={[{ value: 'Factura', label: 'Factura' }, { value: 'Remisión', label: 'Remisión' }]}
          />
          <Input label="Número" value={draft.numero_doc} onChange={e => patch({ numero_doc: e.target.value })} placeholder="Ej. 214559" />
          <Input label="NIT" value={draft.nit} onChange={e => patch({ nit: e.target.value })} />
          <Input label="Razón Social" value={draft.razon_social} onChange={e => patch({ razon_social: e.target.value })} />
        </div>
      </Card>

      <Card title="Equipos">
        <EquiposSelector
          equipos={draft.equipos}
          onChange={equipos => patch({ equipos })}
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
        <MedicionesBox value={draft.mediciones} onChange={mediciones => patch({ mediciones })} />
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
        <ArchivosAdjuntosPanel archivos={archivos} plantillasSeleccionadas={plantillasSeleccionadas} />
      </Card>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={handleNuevo}>
          <RotateCcw size={15} /> Nuevo borrador
        </Button>
        <Button onClick={handleGuardar} disabled={saving}>
          <Save size={15} /> {saving ? 'Guardando...' : 'Guardar borrador'}
        </Button>
      </div>
    </div>
  );
}
