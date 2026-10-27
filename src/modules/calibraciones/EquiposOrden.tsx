// Equipos de una orden de calibración (referencia, serial e ID). Se usa en
// la creación (borrador local, se guarda al crear la orden) y en el detalle
// de una orden existente (escribe directo en la BD). Permite pegar el bloque
// copiado de la planilla del cliente: 4 líneas por equipo (Marca, Modelo,
// Serie, ID), la marca se ignora — ver parsearEquiposExcel.
import { useState } from 'react'
import { toast } from 'sonner'
import { Check, ClipboardPaste, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { INP, PRI, GHOST } from './ui'
import { parsearEquiposExcel, normalizarSerial, TH_EQUIPOS as TH, TD_EQUIPOS as TD, type EquipoLeido } from './equipos'

export interface FilaEquipo { key: string, referencia: string, serial: string, id_equipo: string | null }

const INP_SM: React.CSSProperties = { ...INP, padding: '7px 10px', fontSize: 13 }
const BTN_ICONO: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, marginRight: 4 }

export function ContadorEquipos({ registrados, cantidad }: { registrados: number, cantidad: number | null | undefined }) {
  const cuadra = !!cantidad && registrados === cantidad
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
      ...(cuadra
        ? { background: 'var(--green-bg, #dcfce7)', color: 'var(--green, #16a34a)', border: '1px solid var(--green-border, #86efac)' }
        : { background: 'var(--yellow-bg)', color: 'var(--yellow)', border: '1px solid var(--yellow-border)' }),
    }}>
      {registrados} de {cantidad ?? '—'} equipos registrados
    </span>
  )
}

