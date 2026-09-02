import { useState, type FormEvent } from 'react';
import type { RegistroBodegaST, EstadoRestauracion } from '../types';
import { UBICACIONES_BODEGA_ST, BODEGAS_DESTINO } from '../types';
import { Save } from 'lucide-react';
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
  const [prevRecordId, setPrevRecordId] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoRestauracion>('en_diagnostico');
  const [partesRequeridas, setPartesRequeridas] = useState('');
  const [reparaciones, setReparaciones] = useState('');
  const [ubicacion, setUbicacion] = useState(UBICACIONES_BODEGA_ST[0]);
  const [bodegaDestino, setBodegaDestino] = useState(BODEGAS_DESTINO[0]);
  const [observaciones, setObservaciones] = useState('');

  if (record && record.numero_serie !== prevRecordId) {
    setPrevRecordId(record.numero_serie);
    setEstado(record.estado);
    setPartesRequeridas(record.partes_requeridas || '');
    setReparaciones(record.reparaciones_realizadas || '');
    setUbicacion(record.ubicacion_estante || UBICACIONES_BODEGA_ST[0]);
    setBodegaDestino(record.bodega_destino || BODEGAS_DESTINO[0]);
    setObservaciones(record.observaciones || '');
  }

  if (!record) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...record,
      estado,
      partes_requeridas: partesRequeridas,
      reparaciones_realizadas: reparaciones,
      ubicacion_estante: ubicacion,
      bodega_destino: estado === 'restaurado_listo' ? bodegaDestino : undefined,
      observaciones
    });
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={`Actualizar Restauración · ${record.nombre_equipo} (${record.numero_serie})`} width={560}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Estado Actual" value={estado} onChange={e => setEstado(e.target.value as EstadoRestauracion)} options={ESTADO_OPTIONS} />
        <Input label="Partes / Accesorios Faltantes" value={partesRequeridas} onChange={e => setPartesRequeridas(e.target.value)} />
        <Input label="Reparaciones Realizadas" value={reparaciones} onChange={e => setReparaciones(e.target.value)} />
        <Select label="Ubicación en Bodega ST" value={ubicacion} onChange={e => setUbicacion(e.target.value)} options={UBICACIONES_BODEGA_ST.map(loc => ({ value: loc, label: loc }))} />

        {estado === 'restaurado_listo' && (
          <Select
            label="📦 Bodega Destino"
            value={bodegaDestino}
            onChange={e => setBodegaDestino(e.target.value)}
            options={BODEGAS_DESTINO.map(b => ({ value: b, label: b }))}
            style={{ border: '1px solid var(--green)', background: 'var(--green-bg)' }}
          />
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
