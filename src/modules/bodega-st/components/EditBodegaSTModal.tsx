import { useState, type FormEvent } from 'react';
import type { RegistroBodegaST, EstadoRestauracion } from '../types';
import { UBICACIONES_BODEGA_ST } from '../types';
import { Save, PackageSearch, PackageCheck } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

interface EditBodegaSTModalProps {
  record: RegistroBodegaST | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedRecord: RegistroBodegaST) => void;
}

const ESTADO_OPTIONS = [
  { value: 'en_diagnostico', label: '🔍 En Diagnóstico' },
  { value: 'en_reparacion', label: '⚙️ En Reparación' },
  { value: 'incompleto_espera_partes', label: '🧩 Incompleto (Espera Accesorios/Partes)' },
  { value: 'restaurado_listo', label: '✅ Restaurado (Listo para Bodega Principal)' },
];

export function EditBodegaSTModal({ record, isOpen, onClose, onUpdate }: EditBodegaSTModalProps) {
  const [prevRecordId, setPrevRecordId] = useState<string | undefined>(undefined);
  const [estado, setEstado] = useState<EstadoRestauracion>('en_diagnostico');

  const [repuestosPedir, setRepuestosPedir] = useState('');
  const [piezasColocar, setPiezasColocar] = useState('');
  const [reparacionesRealizadas, setReparacionesRealizadas] = useState('');
  const [accesoriosFaltantes, setAccesoriosFaltantes] = useState('');

  const [ubicacion, setUbicacion] = useState(UBICACIONES_BODEGA_ST[0]);
  const [observaciones, setObservaciones] = useState('');

  if (record && record.id !== prevRecordId) {
    setPrevRecordId(record.id);
    setEstado(record.estado);

    // Cada etapa guarda su información en columnas distintas; al cargar el
    // registro se reparte de vuelta al campo específico de esa etapa.
    setRepuestosPedir(record.estado === 'en_diagnostico' ? (record.partes_requeridas || '') : '');
    setPiezasColocar(record.estado === 'en_reparacion' ? (record.reparaciones_realizadas || '') : '');
    setReparacionesRealizadas(record.estado === 'incompleto_espera_partes' ? (record.reparaciones_realizadas || '') : '');
    setAccesoriosFaltantes(record.estado === 'incompleto_espera_partes' ? (record.partes_requeridas || '') : '');

    setUbicacion(record.ubicacion_estante || UBICACIONES_BODEGA_ST[0]);
    setObservaciones(record.observaciones || '');
  }

  if (!record) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...record,
      estado,
      partes_requeridas: estado === 'incompleto_espera_partes' ? accesoriosFaltantes : (estado === 'en_diagnostico' ? repuestosPedir : ''),
      reparaciones_realizadas: estado === 'en_reparacion' ? piezasColocar : (estado === 'incompleto_espera_partes' ? reparacionesRealizadas : ''),
      ubicacion_estante: (estado === 'restaurado_listo' || estado === 'incompleto_espera_partes') ? undefined : ubicacion,
      bodega_destino: estado === 'restaurado_listo' ? 'Bodega Principal' : (estado === 'incompleto_espera_partes' ? 'Bodega Incompletos' : undefined),
      observaciones
    });
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={`Actualizar Restauración · ${record.nombre_equipo} (${record.numero_serie})`} width={560}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Estado Actual" value={estado} onChange={e => setEstado(e.target.value as EstadoRestauracion)} options={ESTADO_OPTIONS} />

        {estado === 'en_diagnostico' && (
          <Input label="Repuestos a Pedir / Diagnóstico Inicial" value={repuestosPedir} onChange={e => setRepuestosPedir(e.target.value)} placeholder="Ej: Solicitar tarjeta lógica y pantalla LCD" />
        )}

        {estado === 'en_reparacion' && (
          <Input label="Repuestos o Piezas a Colocar" value={piezasColocar} onChange={e => setPiezasColocar(e.target.value)} placeholder="Ej: Instalación de sensor de pH y batería nueva" />
        )}

        {estado === 'incompleto_espera_partes' && (
          <>
            <Input label="Reparaciones Realizadas" value={reparacionesRealizadas} onChange={e => setReparacionesRealizadas(e.target.value)} placeholder="Ej: Limpieza interna y soldadura de conector" />
            <Input label="Accesorios / Partes Faltantes" value={accesoriosFaltantes} onChange={e => setAccesoriosFaltantes(e.target.value)} placeholder="Ej: Falta tapa trasera y manual" />
          </>
        )}

        {estado === 'incompleto_espera_partes' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--red-bg, rgba(239,68,68,.08))', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: 12, fontSize: '0.85rem', color: 'var(--text)' }}>
            <PackageSearch size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
            <span>Este equipo se moverá automáticamente a <strong>Bodega Incompletos</strong> mientras se completan los accesorios/partes.</span>
          </div>
        ) : estado === 'restaurado_listo' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 'var(--radius-sm)', padding: 12, fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>
            <PackageCheck size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
            <span>Este equipo se moverá automáticamente a <strong>Bodega Principal</strong>.</span>
          </div>
        ) : (
          <Select label="Ubicación en Bodega ST" value={ubicacion} onChange={e => setUbicacion(e.target.value)} options={UBICACIONES_BODEGA_ST.map(loc => ({ value: loc, label: loc }))} />
        )}

        <Input label="Observaciones" value={observaciones} onChange={e => setObservaciones(e.target.value)} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit"><Save size={15} /> Guardar Cambios</Button>
        </div>
      </form>
    </Modal>
  );
}
