// Precios base = catálogo de códigos IN SITU. Se edita en la tabla: precio,
// horas y nombre (renombrar se propaga a todas las referencias por el ON
// UPDATE CASCADE de codigos_inet), agregar y eliminar (sus referencias
// quedan sin asignar).
import { Fragment, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Spinner } from '../../../components/ui/Spinner'
import { useCodigosInSitu, useEquiposInSitu, useInvalidarMantInSitu, fmtCOP, fmtHoras } from '../hooks/useMantInSitu'
import { actualizarCodigo, crearCodigo, eliminarCodigo } from '../acciones'
import { leerNumero } from '../csv'
import { exportarCodigos, planCodigos } from '../importaciones'
import { CsvAcciones } from '../CsvAcciones'
import { EncabezadoPanel } from './EncabezadoPanel'
import { INP, PRI, GHOST } from '../ui'
import type { MantInSituCodigo } from '../../../types'

interface Borrador { codigo: string, precio: string, horas: string }

function validar(b: Borrador): { codigo: string, precio: number, horas: number } | string {
  const codigo = b.codigo.trim().toUpperCase()
  if (!codigo) return 'Ingresa el código'
  const precio = leerNumero(b.precio, true)
  if (precio == null || isNaN(precio) || precio <= 0) return 'Precio no válido (sin decimales, mayor a 0)'
  const horas = leerNumero(b.horas)
  if (horas == null || isNaN(horas) || horas <= 0) return 'Horas no válidas'
  return { codigo, precio, horas }
}

export function PreciosPanel() {
  const { data: codigos = [], isLoading } = useCodigosInSitu()
  const { equipos } = useEquiposInSitu()
  const invalidar = useInvalidarMantInSitu()
  const [editando, setEditando] = useState<string | null>(null)   // código original en edición, '' = nuevo
  const [borrador, setBorrador] = useState<Borrador>({ codigo: '', precio: '', horas: '' })
  const [guardando, setGuardando] = useState(false)

  const uso = new Map<string, number>()
  for (const e of equipos) if (e.codigo) uso.set(e.codigo, (uso.get(e.codigo) || 0) + 1)

  function editar(c: MantInSituCodigo) {
    setEditando(c.codigo)
    setBorrador({ codigo: c.codigo, precio: String(c.precio), horas: String(c.horas) })
  }
  function nuevo() {
    setEditando('')
    setBorrador({ codigo: '', precio: '', horas: '' })
  }

  async function guardar() {
    const v = validar(borrador)
    if (typeof v === 'string') { toast.error(v); return }
    const renombra = editando && editando !== v.codigo
    if (renombra && codigos.some(c => c.codigo === v.codigo)) { toast.error(`El código ${v.codigo} ya existe`); return }
    if (renombra && (uso.get(editando) || 0) > 0 && !confirm(`Renombrar ${editando} → ${v.codigo} actualiza las ${uso.get(editando)} referencias que lo usan (también en Códigos). ¿Continuar?`)) return
    setGuardando(true)
    const error = editando ? await actualizarCodigo(editando, v) : await crearCodigo(v)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error); return }
    toast.success(editando ? 'Código actualizado' : 'Código creado')
    invalidar()
    setEditando(null)
  }

  async function eliminar(c: MantInSituCodigo) {
    const n = uso.get(c.codigo) || 0
    if (!confirm(n ? `¿Eliminar ${c.codigo}? Sus ${n} referencias quedarán sin código in situ (pendientes).` : `¿Eliminar ${c.codigo}?`)) return
    const error = await eliminarCodigo(c.codigo)
    if (error) { toast.error('Error: ' + error); return }
    toast.success('Código eliminado')
    invalidar()
  }

  if (isLoading) return <Card><Spinner size={24} /></Card>

  const filaEdicion = (
    <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--accent-bg)' }}>
      <td style={TD}><input value={borrador.codigo} onChange={e => setBorrador(b => ({ ...b, codigo: e.target.value.toUpperCase() }))} placeholder="MANTCHECKER.02" style={CELDA} autoFocus /></td>
      <td style={TD}><input value={borrador.horas} onChange={e => setBorrador(b => ({ ...b, horas: e.target.value }))} placeholder="h" inputMode="decimal" style={{ ...CELDA, textAlign: 'right' }} /></td>
      <td style={TD}><input value={borrador.precio} onChange={e => setBorrador(b => ({ ...b, precio: e.target.value }))} placeholder="COP" inputMode="numeric" style={{ ...CELDA, textAlign: 'right' }} onKeyDown={e => e.key === 'Enter' && guardar()} /></td>
      <td style={{ ...TD, textAlign: 'right', color: 'var(--muted)' }}>{editando ? uso.get(editando) || 0 : '—'}</td>
      <td style={{ ...TD, whiteSpace: 'nowrap', textAlign: 'right' }}>
        <button onClick={guardar} disabled={guardando} title="Guardar" style={{ ...PRI, padding: '5px 9px', display: 'inline-flex' }}><Check size={13} /></button>{' '}
        <button onClick={() => setEditando(null)} title="Cancelar" style={{ ...GHOST, padding: '5px 9px', display: 'inline-flex' }}><X size={13} /></button>
      </td>
    </tr>
  )

  return (
    <Card>
      <EncabezadoPanel
        titulo="Precios base (códigos in situ)"
        subtitulo="Se aplican a las referencias sin precio u horas propios. Renombrar un código lo actualiza en todas sus referencias."
        acciones={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={nuevo} disabled={editando !== null} style={{ ...GHOST, padding: '7px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> Nuevo código</button>
            <CsvAcciones
              titulo="Precios base"
              onExportar={() => exportarCodigos(codigos)}
              planificar={csv => planCodigos(csv, codigos)}
              ayuda={<>Solo se actualizan códigos que ya existen (no se crean ni renombran desde el CSV — eso se hace en la tabla). Precio sin decimales y horas mayores a 0.</>}
            />
          </div>
        }
      />
      <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)' }}>
              {['Código in situ', 'Horas estándar', 'Precio base', 'Referencias', ''].map((h, i) => <th key={i} style={{ ...TH, textAlign: i >= 1 && i <= 3 ? 'right' : 'left' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {editando === '' && filaEdicion}
            {codigos.map(c => editando === c.codigo ? <Fragment key={c.codigo}>{filaEdicion}</Fragment> : (
              <tr key={c.codigo} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ ...TD, fontFamily: 'var(--mono)', fontWeight: 700 }}>{c.codigo}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{fmtHoras(c.horas)}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmtCOP(c.precio)}</td>
                <td style={{ ...TD, textAlign: 'right', color: 'var(--muted)' }}>{uso.get(c.codigo) || 0}</td>
                <td style={{ ...TD, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <button onClick={() => editar(c)} disabled={editando !== null} title="Editar" style={{ ...GHOST, padding: '5px 9px', display: 'inline-flex' }}><Pencil size={13} /></button>{' '}
                  <button onClick={() => eliminar(c)} disabled={editando !== null} title="Eliminar" style={{ ...GHOST, padding: '5px 9px', display: 'inline-flex', color: 'var(--red)' }}><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

const TH: React.CSSProperties = { padding: '8px 12px', fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)', fontWeight: 600 }
const TD: React.CSSProperties = { padding: '8px 12px' }
const CELDA: React.CSSProperties = { ...INP, padding: '6px 8px', fontSize: 12.5 }
