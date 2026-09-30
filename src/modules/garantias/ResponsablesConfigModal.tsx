// Solo Admin: define quiénes aparecen como responsables seleccionables en
// las garantías. Quitar a alguien de la lista no lo desasigna de las
// garantías donde ya figura — solo deja de aparecer en el selector.
import { useState } from 'react'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { useProfiles } from '../../hooks/useProfiles'
import { useResponsablesConfig, setResponsableHabilitado, ordenarPorNombre } from './hooks/useGarantias'
import { INP } from './ui'

export function ResponsablesConfigModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data: profiles = [] } = useProfiles()
  const { data: ids = [] } = useResponsablesConfig()
  const [search, setSearch] = useState('')
  const [guardando, setGuardando] = useState<string | null>(null)
  const habilitados = new Set(ids)

  const q = search.toLowerCase().trim()
  const lista = profiles
    .filter(p => p.activo)
    .filter(p => !q || (p.full_name || '').toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    .sort((a, b) => Number(habilitados.has(b.id)) - Number(habilitados.has(a.id)) || ordenarPorNombre(a, b))

  async function toggle(profileId: string) {
    setGuardando(profileId)
    const { error } = await setResponsableHabilitado(profileId, !habilitados.has(profileId))
    setGuardando(null)
    if (error) { toast.error('Error: ' + error.message); return }
    qc.invalidateQueries({ queryKey: ['garantias_responsables'] })
  }

  return (
    <Modal open onClose={onClose} title="Responsables seleccionables" width={480}>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Marca quiénes pueden asignarse como responsables de una garantía ({ids.length} habilitados).
      </p>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o correo..." style={{ ...INP, paddingLeft: 34 }} autoFocus />
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {lista.map(p => (
          <label key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
            background: habilitados.has(p.id) ? 'var(--accent-bg)' : 'transparent',
            opacity: guardando === p.id ? .5 : 1,
          }}>
            <input type="checkbox" checked={habilitados.has(p.id)} disabled={guardando !== null} onChange={() => toggle(p.id)} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.full_name || p.email}</div>
              {p.full_name && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.email}</div>}
            </div>
          </label>
        ))}
        {lista.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Sin resultados.</p>}
      </div>
    </Modal>
  )
}