export function EquiposOrden({ equipos, cantidad, editable, onAgregar, onEliminar, onEditar }: {
  equipos: FilaEquipo[]
  cantidad: number | null | undefined
  editable: boolean
  onAgregar: (nuevos: EquipoLeido[]) => Promise<boolean>
  // Solo se pasan a Admin (o en el borrador de una orden nueva, que aún no se guarda).
  onEliminar?: (key: string) => Promise<void>
  // Corrige referencia/serial/ID de un equipo ya registrado.
  onEditar?: (key: string, datos: EquipoLeido) => Promise<boolean>
}) {
  const [nuevo, setNuevo] = useState({ referencia: '', serial: '', id_equipo: '' })
  const [editando, setEditando] = useState<{ key: string, referencia: string, serial: string, id_equipo: string } | null>(null)
  const conAcciones = editable || !!onEliminar || !!onEditar
  const [pegando, setPegando] = useState(false)
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const seriales = equipos.map(e => e.serial)
  const lectura = texto.trim() ? parsearEquiposExcel(texto, seriales) : null

  async function agregarUno() {
    const referencia = nuevo.referencia.trim(), serial = nuevo.serial.trim()
    if (!referencia || !serial) { toast.error('Ingresa la referencia y el serial'); return }
    if (seriales.some(s => normalizarSerial(s) === normalizarSerial(serial))) { toast.error(`El serial ${serial} ya está en la orden`); return }
    setGuardando(true)
    const ok = await onAgregar([{ referencia, serial, id_equipo: nuevo.id_equipo.trim() || null }])
    setGuardando(false)
    if (ok) setNuevo({ referencia: '', serial: '', id_equipo: '' })
  }

  async function guardarEdicion() {
    if (!editando || !onEditar) return
    const referencia = editando.referencia.trim(), serial = editando.serial.trim()
    if (!referencia || !serial) { toast.error('Ingresa la referencia y el serial'); return }
    if (equipos.some(e => e.key !== editando.key && normalizarSerial(e.serial) === normalizarSerial(serial))) {
      toast.error(`El serial ${serial} ya está en la orden`); return
    }
    setGuardando(true)
    const ok = await onEditar(editando.key, { referencia, serial, id_equipo: editando.id_equipo.trim() || null })
    setGuardando(false)
    if (ok) setEditando(null)
  }

  async function confirmarPegado() {
    if (!lectura || lectura.errores.length || !lectura.equipos.length) return
    setGuardando(true)
    const ok = await onAgregar(lectura.equipos)
    setGuardando(false)
    if (ok) { setPegando(false); setTexto('') }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <ContadorEquipos registrados={equipos.length} cantidad={cantidad} />
        {editable && (
          <button type="button" onClick={() => setPegando(true)} style={{ ...GHOST, padding: '7px 12px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ClipboardPaste size={14} /> Pegar desde Excel
          </button>
        )}
      </div>

      {(equipos.length > 0 || editable) && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: 32 }}>#</th>
                <th style={TH}>Referencia</th>
                <th style={TH}>Serial</th>
                <th style={TH}>ID</th>
                {conAcciones && <th style={{ ...TH, width: onEditar && onEliminar ? 64 : 44 }} />}
              </tr>
            </thead>
            <tbody>
              {equipos.map((e, i) => editando?.key === e.key ? (
                <tr key={e.key}>
                  <td style={{ ...TD, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11.5 }}>{i + 1}</td>
                  <td style={TD}><input value={editando.referencia} autoFocus onChange={ev => setEditando(d => d && { ...d, referencia: ev.target.value })} style={INP_SM} /></td>
                  <td style={TD}><input value={editando.serial} onChange={ev => setEditando(d => d && { ...d, serial: ev.target.value })} style={INP_SM} /></td>
                  <td style={TD}>
                    <input value={editando.id_equipo} onChange={ev => setEditando(d => d && { ...d, id_equipo: ev.target.value })}
                      onKeyDown={ev => {
                        if (ev.key === 'Enter') { ev.preventDefault(); guardarEdicion() }
                        if (ev.key === 'Escape') setEditando(null)
                      }}
                      style={INP_SM} />
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    <button type="button" title="Guardar cambios" onClick={guardarEdicion} disabled={guardando}
                      style={{ ...BTN_ICONO, color: 'var(--accent)' }}><Check size={15} /></button>
                    <button type="button" title="Cancelar" onClick={() => setEditando(null)}
                      style={BTN_ICONO}><X size={15} /></button>
                  </td>
                </tr>
              ) : (
                <tr key={e.key}>
                  <td style={{ ...TD, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11.5 }}>{i + 1}</td>
                  <td style={TD}>{e.referencia}</td>
                  <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{e.serial}</td>
                  <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{e.id_equipo || '—'}</td>
                  {conAcciones && (
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      {onEditar && (
                        <button type="button" title="Editar equipo (Admin)"
                          onClick={() => setEditando({ key: e.key, referencia: e.referencia, serial: e.serial, id_equipo: e.id_equipo ?? '' })}
                          style={BTN_ICONO}>
                          <Pencil size={14} />
                        </button>
                      )}
                      {onEliminar && (
                        <button type="button" title="Quitar equipo"
                          onClick={() => { if (confirm(`¿Quitar el equipo ${e.serial}?`)) onEliminar(e.key) }}
                          style={BTN_ICONO}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {editable && (
                <tr>
                  <td style={TD} />
                  <td style={TD}><input value={nuevo.referencia} onChange={ev => setNuevo(n => ({ ...n, referencia: ev.target.value }))} placeholder="HI 935005" style={INP_SM} /></td>
                  <td style={TD}><input value={nuevo.serial} onChange={ev => setNuevo(n => ({ ...n, serial: ev.target.value }))} placeholder="E0038411" style={INP_SM} /></td>
                  <td style={TD}>
                    <input value={nuevo.id_equipo} onChange={ev => setNuevo(n => ({ ...n, id_equipo: ev.target.value }))}
                      onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); agregarUno() } }}
                      placeholder="0889" style={INP_SM} />
                  </td>
                  <td style={TD}>
                    <button type="button" title="Agregar equipo" onClick={agregarUno} disabled={guardando}
                      style={{ ...PRI, padding: '7px 9px' }}><Plus size={14} /></button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!editable && equipos.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>Sin equipos registrados.</p>
      )}

      <Modal open={pegando} onClose={() => setPegando(false)} title="Pegar equipos desde Excel" width={620}>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
          Copia la columna de la planilla del cliente: <strong>4 líneas por equipo</strong> — Marca, Modelo, Serie e ID.
          La marca se ignora. También sirve si copias la columna de etiquetas (Marca, Modelo, Serie, ID).
        </p>
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={8} autoFocus
          placeholder={'HANNA\nHI 935005\nE0038411\n0889\nHANNA\nHI 93522\n…'}
          style={{ ...INP, resize: 'vertical', fontFamily: 'var(--mono)', fontSize: 12.5 }} />

        {lectura && lectura.errores.length > 0 && (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', fontSize: 12.5 }}>
            {lectura.errores.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}
        {lectura && lectura.equipos.length > 0 && (
          <div style={{ marginTop: 12, maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={TH}>#</th><th style={TH}>Referencia</th><th style={TH}>Serial</th><th style={TH}>ID</th></tr></thead>
              <tbody>
                {lectura.equipos.map((e, i) => (
                  <tr key={i}>
                    <td style={{ ...TD, color: 'var(--muted)' }}>{equipos.length + i + 1}</td>
                    <td style={TD}>{e.referencia}</td>
                    <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{e.serial}</td>
                    <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{e.id_equipo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" onClick={() => setPegando(false)} style={GHOST}>Cancelar</button>
          <button type="button" onClick={confirmarPegado}
            disabled={guardando || !lectura || lectura.errores.length > 0 || lectura.equipos.length === 0}
            style={{ ...PRI, opacity: lectura && !lectura.errores.length && lectura.equipos.length ? 1 : .5 }}>
            {guardando ? 'Guardando…' : `Agregar ${lectura?.equipos.length || 0} equipos`}
          </button>
        </div>
      </Modal>
    </div>
  )
}
