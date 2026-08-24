import { useState } from 'react';
import { VoidForm } from '../components/VoidForm';
import { VoidTable } from '../components/VoidTable';
import { exportToExcel } from '../utils/exportToExcel';
import type { VoidRecord } from '../types';
import { Download } from 'lucide-react';

export function VoidControlPage() {
  const [records, setRecords] = useState<VoidRecord[]>([
    {
      qr_equipo: 'HI76312Ñ121417CMÑMAURITIUSÑConductivity Probe',
      referencia: 'HI76312',
      numero_serie: '121417CM',
      nombre_equipo: 'Conductivity Probe',
      void_blanco: 'CO342500HA',
      void_gris: 'CO16517B',
      documento_referencia: 'OTST-41000',
      observaciones: 'Registro de prueba inicial',
      created_at: new Date().toISOString()
    }
  ]);

  const handleSaveRecord = (newRecord: VoidRecord) => {
    setRecords([newRecord, ...records]);
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
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text, #0f172a)', margin: 0 }}>
            Módulo de Control VOID 2.0
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted, #64748b)', margin: '4px 0 0 0' }}>
            Escaneo rápido de equipos y asignación de sellos de seguridad.
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

      <VoidForm onSave={handleSaveRecord} />
      <VoidTable records={records} />
    </div>
  );
}

export default VoidControlPage;