import React from 'react';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';

interface AuditEntry {
  id: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  registro_id?: string;
  created_at: string;
  nombre_serie?: string;
  referencia?: string;
  nombre_equipo?: string;
}

interface AuditHistoryProps {
  audits: AuditEntry[];
  onViewDeleted?: (audit: any) => void;
  title?: string;
  isEmpty?: boolean;
}

const getActionInfo = (accion: 'INSERT' | 'UPDATE' | 'DELETE') => {
  switch (accion) {
    case 'INSERT':
      return {
        label: 'Creado',
        icon: Plus,
        color: '#10b981',
        background: '#d1fae5',
        borderColor: '#a7f3d0'
      };
    case 'UPDATE':
      return {
        label: 'Actualizado',
        icon: Edit2,
        color: '#f59e0b',
        background: '#fef3c7',
        borderColor: '#fde68a'
      };
    case 'DELETE':
      return {
        label: 'Eliminado',
        icon: Trash2,
        color: '#ef4444',
        background: '#fee2e2',
        borderColor: '#fecaca'
      };
    default:
      return {
        label: 'Cambio',
        icon: Plus,
        color: '#6b7280',
        background: '#f3f4f6',
        borderColor: '#e5e7eb'
      };
  }
};

export const AuditHistory: React.FC<AuditHistoryProps> = ({
  audits,
  onViewDeleted,
  title = 'Historial de cambios',
  isEmpty = false
}) => {
  return (
    <section style={{ marginTop: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock size={18} /> {title} ({audits.length})
      </h3>

      {audits.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Aún no hay cambios registrados</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {audits.slice(0, 30).map((audit) => {
            const actionInfo = getActionInfo(audit.accion);
            const ActionIcon = actionInfo.icon;
            const timestamp = new Date(audit.created_at).toLocaleString('es-CO');
            const registroDisplay = audit.registro_id || audit.nombre_serie || 'Registro';

            return (
              <div
                key={audit.id}
                style={{
                  padding: '12px',
                  borderLeft: `4px solid ${actionInfo.color}`,
                  background: actionInfo.background,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  flexWrap: 'wrap',
                  fontSize: '0.85rem'
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    background: '#ffffff',
                    borderRadius: 6,
                    fontWeight: 600,
                    color: actionInfo.color,
                    border: `1px solid ${actionInfo.borderColor}`,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <ActionIcon size={14} />
                  {actionInfo.label}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      ID: {registroDisplay}
                    </span>
                    {audit.referencia && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        <strong>Ref:</strong> {audit.referencia}
                      </span>
                    )}
                    {audit.nombre_serie && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        <strong>Serie:</strong> {audit.nombre_serie}
                      </span>
                    )}
                    {audit.nombre_equipo && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        <strong>Equipo:</strong> {audit.nombre_equipo}
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    {timestamp}
                  </span>
                </div>

                {audit.accion === 'DELETE' && onViewDeleted && (
                  <button
                    onClick={() => onViewDeleted(audit)}
                    style={{
                      border: `1px solid ${actionInfo.borderColor}`,
                      borderRadius: 6,
                      background: '#ffffff',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: actionInfo.color,
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = actionInfo.background;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    Ver registro
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
