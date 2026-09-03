import { useState } from 'react';
import type { RegistroBodegaST, EstadoRestauracion } from '../types';
import { Search, Wrench, AlertTriangle, CheckCircle, Clock, Pencil, Trash2 } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Table, type Column } from '../../../components/ui/Table';

interface BodegaSTTableProps {
  records: RegistroBodegaST[];
  onEdit: (record: RegistroBodegaST) => void;
  onDelete: (record: RegistroBodegaST) => void;
}

const truncateText = (text: string | undefined | null, maxLength = 30) => {
  if (!text) return '—';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const ESTADO_BADGE: Record<EstadoRestauracion, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  en_diagnostico:            { label: 'Diagnóstico',      icon: Clock,         color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
  en_reparacion:             { label: 'Reparación',       icon: Wrench,        color: 'var(--accent)', bg: 'var(--accent-bg)' },
  incompleto_espera_partes:  { label: 'Falta Accesorios', icon: AlertTriangle, color: 'var(--red)',    bg: 'var(--red-bg)' },
  restaurado_listo:          { label: 'Listo',            icon: CheckCircle,   color: 'var(--green)',  bg: 'var(--green-bg)' },
};

function EstadoBadge({ estado }: { estado: EstadoRestauracion }) {
  const cfg = ESTADO_BADGE[estado];
  const Icon = cfg.icon;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 9px', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

export function BodegaSTTable({ records, onEdit, onDelete }: BodegaSTTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter(rec => {
    const term = searchTerm.toLowerCase();
    return (
      rec.nombre_equipo?.toLowerCase().includes(term) ||
      rec.numero_serie?.toLowerCase().includes(term) ||
      rec.referencia?.toLowerCase().includes(term) ||
      rec.partes_requeridas?.toLowerCase().includes(term) ||
      rec.ubicacion_estante?.toLowerCase().includes(term) ||
      rec.observaciones?.toLowerCase().includes(term)
    );
  });

  const columns: Column<RegistroBodegaST>[] = [
    { key: 'id', header: 'ID', width: '110px', render: r => <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--muted)' }}>{r.registro_id || r.id || '—'}</span> },
    {
      key: 'equipo', header: 'Equipo / Ref',
      render: r => (
        <>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{r.nombre_equipo}</span>
          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{r.referencia}</span>
        </>
      ),
    },
    { key: 'serie', header: 'Serie', render: r => <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{r.numero_serie}</span> },
    { key: 'estado', header: 'Estado', render: r => <EstadoBadge estado={r.estado} /> },
    { key: 'partes', header: 'Detalles / Partes', render: r => <span style={{ color: 'var(--yellow)', fontWeight: 500 }} title={r.partes_requeridas || ''}>{truncateText(r.partes_requeridas)}</span> },
    { key: 'reparaciones', header: 'Reparaciones', render: r => <span style={{ color: 'var(--muted)' }} title={r.reparaciones_realizadas || ''}>{truncateText(r.reparaciones_realizadas)}</span> },
    {
      key: 'ubicacion', header: 'Ubicación',
      render: r => r.estado === 'restaurado_listo'
        ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>📦 {r.bodega_destino || 'Bodega Principal'}</span>
        : <span>{r.ubicacion_estante || '—'}</span>,
    },
    { key: 'obs', header: 'Observaciones', render: r => <span style={{ color: 'var(--muted)' }} title={r.observaciones || ''}>{truncateText(r.observaciones)}</span> },
    {
      key: 'acciones', header: 'Acción', width: '90px', align: 'center',
      render: r => (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          <button title="Editar" onClick={() => onEdit(r)} style={{ border: 'none', background: 'var(--accent-bg)', color: 'var(--accent)', padding: 7, borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}><Pencil size={14} /></button>
          <button title="Eliminar" onClick={() => onDelete(r)} style={{ border: 'none', background: 'var(--red-bg)', color: 'var(--red)', padding: 7, borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <Card bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
          Inventario en Bodega ST <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({records.length})</span>
        </h3>
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por serie, modelo u observaciones..."
            style={{ width: '100%', padding: '7px 12px 7px 34px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      <Table columns={columns} data={filteredRecords} emptyMessage="Bodega ST sin equipos registrados." keyExtractor={(r, i) => r.id ?? i} />
    </Card>
  );
}
