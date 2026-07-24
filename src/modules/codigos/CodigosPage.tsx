import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X, Copy, Check, RefreshCw, Wrench, Pencil, Trash2, Plus, Upload, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../hooks/useUser'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SpPriceItem {
  id: string
  code: string
  product: string
  description: string
  precio_a_cobrar: number
}

interface CodInetItem {
  codigo: string
  familia: string
  descripcion: string
  codigo_mantenimiento: string
  codigo_calibracion: string | null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useCodigosData() {
  const spQuery = useQuery<SpPriceItem[]>({
    queryKey: ['codigos-sp-price'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('codigos_sp_price')
        .select('id, code, product, description, precio_a_cobrar')
        .order('product')
      if (error) throw error
      return data as SpPriceItem[]
    },
    staleTime: 10 * 60 * 1000,
  })

  const inetQuery = useQuery<CodInetItem[]>({
    queryKey: ['codigos-inet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('codigos_inet')
        .select('codigo, familia, descripcion, codigo_mantenimiento, codigo_calibracion')
        .order('codigo')
      if (error) throw error
      return data as CodInetItem[]
    },
    staleTime: 10 * 60 * 1000,
  })

  return {
    data: spQuery.data && inetQuery.data
      ? { spPrice: { items: spQuery.data }, codInet: { items: inetQuery.data } }
      : undefined,
    isLoading: spQuery.isLoading || inetQuery.isLoading,
    error: spQuery.error || inetQuery.error,
    refetch: () => { spQuery.refetch(); inetQuery.refetch() },
    isFetching: spQuery.isFetching || inetQuery.isFetching,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCOP = (n: number) =>
  '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// Acepta montos tipo "$42,875.00" (separador de miles ",", decimales ".")
function parsePrecioMonto(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function getCalib(item: CodInetItem) {
  return (item.codigo_calibracion || '').trim()
}

function getDesc(item: CodInetItem) {
  return (item.descripcion || '').trim()
}

function copy(text: string, label: string) {
  navigator.clipboard.writeText(text)
    .then(() => toast.success(`${label} copiado`))
    .catch(() => toast.error('No se pudo copiar'))
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CopyBtn({ value, label, disabled }: { value: string; label: string; disabled?: boolean }) {
  const [done, setDone] = useState(false)
  const handle = () => {
    if (disabled || !value) return
    navigator.clipboard.writeText(value).then(() => {
      setDone(true)
      setTimeout(() => setDone(false), 1800)
      toast.success(`${label} copiado`)
    }).catch(() => toast.error('No se pudo copiar'))
  }
  return (
    <button
      onClick={handle}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 7,
        border: `1px solid ${done ? 'var(--green-border)' : 'var(--border)'}`,
        background: done ? 'var(--green-bg)' : 'var(--surface2)',
        color: done ? 'var(--green)' : disabled ? 'var(--muted)' : 'var(--muted)',
        fontFamily: 'var(--mono)', fontSize: '0.72rem', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, transition: 'all .15s', flexShrink: 0,
      }}
      onMouseEnter={e => { if (!disabled && !done) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; if (!disabled && !done) (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
      onMouseLeave={e => { if (!done) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; if (!done) (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
    >
      {done ? <Check size={12} /> : <Copy size={12} />}
      {done ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function SearchInput({
  id, value, onChange, onKeyDown, onClear, placeholder,
}: {
  id: string; value: string; onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void; onClear: () => void
  placeholder: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      <Search size={16} style={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        color: 'var(--muted)', pointerEvents: 'none',
      }} />
      <input
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: '100%', padding: '11px 40px 11px 42px',
          border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
          background: 'var(--surface2)', color: 'var(--text)',
          fontSize: '0.9rem', fontFamily: 'var(--sans)',
          boxSizing: 'border-box', outline: 'none', transition: 'border-color .15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
      />
      {value && (
        <button onClick={onClear} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
          display: 'flex', padding: 4, borderRadius: 4,
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}

function SuggestDropdown({
  open, items, focusedIdx, onSelect,
}: {
  open: boolean
  items: { key: string; label: React.ReactNode; sub?: string }[]
  focusedIdx: number
  onSelect: (i: number) => void
}) {
  if (!open || !items.length) return null
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', overflow: 'hidden',
      boxShadow: '0 8px 28px rgba(0,0,0,.12)',
      maxHeight: 320, overflowY: 'auto',
    }}>
      {items.map((item, i) => (
        <div
          key={item.key}
          onMouseDown={() => onSelect(i)}
          style={{
            padding: '10px 16px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: 10,
            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            background: i === focusedIdx ? 'var(--accent-bg)' : 'transparent',
            color: i === focusedIdx ? 'var(--accent)' : 'var(--text)',
            transition: 'background .1s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i === focusedIdx ? 'var(--accent-bg)' : 'transparent' }}
        >
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', flex: 1 }}>{item.label}</span>
          {item.sub && (
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0 }}>{item.sub}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Tab Equipos ──────────────────────────────────────────────────────────────

function TabEquipos({ items }: { items: CodInetItem[] }) {
  const { hasCapability } = useUser()
  const canEditar = hasCapability('editar_codigos')
  const qc = useQueryClient()

  const [query, setQuery]         = useState('')
  const [open, setOpen]           = useState(false)
  const [focused, setFocused]     = useState(-1)
  const [result, setResult]       = useState<CodInetItem | null>(null)
  const [editField, setEditField] = useState<'mant' | 'calib' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving]       = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = query.trim()
    ? items.filter(r => r.codigo.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : []

  const select = (i: number) => {
    const item = suggestions[i]
    setQuery(item.codigo)
    setResult(item)
    setOpen(false)
    setFocused(-1)
    setEditField(null)
  }

  const clear = () => { setQuery(''); setResult(null); setOpen(false); setFocused(-1); setEditField(null) }

  const handleChange = (v: string) => {
    setQuery(v)
    setResult(null)
    setFocused(-1)
    setOpen(!!v.trim())
    setEditField(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)) }
    else if (e.key === 'Enter' && focused >= 0) select(focused)
    else if (e.key === 'Escape') setOpen(false)
  }

  const startEdit = (field: 'mant' | 'calib', current: string) => {
    setEditField(field)
    setEditValue(current)
  }

  const cancelEdit = () => { setEditField(null); setEditValue('') }

  const saveEdit = async () => {
    if (!result || !editField) return
    setSaving(true)
    const col = editField === 'mant' ? 'codigo_mantenimiento' : 'codigo_calibracion'
    const { error } = await supabase
      .from('codigos_inet')
      .update({ [col]: editValue.trim() || null })
      .eq('codigo', result.codigo)
    setSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    const updated: CodInetItem = { ...result, [col]: editValue.trim() || null }
    setResult(updated)
    qc.setQueryData<CodInetItem[]>(['codigos-inet'], old =>
      old ? old.map(r => r.codigo === result.codigo ? updated : r) : old
    )
    toast.success('Campo actualizado')
    setEditField(null)
    setEditValue('')
  }

  const mant  = result ? (result.codigo_mantenimiento || '').trim() : ''
  const calib = result ? getCalib(result) : ''
  const desc  = result ? getDesc(result) : ''

  const iconBtn = (onClick: () => void, children: React.ReactNode, accent?: boolean) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 6, borderRadius: 6, border: '1px solid var(--border)',
        background: accent ? 'var(--accent)' : 'var(--surface2)',
        color: accent ? '#fff' : 'var(--muted)',
        cursor: 'pointer', flexShrink: 0, transition: 'all .12s',
      }}
    >
      {children}
    </button>
  )

  const fieldRow = (label: string, value: string, hasValue: boolean, field: 'mant' | 'calib') => {
    const isEditing = editField === field
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 'var(--radius-sm)',
        border: `1.5px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}`,
        background: 'var(--surface)',
        opacity: hasValue || isEditing ? 1 : 0.5,
        borderStyle: hasValue || isEditing ? 'solid' : 'dashed',
        transition: 'border-color .15s',
      }}>
        <span style={{
          fontSize: '0.7rem', fontFamily: 'var(--mono)', textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--muted)', width: 130, flexShrink: 0,
        }}>
          {label}
        </span>

        {isEditing ? (
          <>
            <input
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
              style={{
                flex: 1, fontFamily: 'var(--mono)', fontSize: '0.9rem',
                background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', padding: '2px 0',
              }}
            />
            <button
              onClick={saveEdit}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 6,
                border: '1px solid var(--accent)', background: 'var(--accent)',
                color: '#fff', fontSize: '0.78rem', fontFamily: 'var(--mono)',
                cursor: saving ? 'wait' : 'pointer', flexShrink: 0,
              }}
            >
              {saving ? <Spinner size={12} /> : <><Check size={12} /> Guardar</>}
            </button>
            {iconBtn(cancelEdit, <X size={13} />)}
          </>
        ) : (
          <>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: '0.9rem',
              color: hasValue ? 'var(--text)' : 'var(--muted)',
              flex: 1, fontStyle: hasValue ? 'normal' : 'italic',
            }}>
              {hasValue ? value : 'No aplica'}
            </span>
            <CopyBtn value={value} label={label} disabled={!hasValue} />
            {canEditar && iconBtn(() => startEdit(field, value), <Pencil size={13} />)}
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <Card title="Buscar por código de equipo" style={{ overflow: 'visible' }}>
        <div style={{ position: 'relative' }} ref={wrapRef as React.RefObject<HTMLDivElement>}>
          <SearchInput
            id="inet-input"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onClear={clear}
            placeholder="Escribe el CODIGO (ej: HI 700, HI 701…)"
          />
          <SuggestDropdown
            open={open && suggestions.length > 0}
            focusedIdx={focused}
            items={suggestions.map(r => ({
              key: r.codigo,
              label: r.codigo,
              sub: getDesc(r) || r.familia || undefined,
            }))}
            onSelect={select}
          />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 8, paddingLeft: 2 }}>
          Busca por CODIGO exacto o parcial — {items.length} equipos disponibles
        </p>
      </Card>

      {!result && !query && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <Wrench size={36} strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: '0.875rem' }}>Ingresa un código de equipo para ver sus procedimientos.</p>
        </div>
      )}

      {query && !result && (
        <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)' }}>
          <p style={{ fontSize: '0.875rem' }}>
            No se encontró ningún equipo con <strong style={{ color: 'var(--text)' }}>"{query}"</strong>
          </p>
        </div>
      )}

      {result && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>
              {result.codigo}
            </span>
            {result.familia && (
              <span style={{
                fontSize: '0.72rem', color: 'var(--muted)', padding: '2px 10px',
                borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)',
                fontFamily: 'var(--mono)',
              }}>
                {result.familia}
              </span>
            )}
            {desc && (
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                {desc}
              </span>
            )}
          </div>

          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fieldRow('Mantenimiento', mant, !!mant, 'mant')}
            {fieldRow('Calibración', calib, !!calib, 'calib')}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Precios ──────────────────────────────────────────────────────────────

function TabPrecios({ items }: { items: SpPriceItem[] }) {
  const [query, setQuery]         = useState('')
  const [open, setOpen]           = useState(false)
  const [focused, setFocused]     = useState(-1)
  const [product, setProduct]     = useState<string | null>(null)
  const [rows, setRows]           = useState<SpPriceItem[]>([])
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allProducts = [...new Set(items.map(r => r.product).filter(Boolean))]
  const suggestions = query.trim()
    ? allProducts.filter(p => p.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : []

  const select = (i: number) => {
    const p = suggestions[i]
    setQuery(p)
    setProduct(p)
    setRows(items.filter(r => r.product === p))
    setSelected(new Set())
    setOpen(false)
    setFocused(-1)
  }

  const clear = () => { setQuery(''); setProduct(null); setRows([]); setSelected(new Set()); setOpen(false) }

  const handleChange = (v: string) => {
    setQuery(v)
    setProduct(null)
    setRows([])
    setSelected(new Set())
    setFocused(-1)
    setOpen(!!v.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)) }
    else if (e.key === 'Enter' && focused >= 0) select(focused)
    else if (e.key === 'Escape') setOpen(false)
  }

  const toggleCode = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.code))

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map(r => r.code)))
  }

  const total = rows.filter(r => selected.has(r.code)).reduce((s, r) => s + (Number(r.precio_a_cobrar) || 0), 0)
  const countSel = rows.filter(r => selected.has(r.code)).length

  const copyResumen = () => {
    const selRows = rows.filter(r => selected.has(r.code))
    const lines = selRows.map(r => `- ${r.code} - ${r.description || r.product} - ${fmtCOP(Number(r.precio_a_cobrar) || 0)}`)
    lines.push('- Mantenimiento: ')
    copy(lines.join('\n'), 'Resumen')
  }

  return (
    <div>
      <Card title="Buscar por producto" style={{ overflow: 'visible' }}>
        <div style={{ position: 'relative' }} ref={wrapRef as React.RefObject<HTMLDivElement>}>
          <SearchInput
            id="price-input"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onClear={clear}
            placeholder="Escribe el código de producto (ej: BL121, HI122…)"
          />
          <SuggestDropdown
            open={open && suggestions.length > 0}
            focusedIdx={focused}
            items={suggestions.map(p => {
              const count = items.filter(r => r.product === p).length
              return { key: p, label: p, sub: `${count} código${count !== 1 ? 's' : ''}` }
            })}
            onSelect={select}
          />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 8, paddingLeft: 2 }}>
          Escribe al menos 1 carácter para ver sugerencias — {allProducts.length} productos disponibles
        </p>
      </Card>

      {!product && !query && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <span style={{ fontSize: 36, display: 'block', marginBottom: 12, opacity: 0.5 }}>🏷️</span>
          <p style={{ fontSize: '0.875rem' }}>Busca un producto para ver sus códigos y precios disponibles.</p>
        </div>
      )}

      {product && rows.length > 0 && (
        <>
          {/* Lista de precios */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 14,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent)' }}>
                  {product}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                  {rows.length} código{rows.length !== 1 ? 's' : ''} disponible{rows.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={toggleAll}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', fontFamily: 'var(--mono)', color: 'var(--muted)',
                  transition: 'color .15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
              >
                {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>

            {/* Filas */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map(row => {
                const isChecked = selected.has(row.code)
                const price = Number(row.precio_a_cobrar) || 0
                return (
                  <div
                    key={row.code}
                    onClick={() => toggleCode(row.code)}
                    style={{
                      display: 'grid', gridTemplateColumns: '28px 1fr auto',
                      alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}`,
                      background: isChecked ? 'var(--accent-bg)' : 'var(--surface2)',
                      cursor: 'pointer', transition: 'all .15s', userSelect: 'none',
                    }}
                    onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)40' }}
                    onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${isChecked ? 'var(--accent)' : 'var(--muted)'}`,
                      background: isChecked ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .15s',
                    }}>
                      {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>

                    {/* Info */}
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                        {row.code}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                        {row.description || row.product}
                      </div>
                    </div>

                    {/* Precio */}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', textAlign: 'right' }}>
                      {fmtCOP(price)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Barra total */}
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 4 }}>
                Total seleccionado
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '1.6rem', fontWeight: 600, color: 'var(--accent)' }}>
                <span style={{ fontSize: '0.95rem', color: 'var(--muted)', marginRight: 3 }}>$</span>
                {total.toLocaleString('es-CO')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                {countSel} ítem{countSel !== 1 ? 's' : ''} seleccionado{countSel !== 1 ? 's' : ''}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button
                disabled={countSel === 0}
                onClick={copyResumen}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)',
                  color: countSel > 0 ? 'var(--accent)' : 'var(--muted)',
                  border: `1.5px solid ${countSel > 0 ? 'var(--accent)' : 'var(--border)'}`,
                  fontFamily: 'var(--sans)', fontSize: '0.875rem',
                  fontWeight: 700, cursor: countSel > 0 ? 'pointer' : 'not-allowed',
                  opacity: countSel === 0 ? 0.5 : 1, transition: 'all .2s',
                }}
                onMouseEnter={e => { if (countSel > 0) (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = countSel === 0 ? '0.5' : '1' }}
              >
                <Copy size={15} />
                Copiar resumen
              </button>
              <button
                disabled={countSel === 0}
                onClick={() => copy(String(total), 'Total')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: 'var(--radius-sm)',
                  background: countSel > 0 ? 'var(--accent)' : 'var(--surface)',
                  color: countSel > 0 ? '#fff' : 'var(--muted)',
                  border: 'none', fontFamily: 'var(--sans)', fontSize: '0.875rem',
                  fontWeight: 700, cursor: countSel > 0 ? 'pointer' : 'not-allowed',
                  opacity: countSel === 0 ? 0.5 : 1, transition: 'all .2s',
                }}
                onMouseEnter={e => { if (countSel > 0) (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = countSel === 0 ? '0.5' : '1' }}
              >
                <Copy size={15} />
                Copiar total
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = clean.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const vals = parseLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]))
  })
}

