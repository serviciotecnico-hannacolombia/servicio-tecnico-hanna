// Estilos y sub-componentes compartidos del módulo Equipos Sin Formato —
// mismo molde que src/modules/calibraciones/ui.tsx.

export function FG({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)' }}>{label}</label>
      {children}
    </div>
  )
}

export const INP: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
  borderRadius: 8, padding: '10px 13px', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', width: '100%',
  boxSizing: 'border-box',
}
export const PRI: React.CSSProperties = { padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
export const GHOST: React.CSSProperties = { padding: '10px 18px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer' }
export const EMPTY: React.CSSProperties = { textAlign: 'center', padding: '50px 20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }
