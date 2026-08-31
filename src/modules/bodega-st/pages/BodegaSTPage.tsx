import { useState } from 'react';
import { toast } from 'sonner';
import { BodegaSTForm } from '../components/BodegaSTForm';
import { BodegaSTTable } from '../components/BodegaSTTable';
import { EditBodegaSTModal } from '../components/EditBodegaSTModal';
import {exportToExcel } from '../../void/utils/exportToExcel';
import { AuditHistory } from '../../../components/ui/AuditHistory';
import type { BodegaSTAudit, RegistroBodegaST } from '../types';
import { Clock, Wrench, AlertTriangle, CheckCircle2, Download } from 'lucide-react';

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
    <div style={{ maxWidth: 1300, margin: '0 auto' }}>
      <header style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text, #0f172a)', margin: 0 }}>
            Bodega ST · Restauración y Equipos Incompletos
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted, #64748b)', margin: '4px 0 0 0' }}>
            Gestión de diagnósticos, repuestos requeridos y preparación de equipos para retorno a bodega principal.
          </p>
        </div>

        <button
          onClick={handleExport}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Download size={15} /> Exportar Excel/CSV
        </button>
      </header>

      {/* Tarjetas de Métricas / KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#fef3c7', padding: 10, borderRadius: 8, color: '#b45309' }}><Clock size={20} /></div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>DIAGNÓSTICO</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{totalDiagnostico}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#e0f2fe', padding: 10, borderRadius: 8, color: '#0369a1' }}><Wrench size={20} /></div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>REPARACIÓN</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{totalReparacion}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#ffedd5', padding: 10, borderRadius: 8, color: '#c2410c' }}><AlertTriangle size={20} /></div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>INCOMPLETOS</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{totalIncompletos}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#dcfce7', padding: 10, borderRadius: 8, color: '#15803d' }}><CheckCircle2 size={20} /></div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>REST. LISTOS</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{totalListos}</div>
          </div>
        </div>
      </div>

      <BodegaSTForm onSave={handleSaveRecord} />
      <BodegaSTTable records={visibleRecords} onEdit={(rec) => { setSelectedRecord(rec); setIsModalOpen(true); }} onDelete={handleDelete} />

      <EditBodegaSTModal
        isOpen={isModalOpen}
        record={selectedRecord}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleUpdate}
      />
      <section style={{ marginTop: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
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
      </section>
      {deletedSnapshot && <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(600px, calc(100% - 32px))' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>Registro eliminado · {deletedSnapshot.registro_id || deletedSnapshot.id}</h3><button onClick={() => setDeletedSnapshot(null)} style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 20 }}>×</button></div><pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 14, borderRadius: 8, fontSize: 12, marginTop: 16 }}>{JSON.stringify(deletedSnapshot, null, 2)}</pre></div></div>}
    </div>
  );
}

export default BodegaSTPage;