import { useState } from 'react';
import { BodegaSTForm } from '../components/BodegaSTForm';
import { BodegaSTTable } from '../components/BodegaSTTable';
import { EditBodegaSTModal } from '../components/EditBodegaSTModal';
import {exportToExcel } from '../../void/utils/exportToExcel';
import type { RegistroBodegaST } from '../types';
import { Clock, Wrench, AlertTriangle, CheckCircle2, Download } from 'lucide-react';

export function BodegaSTPage() {
  const [records, setRecords] = useState<RegistroBodegaST[]>([
    {
      qr_equipo: 'HI98194Ñ1847120ÑMAURITIUSÑMultiparametro Portatil',
      referencia: 'HI98194',
      numero_serie: '1847120',
      nombre_equipo: 'Multiparametro Portatil',
      estado: 'incompleto_espera_partes',
      partes_requeridas: 'Electrodo pH HI7698194-1',
      reparaciones_realizadas: 'Limpieza de conector DIN y cambio de sellos',
      ubicacion_estante: 'Estante A1 - Incompletos',
      observaciones: 'Equipo en perfecto estado electrónico',
      created_at: new Date().toISOString()
    }
  ]);

  const [selectedRecord, setSelectedRecord] = useState<RegistroBodegaST | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Métricas / KPIs
  const totalDiagnostico = records.filter(r => r.estado === 'en_diagnostico').length;
  const totalReparacion = records.filter(r => r.estado === 'en_reparacion').length;
  const totalIncompletos = records.filter(r => r.estado === 'incompleto_espera_partes').length;
  const totalListos = records.filter(r => r.estado === 'restaurado_listo').length;

  const handleSaveRecord = (newRecord: RegistroBodegaST) => {
    setRecords([newRecord, ...records]);
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

    exportToExcel(records, headersMap, 'Reporte_Bodega_ST', 'Restauración Bodega ST');
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
      <BodegaSTTable records={records} onEdit={(rec) => { setSelectedRecord(rec); setIsModalOpen(true); }} />

      <EditBodegaSTModal
        isOpen={isModalOpen}
        record={selectedRecord}
        onClose={() => setIsModalOpen(false)}
        onUpdate={(updated) => setRecords(records.map(r => r.numero_serie === updated.numero_serie ? updated : r))}
      />
    </div>
  );
}

export default BodegaSTPage;