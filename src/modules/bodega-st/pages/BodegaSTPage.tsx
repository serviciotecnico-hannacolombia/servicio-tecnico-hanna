import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BodegaSTForm } from '../components/BodegaSTForm';
import { BodegaSTTable } from '../components/BodegaSTTable';
import { EditBodegaSTModal } from '../components/EditBodegaSTModal';
import {exportToExcel } from '../../void/utils/exportToExcel';
import { Header } from '../../../components/layout/Header';
import { Button } from '../../../components/ui/Button';
import { StatCard } from '../../../components/ui/StatCard';
import { Modal } from '../../../components/ui/Modal';
import { AuditHistory } from '../../../components/ui/AuditHistory';
import { supabase, fetchAllRows } from '../../../lib/supabase';
import type { BodegaSTAudit, RegistroBodegaST } from '../types';
import { Download } from 'lucide-react';

function useBodegaSTRegistros() {
  return useQuery({
    queryKey: ['bodega_st_registros'],
    queryFn: () => fetchAllRows<RegistroBodegaST>('bodega_st_registros', q => q.order('created_at', { ascending: false })),
  });
}

function useBodegaSTAuditoria() {
  return useQuery({
    queryKey: ['bodega_st_registros_auditoria'],
    queryFn: () => fetchAllRows<BodegaSTAudit>('bodega_st_registros_auditoria', q => q.order('created_at', { ascending: false })),
  });
}

export function BodegaSTPage() {
  const qc = useQueryClient();
  const { data: visibleRecords = [] } = useBodegaSTRegistros();
  const { data: audits = [] } = useBodegaSTAuditoria();

  const [selectedRecord, setSelectedRecord] = useState<RegistroBodegaST | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletedSnapshot, setDeletedSnapshot] = useState<RegistroBodegaST | null>(null);

  // Métricas / KPIs
  const totalDiagnostico = visibleRecords.filter(r => r.estado === 'en_diagnostico').length;
  const totalReparacion = visibleRecords.filter(r => r.estado === 'en_reparacion').length;
  const totalIncompletos = visibleRecords.filter(r => r.estado === 'incompleto_espera_partes').length;
  const totalListos = visibleRecords.filter(r => r.estado === 'restaurado_listo').length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['bodega_st_registros'] });
    qc.invalidateQueries({ queryKey: ['bodega_st_registros_auditoria'] });
  };

  const handleSaveRecord = async (newRecord: RegistroBodegaST) => {
    const { error } = await supabase.from('bodega_st_registros').insert({
      registro_id: `BST-${Date.now().toString(36).toUpperCase()}`,
      qr_equipo: newRecord.qr_equipo,
      referencia: newRecord.referencia,
      numero_serie: newRecord.numero_serie,
      nombre_equipo: newRecord.nombre_equipo,
      estado: newRecord.estado,
      partes_requeridas: newRecord.partes_requeridas || null,
      reparaciones_realizadas: newRecord.reparaciones_realizadas || null,
      tecnico_responsable: newRecord.tecnico_responsable || null,
      ubicacion_estante: newRecord.ubicacion_estante || null,
      bodega_destino: newRecord.bodega_destino || null,
      observaciones: newRecord.observaciones || null,
    });
    if (error) { toast.error('Error al guardar: ' + error.message); return; }
    invalidate();
    toast.success('Registro de Bodega ST guardado');
  };

  const handleUpdate = async (updated: RegistroBodegaST) => {
    if (!updated.id) return;
    const { error } = await supabase.from('bodega_st_registros').update({
      estado: updated.estado,
      partes_requeridas: updated.partes_requeridas || null,
      reparaciones_realizadas: updated.reparaciones_realizadas || null,
      tecnico_responsable: updated.tecnico_responsable || null,
      ubicacion_estante: updated.ubicacion_estante || null,
      bodega_destino: updated.bodega_destino || null,
      observaciones: updated.observaciones || null,
      updated_at: new Date().toISOString(),
    }).eq('id', updated.id);
    if (error) { toast.error('Error al actualizar: ' + error.message); return; }
    invalidate();
    toast.success('Registro de Bodega ST actualizado');
    setIsModalOpen(false);
  };

  const handleDelete = async (record: RegistroBodegaST) => {
    if (!record.id) return;
    if (!window.confirm(`¿Eliminar el registro de ${record.numero_serie}? Esta acción quedará en el historial.`)) return;
    const { error } = await supabase.from('bodega_st_registros').delete().eq('id', record.id);
    if (error) { toast.error('Error al eliminar: ' + error.message); return; }
    invalidate();
    toast.success('Registro de Bodega ST eliminado');
  };

  const handleExport = () => {
    const headersMap = {
        referencia: 'Referencia',
        numero_serie: 'Número de Serie',
        nombre_equipo: 'Equipo',
        estado: 'Estado Actual',
        partes_requeridas: 'Accesorios Faltantes',
        reparaciones_realizadas: 'Reparaciones',
        ubicacion_estante: 'Ubicación en Estante',
        observaciones: 'Observaciones',
        created_at: 'Fecha de Ingreso'
    };

    exportToExcel(visibleRecords, headersMap, 'Reporte_Bodega_ST', 'Restauración Bodega ST');
  }

  return (
    <div>
      <Header
        title="Bodega ST · Restauración y Equipos Incompletos"
        subtitle="Gestión de diagnósticos, repuestos requeridos y preparación de equipos para retorno a bodega principal."
        actions={
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={14} /> Exportar Excel/CSV
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <StatCard value={totalDiagnostico} label="Diagnóstico" sublabel="pendiente de revisar" color="yellow" />
        <StatCard value={totalReparacion} label="Reparación" sublabel="en proceso" color="accent" />
        <StatCard value={totalIncompletos} label="Incompletos" sublabel="esperando accesorios" color="red" />
        <StatCard value={totalListos} label="Rest. Listos" sublabel="listos para bodega" color="green" />
      </div>

      <BodegaSTForm onSave={handleSaveRecord} />
      <BodegaSTTable records={visibleRecords} onEdit={(rec) => { setSelectedRecord(rec); setIsModalOpen(true); }} onDelete={handleDelete} />

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

      <EditBodegaSTModal
        isOpen={isModalOpen}
        record={selectedRecord}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleUpdate}
      />

      <Modal open={!!deletedSnapshot} onClose={() => setDeletedSnapshot(null)} title={`Registro eliminado · ${deletedSnapshot?.registro_id || deletedSnapshot?.id || ''}`} width={600}>
        <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--surface2)', padding: 14, borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
          {JSON.stringify(deletedSnapshot, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}

export default BodegaSTPage;
