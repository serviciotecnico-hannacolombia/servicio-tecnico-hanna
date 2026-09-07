import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { VoidForm } from '../components/VoidForm';
import { VoidTable } from '../components/VoidTable';
import { VoidSearchPanel } from '../components/VoidSearchPanel';
import { EditVoidModal } from '../components/EditVoidModal';
import { ImportVoidExcelModal } from '../components/ImportVoidExcelModal';
import { MoveLibroModal } from '../components/MoveLibroModal';
import { exportToExcel } from '../utils/exportToExcel';
import { Header } from '../../../components/layout/Header';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { AuditHistory } from '../../../components/ui/AuditHistory';
import { supabase, fetchAllRows } from '../../../lib/supabase';
import type { VoidAudit, VoidRecord } from '../types';
import { Download, Upload } from 'lucide-react';

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
  const [importOpen, setImportOpen] = useState(false);
  const [moving, setMoving] = useState<VoidRecord | null>(null);

  const existingVoidBlancos = useMemo(
    () => new Set(records.map(r => r.void_blanco?.trim().toUpperCase()).filter(Boolean) as string[]),
    [records]
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['void_registros'] });
    qc.invalidateQueries({ queryKey: ['void_registros_auditoria'] });
  };

  // El VOID Blanco es el sello físico: no pueden existir dos registros con
  // el mismo código (igual que validaba la macro original con CountIf).
  const isDuplicateVoidBlanco = (voidBlanco: string, excludeId?: string) => {
    const key = voidBlanco.trim().toUpperCase();
    return records.some(r => r.id !== excludeId && r.void_blanco?.trim().toUpperCase() === key);
  };

  // code 23505 = unique_violation (respaldo por si dos usuarios registran el
  // mismo VOID Blanco casi al mismo tiempo, antes de que la validación local se entere).
  const describeVoidError = (error: { code?: string; message: string }) =>
    error.code === '23505' ? 'Ese VOID Blanco ya fue registrado por otra persona justo ahora' : error.message;

  const handleSaveRecord = async (newRecord: VoidRecord) => {
    if (isDuplicateVoidBlanco(newRecord.void_blanco)) {
      toast.error(`El VOID Blanco "${newRecord.void_blanco}" ya está registrado`);
      return;
    }
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
    if (error) { toast.error('Error al guardar: ' + describeVoidError(error)); return; }
    invalidate();
    toast.success('Registro VOID guardado');
  };

  const handleUpdate = async (record: VoidRecord) => {
    if (!record.id) return;
    if (isDuplicateVoidBlanco(record.void_blanco, record.id)) {
      toast.error(`El VOID Blanco "${record.void_blanco}" ya está registrado en otro equipo`);
      return;
    }
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
    if (error) { toast.error('Error al actualizar: ' + describeVoidError(error)); return; }
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

  const handleMoveLibro = async (record: VoidRecord, nuevoLibro: string) => {
    if (!record.id) return;
    const { error } = await supabase.from('void_registros').update({
      libro: nuevoLibro,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id);
    if (error) { toast.error('Error al mover el registro: ' + error.message); return; }
    invalidate();
    toast.success(`Registro movido a "${nuevoLibro}"`);
  };

  const handleImportRecords = async (newRecords: VoidRecord[]): Promise<{ inserted: number; omitidos: number }> => {
    const seen = new Set(existingVoidBlancos);
    const toInsert: Record<string, unknown>[] = [];
    let omitidos = 0;

    newRecords.forEach((rec, i) => {
      const key = rec.void_blanco.trim().toUpperCase();
      if (!key || seen.has(key)) { omitidos++; return; }
      seen.add(key);
      toInsert.push({
        registro_id: `VOID-${Date.now().toString(36).toUpperCase()}-${i}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        qr_equipo: rec.qr_equipo,
        libro: rec.libro || libroActivo,
        referencia: rec.referencia || null,
        numero_serie: rec.numero_serie || null,
        nombre_equipo: rec.nombre_equipo || null,
        void_blanco: rec.void_blanco,
        void_gris: rec.void_gris,
        documento_referencia: rec.documento_referencia || null,
        observaciones: rec.observaciones || null,
        ...(rec.created_at ? { created_at: rec.created_at } : {}),
      });
    });

    const CHUNK = 300;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const { error } = await supabase.from('void_registros').insert(chunk);
      if (error) { toast.error('Error importando lote: ' + error.message); break; }
      inserted += chunk.length;
    }

    invalidate();
    toast.success(`Importación completada: ${inserted} registrados, ${omitidos} omitidos`);
    return { inserted, omitidos };
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
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
              <Upload size={14} /> Importar Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download size={14} /> Exportar Excel/CSV
            </Button>
          </div>
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
      <VoidTable records={records.filter(record => record.libro === libroActivo)} onEdit={setSelected} onDelete={handleDelete} onMove={setMoving} />

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

      <MoveLibroModal record={moving} libros={LIBROS_VOID} onClose={() => setMoving(null)} onMove={handleMoveLibro} />

      <ImportVoidExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        libros={LIBROS_VOID}
        libroActivo={libroActivo}
        existingVoidBlancos={existingVoidBlancos}
        onImport={handleImportRecords}
      />

      <Modal open={!!deletedSnapshot} onClose={() => setDeletedSnapshot(null)} title={`Registro eliminado · ${deletedSnapshot?.registro_id || deletedSnapshot?.id || ''}`} width={600}>
        <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--surface2)', padding: 14, borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
          {JSON.stringify(deletedSnapshot, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}

export default VoidControlPage;