function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === ',' && !inQ) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, width = 560 }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: number
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', boxShadow: '0 24px 60px rgba(0,0,0,.3)',
        width: '100%', maxWidth: width, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
            {title}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Gestión ──────────────────────────────────────────────────────────────

const EMPTY_FORM: CodInetItem = { codigo: '', familia: '', descripcion: '', codigo_mantenimiento: '', codigo_calibracion: '' }

interface PlanPrecios {
  actualizar: { id: string, code: string, productActual: string, productNuevo: string, descripcionNueva: string, precioActual: number, precioNuevo: number }[]
  nuevos: { code: string, product: string, description: string, precio: number }[]
  sinCambio: number
  ambiguos: string[]
  invalidas: { code: string, valor: string }[]
}

function TabGestion({ items, spItems }: { items: CodInetItem[], spItems: SpPriceItem[] }) {
  const qc = useQueryClient()

  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState<CodInetItem>(EMPTY_FORM)
  const [addSaving, setAddSaving] = useState(false)

  const [showImport, setShowImport]     = useState(false)
  const [csvRows, setCsvRows]           = useState<Partial<CodInetItem>[] | null>(null)
  const [csvError, setCsvError]         = useState('')
  const [importMode, setImportMode]     = useState<'upsert' | 'replace'>('upsert')
  const [importing, setImporting]       = useState(false)
  const [importMsg, setImportMsg]       = useState('')

  const [showImportPrecios, setShowImportPrecios] = useState(false)
  const [planPrecios, setPlanPrecios]             = useState<PlanPrecios | null>(null)
  const [csvErrorPrecios, setCsvErrorPrecios]     = useState('')
  const [importingPrecios, setImportingPrecios]   = useState(false)
  const [importMsgPrecios, setImportMsgPrecios]   = useState('')

  const PAGE = 25
  const filtered = items.filter(r =>
    !search.trim() ||
    r.codigo.toLowerCase().includes(search.toLowerCase()) ||
    (r.descripcion || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.familia || '').toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / PAGE)
  const pageItems  = filtered.slice(page * PAGE, (page + 1) * PAGE)

  // ── Delete ──
  const deleteEquipo = async (codigo: string) => {
    setDeleting(codigo)
    const { error } = await supabase.from('codigos_inet').delete().eq('codigo', codigo)
    setDeleting(null)
    if (error) { toast.error('Error al eliminar'); return }
    qc.setQueryData<CodInetItem[]>(['codigos-inet'], old => old ? old.filter(r => r.codigo !== codigo) : old)
    toast.success('Equipo eliminado')
  }

  // ── Add ──
  const saveAdd = async () => {
    if (!addForm.codigo.trim()) { toast.error('El código es obligatorio'); return }
    setAddSaving(true)
    const row: CodInetItem = {
      codigo: addForm.codigo.trim(),
      familia: addForm.familia.trim(),
      descripcion: addForm.descripcion.trim(),
      codigo_mantenimiento: addForm.codigo_mantenimiento.trim(),
      codigo_calibracion: addForm.codigo_calibracion?.trim() || null,
    }
    const { error } = await supabase.from('codigos_inet').upsert(row, { onConflict: 'codigo' })
    setAddSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    qc.setQueryData<CodInetItem[]>(['codigos-inet'], old => {
      if (!old) return old
      const exists = old.findIndex(r => r.codigo === row.codigo)
      return exists >= 0 ? old.map(r => r.codigo === row.codigo ? row : r) : [...old, row]
    })
    toast.success(`Equipo "${row.codigo}" guardado`)
    setShowAdd(false)
    setAddForm(EMPTY_FORM)
  }

  // ── CSV import ──
  const handleFile = (file: File) => {
    setCsvError(''); setCsvRows(null); setImportMsg('')
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      if (!rows.length) { setCsvError('El archivo está vacío o no tiene el formato correcto.'); return }
      if (!('codigo' in rows[0])) { setCsvError('No se encontró la columna "codigo". Revisa el encabezado del CSV.'); return }
      setCsvRows(rows.map(r => ({
        codigo: r.codigo || r['código'] || '',
        familia: r.familia || '',
        descripcion: r.descripcion || r['descripción'] || '',
        codigo_mantenimiento: r.codigo_mantenimiento || r['código_mantenimiento'] || '',
        codigo_calibracion: r.codigo_calibracion || r['código_calibracion'] || null,
      })).filter(r => r.codigo))
    }
    reader.readAsText(file, 'UTF-8')
  }

  const runImport = async () => {
    if (!csvRows?.length) return
    setImporting(true)
    try {
      if (importMode === 'replace') {
        setImportMsg('Eliminando registros existentes…')
        const { error } = await supabase.from('codigos_inet').delete().not('codigo', 'is', null)
        if (error) throw error
      }
      const BATCH = 500
      for (let i = 0; i < csvRows.length; i += BATCH) {
        const batch = csvRows.slice(i, i + BATCH) as CodInetItem[]
        const { error } = await supabase.from('codigos_inet').upsert(batch, { onConflict: 'codigo' })
        if (error) throw error
        setImportMsg(`Importando… ${Math.min(i + BATCH, csvRows.length)} / ${csvRows.length}`)
      }
      await qc.invalidateQueries({ queryKey: ['codigos-inet'] })
      toast.success(`${csvRows.length} equipos importados correctamente`)
      setShowImport(false); setCsvRows(null); setImportMsg('')
    } catch {
      toast.error('Error durante la importación')
    } finally {
      setImporting(false)
    }
  }

  // ── CSV import de precios (codigos_sp_price) ──
  const handleFilePrecios = (file: File) => {
    setCsvErrorPrecios(''); setPlanPrecios(null); setImportMsgPrecios('')
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      if (!rows.length) { setCsvErrorPrecios('El archivo está vacío o no tiene el formato correcto.'); return }
      const headers = Object.keys(rows[0])
      const codeKey    = headers.find(h => h === 'code' || h === 'código')
      const productKey = headers.find(h => h === 'product' || h === 'producto')
      const descKey    = headers.find(h => h === 'description' || h === 'descripción')
      const priceKey   = headers.find(h => h.includes('valor') || h.includes('precio'))
      if (!codeKey || !priceKey) {
        setCsvErrorPrecios('No se encontraron las columnas "Code" y "valor a cobrar". Revisa el encabezado del CSV.')
        return
      }

      // Un mismo código puede repetirse en el archivo con datos distintos (error
      // del listado de origen) — se agrupan para detectarlo y no aplicarlo a ciegas.
      const porCodigo = new Map<string, { product: string, description: string, precio: number }[]>()
      const invalidas: PlanPrecios['invalidas'] = []

      for (const row of rows) {
        const code = (row[codeKey] || '').trim()
        if (!code) continue
        const valorTexto = (row[priceKey] || '').trim()
        const precio = parsePrecioMonto(valorTexto)
        if (precio === null) { invalidas.push({ code, valor: valorTexto }); continue }
        const list = porCodigo.get(code) || []
        list.push({ product: productKey ? row[productKey] || '' : '', description: descKey ? row[descKey] || '' : '', precio })
        porCodigo.set(code, list)
      }

      const ambiguos: string[] = []
      const actualizar: PlanPrecios['actualizar'] = []
      const nuevos: PlanPrecios['nuevos'] = []
      let sinCambio = 0

      for (const [code, entries] of porCodigo) {
        if (entries.length > 1) { ambiguos.push(code); continue }
        const entry = entries[0]
        const matches = spItems.filter(r => r.code.trim().toLowerCase() === code.toLowerCase())
        if (matches.length > 1) { ambiguos.push(code); continue }
        if (matches.length === 1) {
          const actual = Number(matches[0].precio_a_cobrar) || 0
          const precioIgual = Math.abs(actual - entry.precio) < 0.01
          const productoIgual = matches[0].product.trim() === entry.product.trim()
          const descripcionIgual = (matches[0].description || '').trim() === entry.description.trim()
          if (precioIgual && productoIgual && descripcionIgual) sinCambio++
          else actualizar.push({
            id: matches[0].id, code,
            productActual: matches[0].product, productNuevo: entry.product, descripcionNueva: entry.description,
            precioActual: actual, precioNuevo: entry.precio,
          })
        } else {
          nuevos.push({ code, product: entry.product, description: entry.description, precio: entry.precio })
        }
      }

      setPlanPrecios({ actualizar, nuevos, sinCambio, ambiguos, invalidas })
    }
    reader.readAsText(file, 'UTF-8')
  }

  const runImportPrecios = async () => {
    if (!planPrecios) return
    setImportingPrecios(true)
    try {
      if (planPrecios.nuevos.length) {
        const BATCH = 500
        const nuevosRows = planPrecios.nuevos.map(n => ({ code: n.code, product: n.product, description: n.description || null, precio_a_cobrar: n.precio }))
        for (let i = 0; i < nuevosRows.length; i += BATCH) {
          setImportMsgPrecios(`Agregando códigos nuevos… ${Math.min(i + BATCH, nuevosRows.length)} / ${nuevosRows.length}`)
          const { error } = await supabase.from('codigos_sp_price').insert(nuevosRows.slice(i, i + BATCH))
          if (error) throw error
        }
      }
      let actualizados = 0
      for (const a of planPrecios.actualizar) {
        setImportMsgPrecios(`Actualizando precios… ${actualizados + 1} / ${planPrecios.actualizar.length}`)
        const { error } = await supabase.from('codigos_sp_price')
          .update({ product: a.productNuevo, description: a.descripcionNueva || null, precio_a_cobrar: a.precioNuevo })
          .eq('id', a.id)
        if (error) throw error
        actualizados++
      }
      await qc.invalidateQueries({ queryKey: ['codigos-sp-price'] })
      toast.success(`${actualizados} precio(s) actualizado(s), ${planPrecios.nuevos.length} código(s) nuevo(s) agregado(s)`)
      setShowImportPrecios(false); setPlanPrecios(null); setImportMsgPrecios('')
    } catch {
      toast.error('Error durante la actualización de precios')
    } finally {
      setImportingPrecios(false)
    }
  }

  const formField = (label: string, key: keyof CodInetItem, required?: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
      </label>
      <input
        value={(addForm[key] as string) || ''}
        onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
        style={{
          padding: '9px 12px', borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--border)', background: 'var(--surface2)',
          color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'var(--mono)',
          outline: 'none',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Barra de acciones */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Filtrar equipos…"
            style={{
              width: '100%', padding: '9px 12px 9px 36px', boxSizing: 'border-box',
              border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface2)', color: 'var(--text)', fontSize: '0.875rem',
              fontFamily: 'var(--sans)', outline: 'none',
            }}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowImport(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={13} /> Importar CSV
        </Button>
        <Button size="sm" onClick={() => { setAddForm(EMPTY_FORM); setShowAdd(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} /> Agregar equipo
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowImportPrecios(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={13} /> Actualizar precios (CSV)
        </Button>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {/* Cabecera */}
        <div style={{
          display: 'grid', gridTemplateColumns: '160px 110px 1fr 150px 150px 60px',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface2)',
        }}>
          {['Código', 'Familia', 'Descripción', 'Mant.', 'Calib.', ''].map((h, i) => (
            <span key={i} style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>{h}</span>
          ))}
        </div>

        {pageItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: '0.875rem' }}>
            {search ? `Sin resultados para "${search}"` : 'Sin equipos cargados'}
          </div>
        ) : (
          pageItems.map((r, i) => (
            <div
              key={r.codigo}
              style={{
                display: 'grid', gridTemplateColumns: '160px 110px 1fr 150px 150px 60px',
                padding: '11px 16px', alignItems: 'center',
                borderBottom: i < pageItems.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)',
              }}
            >
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>{r.codigo}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{r.familia || '—'}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{r.descripcion || '—'}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: r.codigo_mantenimiento ? 'var(--text)' : 'var(--muted)', fontStyle: r.codigo_mantenimiento ? 'normal' : 'italic' }}>
                {r.codigo_mantenimiento || 'No aplica'}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: r.codigo_calibracion ? 'var(--text)' : 'var(--muted)', fontStyle: r.codigo_calibracion ? 'normal' : 'italic' }}>
                {r.codigo_calibracion || 'No aplica'}
              </span>
              <button
                onClick={() => deleteEquipo(r.codigo)}
                disabled={deleting === r.codigo}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 6, borderRadius: 6, transition: 'all .12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.background = 'var(--red-bg, #fee2e2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                {deleting === r.codigo ? <Spinner size={14} /> : <Trash2 size={14} />}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            {filtered.length} equipo{filtered.length !== 1 ? 's' : ''} — página {page + 1} de {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Anterior</Button>
            <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Siguiente →</Button>
          </div>
        </div>
      )}

      {/* Modal: Agregar equipo */}
      {showAdd && (
        <Modal title="Agregar equipo" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {formField('Código', 'codigo', true)}
            {formField('Familia', 'familia')}
            {formField('Descripción', 'descripcion')}
            {formField('Código Mantenimiento', 'codigo_mantenimiento')}
            {formField('Código Calibración', 'codigo_calibracion')}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button onClick={saveAdd} disabled={addSaving}>
                {addSaving ? <Spinner size={14} /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Importar CSV */}
      {showImport && (
        <Modal title="Importar CSV — Equipos" onClose={() => { if (!importing) { setShowImport(false); setCsvRows(null); setCsvError(''); setImportMsg('') } }} width={640}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Instrucciones formato */}
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
              <p style={{ fontSize: '0.78rem', fontFamily: 'var(--mono)', color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>FORMATO ESPERADO DEL CSV:</p>
              <pre style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--text)', margin: 0, overflowX: 'auto' }}>
{`codigo,familia,descripcion,codigo_mantenimiento,codigo_calibracion
HI 700,pH,Medidor portátil,7000-01,7000-02
HI 9814,Multiparámetro,ORP + pH,9814-01,`}
              </pre>
              <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 8, marginBottom: 0 }}>
                • El encabezado debe ser exactamente como se muestra (minúsculas, guiones bajos).<br />
                • <code>codigo_calibracion</code> puede quedar vacío si no aplica.<br />
                • El archivo debe estar en codificación UTF-8.
              </p>
            </div>

            {/* Upload */}
            <div>
              <label style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                Archivo CSV
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={importing}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                style={{ fontSize: '0.875rem', color: 'var(--text)' }}
              />
              {csvError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'var(--red, #dc2626)', fontSize: '0.8rem' }}>
                  <AlertTriangle size={14} />{csvError}
                </div>
              )}
            </div>

            {/* Preview */}
            {csvRows && (
              <div>
                <p style={{ fontSize: '0.78rem', fontFamily: 'var(--mono)', color: 'var(--muted)', marginBottom: 8 }}>
                  {csvRows.length} filas detectadas — primeras 3:
                </p>
                <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: 10, overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: '0.72rem', fontFamily: 'var(--mono)', width: '100%' }}>
                    <thead>
                      <tr>
                        {['codigo', 'familia', 'descripcion', 'mant.', 'calib.'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '4px 10px', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 3).map((r, i) => (
                        <tr key={i}>
                          <td style={{ padding: '4px 10px', color: 'var(--accent)' }}>{r.codigo}</td>
                          <td style={{ padding: '4px 10px' }}>{r.familia}</td>
                          <td style={{ padding: '4px 10px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion}</td>
                          <td style={{ padding: '4px 10px' }}>{r.codigo_mantenimiento || '—'}</td>
                          <td style={{ padding: '4px 10px' }}>{r.codigo_calibracion || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modo */}
            {csvRows && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
                  Modo de importación
                </label>
                {([['upsert', 'Actualizar / Agregar', 'Inserta los nuevos equipos y actualiza los existentes. No borra nada.'], ['replace', 'Reemplazar todo', 'Elimina TODOS los equipos actuales y los sustituye por los del CSV.']] as const).map(([val, lbl, desc]) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${importMode === val ? 'var(--accent)' : 'var(--border)'}`, background: importMode === val ? 'var(--accent-bg)' : 'var(--surface2)' }}>
                    <input type="radio" name="importMode" value={val} checked={importMode === val} onChange={() => setImportMode(val)} style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{lbl}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {importMode === 'replace' && csvRows && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', fontSize: '0.78rem' }}>
                <AlertTriangle size={15} /> Esta acción eliminará permanentemente todos los equipos actuales antes de importar.
              </div>
            )}

            {importMsg && (
              <p style={{ fontSize: '0.8rem', fontFamily: 'var(--mono)', color: 'var(--accent)', margin: 0 }}>{importMsg}</p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => { setShowImport(false); setCsvRows(null); setCsvError(''); setImportMsg('') }} disabled={importing}>
                Cancelar
              </Button>
              <Button onClick={runImport} disabled={!csvRows || importing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {importing ? <><Spinner size={14} /> {importMsg || 'Importando…'}</> : <><Upload size={13} /> Importar {csvRows ? `(${csvRows.length})` : ''}</>}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Actualizar precios (CSV) */}
      {showImportPrecios && (
        <Modal
          title="Actualizar precios — CSV"
          onClose={() => { if (!importingPrecios) { setShowImportPrecios(false); setPlanPrecios(null); setCsvErrorPrecios(''); setImportMsgPrecios('') } }}
          width={680}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
              <p style={{ fontSize: '0.78rem', fontFamily: 'var(--mono)', color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>FORMATO ESPERADO DEL CSV:</p>
              <pre style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--text)', margin: 0, overflowX: 'auto' }}>
{`Code,Product,Description,valor a cobrar
SP122-1,HI122,HI122 Main Board Spare Part,"$1,214,500.00"`}
              </pre>
              <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 8, marginBottom: 0 }}>
                • Códigos que ya existen: se actualiza solo el precio.<br />
                • Códigos que no existen: se agregan como nuevos.<br />
                • Un mismo código repetido con datos distintos en el archivo (o que ya está duplicado en la base) no se toca — queda listado para revisión manual.
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                Archivo CSV
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={importingPrecios}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePrecios(f) }}
                style={{ fontSize: '0.875rem', color: 'var(--text)' }}
              />
              {csvErrorPrecios && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'var(--red, #dc2626)', fontSize: '0.8rem' }}>
                  <AlertTriangle size={14} />{csvErrorPrecios}
                </div>
              )}
            </div>

            {planPrecios && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', padding: '4px 10px', borderRadius: 8, background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                    {planPrecios.actualizar.length} a actualizar
                  </span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', padding: '4px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    {planPrecios.nuevos.length} nuevo(s)
                  </span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', padding: '4px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    {planPrecios.sinCambio} sin cambios
                  </span>
                  {planPrecios.ambiguos.length > 0 && (
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', padding: '4px 10px', borderRadius: 8, background: '#fef3c7', color: '#92400e' }}>
                      {planPrecios.ambiguos.length} ambiguo(s)
                    </span>
                  )}
                  {planPrecios.invalidas.length > 0 && (
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', padding: '4px 10px', borderRadius: 8, background: '#fee2e2', color: '#991b1b' }}>
                      {planPrecios.invalidas.length} precio(s) inválido(s)
                    </span>
                  )}
                </div>

                {planPrecios.actualizar.length > 0 && (
                  <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: '0.72rem', fontFamily: 'var(--mono)', width: '100%' }}>
                      <thead>
                        <tr>
                          {['Código', 'Producto', 'Precio actual', 'Precio nuevo'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '4px 10px', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {planPrecios.actualizar.slice(0, 5).map(a => (
                          <tr key={a.id}>
                            <td style={{ padding: '4px 10px', color: 'var(--accent)' }}>{a.code}</td>
                            <td style={{ padding: '4px 10px' }}>
                              {a.productActual === a.productNuevo ? a.productNuevo : <>{a.productActual} → <strong>{a.productNuevo}</strong></>}
                            </td>
                            <td style={{ padding: '4px 10px' }}>{fmtCOP(a.precioActual)}</td>
                            <td style={{ padding: '4px 10px', fontWeight: 700 }}>{fmtCOP(a.precioNuevo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {planPrecios.actualizar.length > 5 && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--muted)', padding: '6px 10px', margin: 0 }}>
                        … y {planPrecios.actualizar.length - 5} más
                      </p>
                    )}
                  </div>
                )}

                {planPrecios.ambiguos.length > 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>
                    Códigos ambiguos (no se aplican): {planPrecios.ambiguos.join(', ')}
                  </p>
                )}

                {planPrecios.invalidas.length > 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#991b1b', margin: 0 }}>
                    Precios que no se pudieron leer: {planPrecios.invalidas.slice(0, 5).map(i => `${i.code} ("${i.valor}")`).join(', ')}
                    {planPrecios.invalidas.length > 5 ? '…' : ''}
                  </p>
                )}
              </div>
            )}

            {importMsgPrecios && (
              <p style={{ fontSize: '0.8rem', fontFamily: 'var(--mono)', color: 'var(--accent)', margin: 0 }}>{importMsgPrecios}</p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => { setShowImportPrecios(false); setPlanPrecios(null); setCsvErrorPrecios(''); setImportMsgPrecios('') }} disabled={importingPrecios}>
                Cancelar
              </Button>
              <Button
                onClick={runImportPrecios}
                disabled={!planPrecios || importingPrecios || (planPrecios.actualizar.length === 0 && planPrecios.nuevos.length === 0)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {importingPrecios
                  ? <><Spinner size={14} /> {importMsgPrecios || 'Aplicando…'}</>
                  : <><Upload size={13} /> Aplicar cambios {planPrecios ? `(${planPrecios.actualizar.length + planPrecios.nuevos.length})` : ''}</>}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── CodigosPage ──────────────────────────────────────────────────────────────

export function CodigosPage() {
  const { data, isLoading, error, refetch, isFetching } = useCodigosData()
  const { hasCapability } = useUser()
  const canGestion = hasCapability('gestion_codigos')
  const [tab, setTab] = useState<'equipos' | 'precios' | 'gestion'>('equipos')

  const inetItems  = data?.codInet.items ?? []
  const spItems    = data?.spPrice.items ?? []
  const inetCount  = inetItems.length
  const priceCount = [...new Set(spItems.map(r => r.product).filter(Boolean))].length

  const tabBtn = (key: 'equipos' | 'precios' | 'gestion', icon: string, label: string, count?: number) => (
    <button
      onClick={() => setTab(key)}
      style={{
        flex: 1, padding: '11px 16px', border: 'none', borderRadius: 9,
        background: tab === key ? 'var(--accent)' : 'transparent',
        color: tab === key ? '#fff' : 'var(--muted)',
        fontFamily: 'var(--sans)', fontSize: '0.875rem',
        fontWeight: tab === key ? 700 : 500,
        cursor: 'pointer', transition: 'all .18s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      {icon} {label}
      {count != null && count > 0 && (
        <span style={{
          background: tab === key ? 'rgba(0,0,0,.2)' : 'var(--border)',
          color: 'inherit', fontFamily: 'var(--mono)', fontSize: '0.7rem',
          padding: '1px 7px', borderRadius: 10,
        }}>
          {count}
        </span>
      )}
    </button>
  )

  return (
    <div>
      <Header
        title="Códigos y Partes"
        subtitle="Catálogo de búsqueda de partes Hanna Instruments"
        actions={
          <Button
            variant="ghost" size="sm"
            onClick={() => refetch()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} style={{ animation: isFetching ? 'spin 0.7s linear infinite' : 'none' }} />
            Actualizar
          </Button>
        }
      />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Spinner size={32} />
        </div>
      ) : error ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
            <p style={{ marginBottom: 16 }}>Error al cargar el catálogo.</p>
            <Button onClick={() => refetch()}>Reintentar</Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: 4,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 4, marginBottom: 24,
          }}>
            {tabBtn('equipos', '🔧', 'Equipos', inetCount)}
            {tabBtn('precios', '💰', 'Precios', priceCount)}
            {canGestion && tabBtn('gestion', '⚙️', 'Gestión')}
          </div>

          {tab === 'equipos' && <TabEquipos items={data!.codInet.items} />}
          {tab === 'precios' && <TabPrecios items={data!.spPrice.items} />}
          {tab === 'gestion' && canGestion && <TabGestion items={inetItems} spItems={spItems} />}
        </>
      )}
    </div>
  )
}
