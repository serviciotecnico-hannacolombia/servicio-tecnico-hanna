import { useState } from 'react';
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
import type { BodegaSTAudit, RegistroBodegaST } from '../types';
import { Download } from 'lucide-react';

export function BodegaSTPage() {
  const [visibleRecords, setVisibleRecords] = useState<RegistroBodegaST[]>([]);
  const [audits, setAudits] = useState<BodegaSTAudit[]>([]);

  const [selectedRecord, setSelectedRecord] = useState<RegistroBodegaST | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletedSnapshot, setDeletedSnapshot] = useState<RegistroBodegaST | null>(null);

  // Métricas / KPIs
  const totalDiagnostico = visibleRecords.filter(r => r.estado === 'en_diagnostico').length;
  const totalReparacion = visibleRecords.filter(r => r.estado === 'en_reparacion').length;
  const totalIncompletos = visibleRecords.filter(r => r.estado === 'incompleto_espera_partes').length;
  const totalListos = visibleRecords.filter(r => r.estado === 'restaurado_listo').length;

  const addAudit = (record: RegistroBodegaST, accion: BodegaSTAudit['accion'], previous: RegistroBodegaST | null, next: RegistroBodegaST | null) => {
    setAudits(previousAudits => [{ id: crypto.randomUUID(), bodega_st_id: record.id ?? null, accion, datos_anteriores: previous, datos_nuevos: next, usuario_id: null, created_at: new Date().toISOString() }, ...previousAudits]);
  };

  const handleSaveRecord = (newRecord: RegistroBodegaST) => {
    const record = { ...newRecord, id: crypto.randomUUID(), registro_id: `BST-${Date.now().toString(36).toUpperCase()}`, created_at: new Date().toISOString() };
    setVisibleRecords(previous => [record, ...previous]);
    addAudit(record, 'INSERT', null, record);
    toast.success('Registro de Bodega ST guardado');
  };

  const handleUpdate = (updated: RegistroBodegaST) => {
    const previous = visibleRecords.find(item => item.id === updated.id);
    if (!previous) return;
    const record = { ...updated, updated_at: new Date().toISOString() };
    setVisibleRecords(items => items.map(item => item.id === updated.id ? record : item));
    addAudit(record, 'UPDATE', previous, record);
    toast.success('Registro de Bodega ST actualizado'); setIsModalOpen(false);
  };

  const handleDelete = (record: RegistroBodegaST) => {
    if (!window.confirm(`¿Eliminar el registro de ${record.numero_serie}? Esta acción quedará en el historial.`)) return;
    setVisibleRecords(items => items.filter(item => item.id !== record.id));
    addAudit(record, 'DELETE', record, null);
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
