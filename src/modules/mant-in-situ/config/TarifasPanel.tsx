// Tarifas de peajes (categoría I): editables en la tabla, por ejemplo cuando
// suben a comienzo de año. Afectan a todos los destinos cuya ruta pasa por
// ese peaje (salvo los que tienen peaje manual).
import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Check, X } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Spinner } from '../../../components/ui/Spinner'
import { useDestinosInSitu, useInvalidarMantInSitu, fmtCOP } from '../hooks/useMantInSitu'
import { guardarPeaje } from '../acciones'
import { leerNumero } from '../csv'
import { exportarPeajes, planPeajes } from '../importaciones'
import { CsvAcciones } from '../CsvAcciones'
import { EncabezadoPanel } from './EncabezadoPanel'
import { INP, PRI, GHOST } from '../ui'
import type { MantInSituPeaje } from '../../../types'

export function TarifasPanel() {
  const { data, isLoading } = useDestinosInSitu()
  const invalidar = useInvalidarMantInSitu()
  const [editando, setEditando] = useState<string | null>(null)
  const [tarifa, setTarifa] = useState('')
  const [fecha, setFecha] = useState('')
  const [guardando, setGuardando] = useState(false)
  if (isLoading || !data) return <Card><Spinner size={24} /></Card>

  const usos = new Map<string, Set<string>>()
  for (const p of data.pasos) usos.set(p.peaje_id, (usos.get(p.peaje_id) ?? new Set()).add(p.destino_codigo))

  function editar(p: MantInSituPeaje) {
    setEditando(p.id); setTarifa(String(p.tarifa_categoria_i)); setFecha(p.actualizado ?? '')
  }
  async function guardar(p: MantInSituPeaje) {
    const n = leerNumero(tarifa, true)
    if (n == null || isNaN(n) || n < 0) { toast.error('Tarifa no válida (sin decimales)'); return }
    setGuardando(true)
    const error = await guardarPeaje(p.id, { tarifa_categoria_i: n, actualizado: fecha || null })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error); return }
    toast.success(`${p.nombre} actualizado`)
    invalidar()
    setEditando(null)
  }

  return (
    <Card>
      <EncabezadoPanel
        titulo="Tarifas de peajes"
        subtitulo="Categoría I. Un cambio aplica a todos los destinos cuya ruta pasa por el peaje (salvo los que tienen peaje manual)."
        acciones={
          <CsvAcciones
            titulo="Tarifas de peajes"
            onExportar={() => exportarPeajes(data.peajes)}
            planificar={csv => planPeajes(csv, data.peajes)}
            ayuda={<>Solo se actualizan peajes que ya existen (por nombre). Tarifa sin decimales; actualizado en AAAA-MM-DD o DD/MM/AAAA. Sector, sentido y fuente se ignoran.</>}
          />
        }
      />
      <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)' }}>
              {['Peaje', 'Sector y sentido', 'Destinos', 'Tarifa cat. I', 'Actualizado', ''].map((h, i) => <th key={i} style={{ ...TH, textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.peajes.map(p => {
              const enEdicion = editando === p.id
              return (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: enEdicion ? 'var(--accent-bg)' : undefined }}>
                  <td style={{ ...TD, fontWeight: 700 }}>{p.nombre}<div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 400 }}>{p.fuente}</div></td>
                  <td style={{ ...TD, fontSize: 11.5, color: 'var(--muted)' }}>{p.sector}{p.sentido && <div>{p.sentido}</div>}</td>
                  <td style={{ ...TD, color: 'var(--muted)' }}>{usos.get(p.id)?.size ?? 0}</td>
                  <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {enEdicion
                      ? <input value={tarifa} onChange={e => setTarifa(e.target.value)} inputMode="numeric" autoFocus style={{ ...INP, padding: '5px 8px', width: 110, textAlign: 'right' }} onKeyDown={e => e.key === 'Enter' && guardar(p)} />
                      : <strong>{fmtCOP(p.tarifa_categoria_i)}</strong>}
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    {enEdicion
                      ? <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ ...INP, padding: '5px 8px', width: 150 }} />
                      : (p.actualizado ? new Date(p.actualizado + 'T00:00:00').toLocaleDateString('es-CO') : '—')}
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {enEdicion ? (
                      <>
                        <button onClick={() => guardar(p)} disabled={guardando} title="Guardar" style={{ ...PRI, padding: '5px 9px', display: 'inline-flex' }}><Check size={13} /></button>{' '}
                        <button onClick={() => setEditando(null)} title="Cancelar" style={{ ...GHOST, padding: '5px 9px', display: 'inline-flex' }}><X size={13} /></button>
                      </>
                    ) : (
                      <button onClick={() => editar(p)} disabled={editando !== null} title="Editar" style={{ ...GHOST, padding: '5px 9px', display: 'inline-flex' }}><Pencil size={13} /></button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

const TH: React.CSSProperties = { padding: '8px 12px', fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)', fontWeight: 600 }
const TD: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'top' }
