import { useState } from 'react';
import { toast } from 'sonner';
import { VoidForm } from '../components/VoidForm';
import { VoidTable } from '../components/VoidTable';
import { VoidSearchPanel } from '../components/VoidSearchPanel';
import { EditVoidModal } from '../components/EditVoidModal';
import { exportToExcel } from '../utils/exportToExcel';
import { Header } from '../../../components/layout/Header';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { AuditHistory } from '../../../components/ui/AuditHistory';
import type { VoidAudit, VoidRecord } from '../types';
import { Download } from 'lucide-react';

const LIBROS_VOID = [
  'Calibración', 'Bogotá', 'Cali', 'Medellín', 'Bucaramanga',
  'Pereira', 'CC No requerido', 'Sin Sistema', 'Reenvios Logistica',
];

export function VoidControlPage() {
  const [records, setRecords] = useState<VoidRecord[]>([]);
  const [audits, setAudits] = useState<VoidAudit[]>([]);
  const [selected, setSelected] = useState<VoidRecord | null>(null);
  const [deletedSnapshot, setDeletedSnapshot] = useState<VoidRecord | null>(null);
  const [libroActivo, setLibroActivo] = useState(LIBROS_VOID[0]);

  const addAudit = (record: VoidRecord, accion: VoidAudit['accion'], previous: VoidRecord | null, next: VoidRecord | null) => {
    setAudits(previousAudits => [{ id: crypto.randomUUID(), void_id: record.id ?? null, accion, datos_anteriores: previous, datos_nuevos: next, usuario_id: null, created_at: new Date().toISOString() }, ...previousAudits]);
  };

  const handleSaveRecord = (newRecord: VoidRecord) => {
    const record = { ...newRecord, id: crypto.randomUUID(), registro_id: newRecord.registro_id || `VOID-${Date.now().toString(36).toUpperCase()}`, libro: newRecord.libro || libroActivo, created_at: new Date().toISOString() };
    setRecords(previous => [record, ...previous]);
    addAudit(record, 'INSERT', null, record);
    toast.success('Registro VOID guardado');
  };

  const handleUpdate = (record: VoidRecord) => {
    const previous = records.find(item => item.id === record.id);
    if (!previous) return;
    const updated = { ...record, updated_at: new Date().toISOString() };
    setRecords(items => items.map(item => item.id === record.id ? updated : item));
    addAudit(updated, 'UPDATE', previous, updated);
    toast.success('Registro VOID actualizado'); setSelected(null);
  };

  const handleDelete = (record: VoidRecord) => {
    if (!window.confirm(`¿Eliminar el registro de ${record.numero_serie || record.referencia}? Esta acción quedará en el historial.`)) return;
    setRecords(items => items.filter(item => item.id !== record.id));
    addAudit(record, 'DELETE', record, null);
    toast.success('Registro VOID eliminado');
  };

  const handleExport = () => {
    const headersMap = {
        referencia: 'Referencia',
        numero_serie: 'Número de Serie',
        nombre_equipo: 'Equipo',
        void_blanco: 'VOID Blanco',
        void_gris: 'VOID Gris',
        documento_referencia: 'Factura / OTST',
        observaciones: 'Observaciones',
        created_at: 'Fecha de Registro'
    };

   exportToExcel(records, headersMap, 'Reporte_Control_VOID', 'Control de Sellos VOID');
  };

  return (
    <div>
      <Header
        title="Módulo de Control VOID 2.0"
        subtitle="Escaneo rápido de equipos y asignación de sellos de seguridad."
        actions={
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={14} /> Exportar Excel/CSV
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {LIBROS_VOID.map(libro => (
          <button
            key={libro}
            onClick={() => setLibroActivo(libro)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontWeight: libroActivo === libro ? 700 : 500,
              border: `1px solid ${libroActivo === libro ? 'var(--accent)' : 'var(--border)'}`,
              background: libroActivo === libro ? 'var(--accent)' : 'var(--surface)',
              color: libroActivo === libro ? '#fff' : 'var(--muted)',
              transition: 'all .15s',
            }}
          >
            {libro}
          </button>
        ))}
      </div>

      <VoidSearchPanel records={records} onSelectRecord={setSelected} />
      <VoidForm onSave={record => handleSaveRecord(record)} />
      <VoidTable records={records.filter(record => record.libro === libroActivo)} onEdit={setSelected} onDelete={handleDelete} />

      <AuditHistory
        audits={audits.map(a => ({
          id: a.id,
          accion: a.accion,
          registro_id: a.datos_nuevos?.registro_id || a.datos_anteriores?.registro_id,
          nombre_serie: a.datos_nuevos?.numero_serie || a.datos_anteriores?.numero_serie,
          referencia: a.datos_nuevos?.referencia || a.datos_anteriores?.referencia,
          nombre_equipo: a.datos_nuevos?.nombre_equipo || a.datos_anteriores?.nombre_equipo,
          created_at: a.created_at
        }))}
        onViewDeleted={(audit) => {
          const fullAudit = audits.find(a => a.id === audit.id);
          if (fullAudit?.datos_anteriores) {
            setDeletedSnapshot(fullAudit.datos_anteriores);
          }
        }}
        title="Historial de cambios"
      />

      <EditVoidModal record={selected} onClose={() => setSelected(null)} onSave={handleUpdate} />

      <Modal open={!!deletedSnapshot} onClose={() => setDeletedSnapshot(null)} title={`Registro eliminado · ${deletedSnapshot?.registro_id || deletedSnapshot?.id || ''}`} width={600}>
        <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--surface2)', padding: 14, borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
          {JSON.stringify(deletedSnapshot, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}

export default VoidControlPage;
