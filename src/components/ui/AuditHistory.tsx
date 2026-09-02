import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { Card } from './Card'

interface AuditEntry {
  id: string
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  registro_id?: string
  created_at: string
  nombre_serie?: string
  referencia?: string
  nombre_equipo?: string
}

interface AuditHistoryProps {
  audits: AuditEntry[]
  onViewDeleted?: (audit: AuditEntry) => void
  onViewChanges?: (audit: AuditEntry) => void
  title?: string
}

const ACTION_CONFIG: Record<AuditEntry['accion'], { label: string; icon: typeof Plus; color: string; bg: string; border: string }> = {
  INSERT: { label: 'Creado',      icon: Plus,    color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  UPDATE: { label: 'Actualizado', icon: Pencil,  color: 'var(--yellow)', bg: 'var(--yellow-bg)', border: 'var(--yellow-border)' },
  DELETE: { label: 'Eliminado',   icon: Trash2,  color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
}

export function AuditHistory({ audits, onViewDeleted, onViewChanges, title = 'Historial de cambios' }: AuditHistoryProps) {
  return (
    <Card
      title={`${title} (${audits.length})`}
      style={{ marginTop: 18 }}
      bodyStyle={{ padding: audits.length === 0 ? 20 : 12 }}
    >
      {audits.length === 0 ? (
        <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          <Clock size={22} style={{ opacity: 0.4, marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Aún no hay cambios registrados</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {audits.slice(0, 30).map(audit => {
            const cfg = ACTION_CONFIG[audit.accion]
            const ActionIcon = cfg.icon
            const timestamp = new Date(audit.created_at).toLocaleString('es-CO')
            const registroDisplay = audit.registro_id || audit.nombre_serie || 'Registro'

            return (
              <div
                key={audit.id}
                style={{
                  padding: '10px 12px',
                  borderLeft: `3px solid ${cfg.color}`,
                  background: cfg.bg,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px', background: 'var(--surface)', borderRadius: 20,
                  fontSize: '0.72rem', fontWeight: 700, color: cfg.color,
                  border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap',
                }}>
                  <ActionIcon size={12} /> {cfg.label}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text)', fontWeight: 700 }}>
                      {registroDisplay}
                    </span>
                    {audit.nombre_equipo && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{audit.nombre_equipo}</span>
                    )}
                    {audit.referencia && (
                      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{audit.referencia}</span>
                    )}
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>
                    {timestamp}
                  </span>
                </div>

                {audit.accion === 'DELETE' && onViewDeleted && (
                  <button
                    onClick={() => onViewDeleted(audit)}
                    style={{
                      border: `1px solid ${cfg.border}`, borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
                      padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                      color: cfg.color, transition: 'background .15s', whiteSpace: 'nowrap', fontFamily: 'var(--sans)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = cfg.bg }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                  >
                    Ver eliminado
                  </button>
                )}

                {audit.accion === 'UPDATE' && onViewChanges && (
                  <button
                    onClick={() => onViewChanges(audit)}
                    style={{
                      border: `1px solid ${cfg.border}`, borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
                      padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                      color: cfg.color, transition: 'background .15s', whiteSpace: 'nowrap', fontFamily: 'var(--sans)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = cfg.bg }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                  >
                    Ver cambios
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
