import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { supabase, fetchAllRows } from '../../../lib/supabase';
import type { VoidAudit, VoidRecord } from '../types';
import { Download } from 'lucide-react';

const LIBROS_VOID = [
  'Calibración', 'Bogotá', 'Cali', 'Medellín', 'Bucaramanga',
  'Pereira', 'CC No requerido', 'Sin Sistema', 'Reenvios Logistica',
];

function useVoidRegistros() {
  return useQuery({
    queryKey: ['void_registros'],
    queryFn: () => fetchAllRows<VoidRecord>('void_registros', q => q.order('created_at', { ascending: false })),
  });
}

function useVoidAuditoria() {
  return useQuery({
    queryKey: ['void_registros_auditoria'],
    queryFn: () => fetchAllRows<VoidAudit>('void_registros_auditoria', q => q.order('created_at', { ascending: false })),
  });
}

export function VoidControlPage() {
  const qc = useQueryClient();
  const { data: records = [] } = useVoidRegistros();
  const { data: audits = [] } = useVoidAuditoria();
  const [selected, setSelected] = useState<VoidRecord | null>(null);
  const [deletedSnapshot, setDeletedSnapshot] = useState<VoidRecord | null>(null);
  const [libroActivo, setLibroActivo] = useState(LIBROS_VOID[0]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['void_registros'] });
    qc.invalidateQueries({ queryKey: ['void_registros_auditoria'] });
  };

  const handleSaveRecord = async (newRecord: VoidRecord) => {
    const { error } = await supabase.from('void_registros').insert({
      registro_id: newRecord.registro_id || `VOID-${Date.now().toString(36).toUpperCase()}`,
      qr_equipo: newRecord.qr_equipo,
      libro: newRecord.libro || libroActivo,
      referencia: newRecord.referencia || null,
      numero_serie: newRecord.numero_serie || null,
      nombre_equipo: newRecord.nombre_equipo || null,
      void_blanco: newRecord.void_blanco,
      void_gris: newRecord.void_gris,
      documento_referencia: newRecord.documento_referencia || null,
      observaciones: newRecord.observaciones || null,
    });
    if (error) { toast.error('Error al guardar: ' + error.message); return; }
    invalidate();
    toast.success('Registro VOID guardado');
  };

  const handleUpdate = async (record: VoidRecord) => {
    if (!record.id) return;
    const { error } = await supabase.from('void_registros').update({
      referencia: record.referencia || null,
      numero_serie: record.numero_serie || null,
      nombre_equipo: record.nombre_equipo || null,
      void_blanco: record.void_blanco,
      void_gris: record.void_gris,
      documento_referencia: record.documento_referencia || null,
      observaciones: record.observaciones || null,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id);
    if (error) { toast.error('Error al actualizar: ' + error.message); return; }
    invalidate();
    toast.success('Registro VOID actualizado');
    setSelected(null);
  };

  const handleDelete = async (record: VoidRecord) => {
    if (!record.id) return;
    if (!window.confirm(`¿Eliminar el registro de ${record.numero_serie || record.referencia}? Esta acción quedará en el historial.`)) return;
    const { error } = await supabase.from('void_registros').delete().eq('id', record.id);
    if (error) { toast.error('Error al eliminar: ' + error.message); return; }
    invalidate();
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
