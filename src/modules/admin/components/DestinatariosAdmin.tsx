import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ChevronDown, ChevronRight, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../../components/ui/Button'
import type { CorreoProveedor, CorreoDestinatario } from '../../../types'

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontSize: '0.85rem',
}

// ── Fila de destinatario ──────────────────────────────────────
function DestinatarioRow({
  dest,
  onDelete,
}: {
  dest: CorreoDestinatario
  onDelete: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 12px',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{
        fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--mono)',
        padding: '2px 7px', borderRadius: 4, flexShrink: 0,
        background: dest.tipo === 'to' ? 'var(--accent-bg)' : 'var(--surface2)',
        color: dest.tipo === 'to' ? 'var(--accent)' : 'var(--muted)',
        border: dest.tipo === 'cc' ? '1px solid var(--border)' : 'none',
      }}>
        {dest.tipo.toUpperCase()}
      </span>
      <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{dest.nombre}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{dest.email}</span>
      <button
        onClick={onDelete}
        style={{
          background: 'var(--red-bg)', border: 'none', borderRadius: 6,
          color: 'var(--red)', cursor: 'pointer', padding: '4px 7px',
          display: 'flex', alignItems: 'center',
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

// ── Bloque proveedor ─────────────────────────────────────────
function ProveedorBlock({
  proveedor,
  onDeleted,
}: {
  proveedor: CorreoProveedor
  onDeleted: () => void
}) {
  const qc = useQueryClient()
  const [open, setOpen]       = useState(false)
  const [nombre, setNombre]   = useState('')
  const [email, setEmail]     = useState('')
  const [tipo, setTipo]       = useState<'to' | 'cc'>('to')
  const [adding, setAdding]   = useState(false)

  const { data: destinatarios = [], refetch } = useQuery<CorreoDestinatario[]>({
    queryKey: ['correos-destinatarios', proveedor.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('correos_destinatarios')
        .select('*')
        .eq('proveedor_id', proveedor.id)
        .order('orden')
      if (error) throw error
      return data
    },
  })

  const handleAddDest = async () => {
    if (!nombre.trim() || !email.trim()) return toast.error('Nombre y email son obligatorios')
    setAdding(true)
    try {
      const { error } = await supabase.from('correos_destinatarios').insert({
        proveedor_id: proveedor.id,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        tipo,
        orden: (destinatarios.length + 1) * 10,
      })
      if (error) throw error
      setNombre(''); setEmail('')
      refetch()
      qc.invalidateQueries({ queryKey: ['correos-destinatarios', proveedor.id] })
      toast.success('Destinatario agregado')
    } catch {
      toast.error('Error al agregar destinatario')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteDest = async (id: string) => {
    if (!confirm('¿Eliminar este destinatario?')) return
    const { error } = await supabase.from('correos_destinatarios').delete().eq('id', id)
    if (error) return toast.error('Error al eliminar')
    refetch()
    qc.invalidateQueries({ queryKey: ['correos-destinatarios', proveedor.id] })
    toast.success('Eliminado')
  }

  const handleDeleteProveedor = async () => {
    if (!confirm(`¿Eliminar el proveedor "${proveedor.nombre}" y todos sus destinatarios?`)) return
    const { error } = await supabase.from('correos_proveedores').delete().eq('id', proveedor.id)
    if (error) return toast.error('Error al eliminar proveedor')
    toast.success('Proveedor eliminado')
    onDeleted()
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      {/* Header del proveedor */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          background: 'var(--surface)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {open ? <ChevronDown size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
               : <ChevronRight size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
        <Mail size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{proveedor.nombre}</span>
        <button
          onClick={e => { e.stopPropagation(); handleDeleteProveedor() }}
          style={{
            background: 'var(--red-bg)', border: 'none', borderRadius: 6,
            color: 'var(--red)', cursor: 'pointer', padding: '4px 8px',
            fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--mono)',
          }}
        >
          Eliminar
        </button>
      </div>

      {/* Contenido expandible */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
          {destinatarios.length === 0 ? (
            <p style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
              Sin destinatarios aún.
            </p>
          ) : (
            destinatarios.map(d => (
              <DestinatarioRow
                key={d.id}
                dest={d}
                onDelete={() => handleDeleteDest(d.id)}
              />
            ))
          )}

          {/* Formulario agregar */}
          <div style={{
            display: 'flex', gap: 8, padding: '10px 12px',
            borderTop: destinatarios.length ? '1px solid var(--border)' : 'none',
            flexWrap: 'wrap',
          }}>
            <input
              style={{ ...inputStyle, flex: '1 1 140px' }}
              placeholder="Nombre"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
            <input
              style={{ ...inputStyle, flex: '2 1 200px' }}
              placeholder="email@proveedor.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddDest()}
            />
            <select
              style={{ ...inputStyle, width: 70 }}
              value={tipo}
              onChange={e => setTipo(e.target.value as 'to' | 'cc')}
            >
              <option value="to">TO</option>
              <option value="cc">CC</option>
            </select>
            <Button size="sm" onClick={handleAddDest} disabled={adding}>
              <Plus size={13} />
              Agregar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Panel principal ──────────────────────────────────────────
export function DestinatariosAdmin() {
  const qc = useQueryClient()
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [creando, setCreando]         = useState(false)

  const { data: proveedores = [], refetch } = useQuery<CorreoProveedor[]>({
    queryKey: ['correos-proveedores-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('correos_proveedores')
        .select('*')
        .order('nombre')
      if (error) throw error
      return data
    },
  })

  const handleCrearProveedor = async () => {
    if (!nuevoNombre.trim()) return
    setCreando(true)
    try {
      const { error } = await supabase
        .from('correos_proveedores')
        .insert({ nombre: nuevoNombre.trim() })
      if (error) throw error
      setNuevoNombre('')
      refetch()
      qc.invalidateQueries({ queryKey: ['correos-proveedores'] })
      toast.success('Proveedor creado')
    } catch {
      toast.error('Error al crear proveedor')
    } finally {
      setCreando(false)
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Destinatarios por proveedor</h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
            Gestiona los correos TO/CC para cada proveedor de calibración.
          </p>
        </div>
      </div>

      {/* Nuevo proveedor */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
        padding: '12px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Nombre del nuevo proveedor"
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCrearProveedor()}
        />
        <Button size="sm" onClick={handleCrearProveedor} disabled={creando || !nuevoNombre.trim()}>
          <Plus size={13} />
          Nuevo proveedor
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {proveedores.map(p => (
          <ProveedorBlock
            key={p.id}
            proveedor={p}
            onDeleted={() => {
              refetch()
              qc.invalidateQueries({ queryKey: ['correos-proveedores'] })
            }}
          />
        ))}
        {proveedores.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center', padding: 32 }}>
            No hay proveedores aún. Crea el primero arriba.
          </p>
        )}
      </div>
    </div>
  )
}
