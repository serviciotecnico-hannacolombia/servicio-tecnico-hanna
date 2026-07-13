import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Spinner } from '../../../components/ui/Spinner'
import { useRoles } from '../hooks/useRoles'
import type { ModuleKey, CapabilityKey } from '../../../types'

const MODULE_LABELS: Record<ModuleKey, string> = {
  llamadas: 'Control de Llamadas',
  bodega: 'Bodega',
  consumibles: 'Consumibles',
  tarifas: 'Tarifas de Envío',
  codigos: 'Códigos y Partes',
  editor: 'Editor de Informes',
  indicadores: 'Indicadores',
  correos: 'Correos',
  reporte_st: 'Reporte ST',
  tareas: 'Tareas',
  admin: 'Administración',
}

const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  importar_csv_tarifas: 'Importar CSV en Tarifas de Envío',
  importar_csv_codigos: 'Importar CSV en Códigos y Partes',
  importar_csv_llamadas: 'Importar CSV en Control de Llamadas',
  bodega_registrar_ingreso: 'Registrar ingreso a bodega',
  editar_codigos: 'Editar código/precio inline (Códigos y Partes)',
  gestion_codigos: 'Pestaña "Gestión" en Códigos y Partes',
  bodega_eliminar: 'Eliminar ítems de Bodega',
}

const MODULE_KEYS = Object.keys(MODULE_LABELS) as ModuleKey[]
const CAPABILITY_KEYS = Object.keys(CAPABILITY_LABELS) as CapabilityKey[]

export function RolesMatrix() {
  const {
    roles, modulesByRole, capabilitiesByRole, isLoading,
    createRole, renameRole, deleteRole, setModuleGrant, setCapabilityGrant,
  } = useRoles()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = roles.find(r => r.id === selectedId) ?? roles[0] ?? null
  const selectedModules = selected ? (modulesByRole.get(selected.id) ?? new Set<ModuleKey>()) : new Set<ModuleKey>()
  const selectedCapabilities = selected ? (capabilitiesByRole.get(selected.id) ?? new Set<CapabilityKey>()) : new Set<CapabilityKey>()

  const handleCreate = async () => {
    const name = prompt('Nombre del nuevo rol:')
    if (!name?.trim()) return
    try {
      await createRole.mutateAsync(name.trim())
      toast.success(`Rol "${name.trim()}" creado`)
    } catch {
      toast.error('Error al crear el rol')
    }
  }

  const handleRename = async (id: string, currentName: string) => {
    const name = prompt('Nuevo nombre del rol:', currentName)
    if (!name?.trim() || name.trim() === currentName) return
    try {
      await renameRole.mutateAsync({ id, name: name.trim() })
      toast.success('Rol renombrado')
    } catch {
      toast.error('Error al renombrar el rol')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el rol "${name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteRole.mutateAsync(id)
      toast.success('Rol eliminado')
      if (selectedId === id) setSelectedId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el rol')
    }
  }

  const toggleModule = (moduleKey: ModuleKey, granted: boolean) => {
    if (!selected) return
    setModuleGrant.mutate({ roleId: selected.id, moduleKey, granted })
  }

  const toggleCapability = (capabilityKey: CapabilityKey, granted: boolean) => {
    if (!selected) return
    setCapabilityGrant.mutate({ roleId: selected.id, capabilityKey, granted })
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 20px' }}>
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* Lista de roles */}
      <Card style={{ width: 240, flexShrink: 0 }} bodyStyle={{ padding: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {roles.map(role => (
            <div
              key={role.id}
              onClick={() => setSelectedId(role.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: selected?.id === role.id ? 'var(--accent-bg)' : 'transparent',
                color: selected?.id === role.id ? 'var(--accent)' : 'var(--text)',
              }}
            >
              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600 }}>{role.name}</span>
              <button
                onClick={e => { e.stopPropagation(); handleRename(role.id, role.name) }}
                title="Renombrar"
                style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(role.id, role.name) }}
                title="Eliminar rol"
                style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 4px 2px' }}>
          <Button variant="ghost" size="sm" onClick={handleCreate} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={14} /> Nuevo rol
          </Button>
        </div>
      </Card>

      {/* Matriz de permisos del rol seleccionado */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title={`Módulos — ${selected.name}`}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {MODULE_KEYS.map(key => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedModules.has(key)}
                    onChange={e => toggleModule(key, e.target.checked)}
                  />
                  {MODULE_LABELS[key]}
                </label>
              ))}
            </div>
          </Card>

          <Card title={`Capacidades sensibles — ${selected.name}`}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {CAPABILITY_KEYS.map(key => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedCapabilities.has(key)}
                    onChange={e => toggleCapability(key, e.target.checked)}
                  />
                  {CAPABILITY_LABELS[key]}
                </label>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ flex: 1, padding: '56px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          Crea un rol para empezar a configurar sus permisos.
        </div>
      )}
    </div>
  )
}
