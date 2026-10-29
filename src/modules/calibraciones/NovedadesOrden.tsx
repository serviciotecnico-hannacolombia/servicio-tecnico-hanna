// Novedades de una orden de calibración como eventos: modal para abrir una
// (con equipos afectados opcionales), tarjetas de las abiertas con avances y
// solución, y la marca amarilla que se dibuja sobre cada paso del Stepper.
// La lógica de guardado y correo vive en OrdenCalibracionDetailPage.
import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Check } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { ESTADO_LABEL } from './hooks/useCalibraciones'
import { FG, INP, PRI, GHOST, fmtFecha, fechaLocalISO } from './ui'
import type { OrdenCalibracionEquipo, OrdenCalibracionNovedad } from '../../types'

function horaLocal(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fechaHora(iso: string): string {
  return `${fmtFecha(fechaLocalISO(iso))} ${horaLocal(iso)}`
}

function antiguedad(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return dias <= 0 ? 'hoy' : dias === 1 ? '1 día' : `${dias} días`
}

function textoEquipo(e: OrdenCalibracionEquipo): string {
  return [e.referencia, e.serial, e.id_equipo ? `ID ${e.id_equipo}` : ''].filter(Boolean).join(' · ')
}

function EquiposAfectados({ ids, equipos }: { ids: string[], equipos: OrdenCalibracionEquipo[] }) {
  const afectados = equipos.filter(e => ids.includes(e.id))
  if (!afectados.length) return null
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
      {afectados.map(e => (
        <span key={e.id} style={{
          fontFamily: 'var(--mono)', fontSize: 11, padding: '2px 8px', borderRadius: 6,
          background: 'var(--surface)', border: '1px solid var(--yellow-border)', color: 'var(--text)',
        }}>{textoEquipo(e)}</span>
      ))}
    </div>
  )
}

// ── Modal: abrir novedad ─────────────────────────────────────────────────────

export function ModalAbrirNovedad({ etapaLabel, equipos, onClose, onConfirmar }: {
  etapaLabel: string
  equipos: OrdenCalibracionEquipo[]
  onClose: () => void
  onConfirmar: (detalle: string, equiposIds: string[]) => Promise<boolean>
}) {
  const [detalle, setDetalle] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)

  const toggle = (id: string) => setSel(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  async function confirmar() {
    if (!detalle.trim()) { toast.error('Ingresa el detalle de la novedad'); return }
    setGuardando(true)
    const ok = await onConfirmar(detalle, [...sel])
    setGuardando(false)
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title="Marcar novedad" width={520}>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
        Queda registrada en la etapa <strong style={{ color: 'var(--text)' }}>{etapaLabel}</strong> y se envía un correo al asesor(a).
        No cambia el estado ni las fechas de la orden.
      </p>
      <FG label="Detalle de la novedad" required>
        <textarea value={detalle} onChange={e => setDetalle(e.target.value)} rows={3} autoFocus
          placeholder="Certificado del equipo llegó con el serial errado"
          style={{ ...INP, resize: 'vertical' }} />
      </FG>
      {equipos.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <FG label="Equipos afectados" hint="Opcional. Sale en el correo y en la tarjeta de la novedad.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
              {equipos.map(e => (
                <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', padding: '3px 0' }}>
                  <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggle(e.id)} />
                  <span style={{ fontFamily: 'var(--mono)' }}>{textoEquipo(e)}</span>
                </label>
              ))}
            </div>
          </FG>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={confirmar} disabled={guardando} style={PRI}>
          {guardando ? 'Guardando…' : '⚠ Marcar novedad'}
        </button>
      </div>
    </Modal>
  )
}

// ── Tarjeta de una novedad abierta ───────────────────────────────────────────

function TarjetaNovedad({ novedad, equipos, puedeEditar, nombre, onAvance, onResolver }: {
  novedad: OrdenCalibracionNovedad
  equipos: OrdenCalibracionEquipo[]
  puedeEditar: boolean
  nombre: (id: string | null) => string
  onAvance: (novedad: OrdenCalibracionNovedad, mensaje: string, notificar: boolean) => Promise<boolean>
  onResolver: (novedad: OrdenCalibracionNovedad, resolucion: string) => Promise<boolean>
}) {
  const [avance, setAvance] = useState('')
  const [notificar, setNotificar] = useState(false)
  const [resolviendo, setResolviendo] = useState(false)
  const [resolucion, setResolucion] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function agregarAvance() {
    if (!avance.trim()) { toast.error('Escribe el avance'); return }
    setGuardando(true)
    const ok = await onAvance(novedad, avance, notificar)
    setGuardando(false)
    if (ok) { setAvance(''); setNotificar(false) }
  }

  async function resolver() {
    if (!resolucion.trim()) { toast.error('Ingresa cómo se resolvió la novedad'); return }
    setGuardando(true)
    const ok = await onResolver(novedad, resolucion)
    setGuardando(false)
    if (ok) { setResolviendo(false); setResolucion('') }
  }

  return (
    <div style={{
      padding: '14px 18px', borderRadius: 'var(--radius)', background: 'var(--yellow-bg)',
      border: '1px solid var(--yellow-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <AlertTriangle size={16} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>
              Novedad en {ESTADO_LABEL[novedad.etapa] || novedad.etapa} · {antiguedad(novedad.created_at)}
            </span>
            <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
              {nombre(novedad.abierta_por)} · {fechaHora(novedad.created_at)}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{novedad.detalle}</div>
          <EquiposAfectados ids={novedad.equipos_ids} equipos={equipos} />

          {novedad.avances.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, borderLeft: '2px solid var(--yellow-border)', paddingLeft: 10 }}>
              {novedad.avances.map(a => (
                <div key={a.id} style={{ fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ color: 'var(--text)' }}>{nombre(a.usuario_id)}</strong>
                    <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 10.5, flexShrink: 0 }}>
                      {a.notificado && <span title="Se notificó al asesor(a)">✉ </span>}{fechaHora(a.created_at)}
                    </span>
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{a.mensaje}</div>
                </div>
              ))}
            </div>
          )}

          {puedeEditar && !resolviendo && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={avance} onChange={e => setAvance(e.target.value)} placeholder="Agregar un avance..."
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarAvance() } }}
                style={{ ...INP, flex: 1, minWidth: 220 }} />
              <label title="Envía al asesor(a) el historial completo de esta novedad"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={notificar} onChange={e => setNotificar(e.target.checked)} />
                Notificar al asesor
              </label>
              <button onClick={agregarAvance} disabled={guardando} style={GHOST}>+ Avance</button>
              <button onClick={() => setResolviendo(true)} disabled={guardando} style={PRI}>✓ Dar solución</button>
            </div>
          )}
          {puedeEditar && resolviendo && (
            <div style={{ marginTop: 12 }}>
              <textarea value={resolucion} onChange={e => setResolucion(e.target.value)} rows={2} autoFocus
                placeholder="Cómo se resolvió (se envía al asesor junto con el historial)"
                style={{ ...INP, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setResolviendo(false)} style={GHOST}>Cancelar</button>
                <button onClick={resolver} disabled={guardando} style={PRI}>{guardando ? 'Guardando…' : '✓ Dar solución'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function NovedadesActivas({ novedades, ...props }: {
  novedades: OrdenCalibracionNovedad[]
  equipos: OrdenCalibracionEquipo[]
  puedeEditar: boolean
  nombre: (id: string | null) => string
  onAvance: (novedad: OrdenCalibracionNovedad, mensaje: string, notificar: boolean) => Promise<boolean>
  onResolver: (novedad: OrdenCalibracionNovedad, resolucion: string) => Promise<boolean>
}) {
  const abiertas = novedades.filter(n => !n.resuelta_at)
  if (!abiertas.length) return null
  return (
    <div id="novedades-orden" style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '4px 0' }}>
      {abiertas.map(n => <TarjetaNovedad key={n.id} novedad={n} {...props} />)}
    </div>
  )
}

// ── Marca sobre un paso del Stepper ──────────────────────────────────────────

const ESTILOS_PULSO = `
@keyframes novedad-pulso { 0% { box-shadow: 0 0 0 0 rgba(245,158,11,.6) } 70% { box-shadow: 0 0 0 7px rgba(245,158,11,0) } 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0) } }
.novedad-pulso { animation: novedad-pulso 1.6s ease-out infinite }
`

// Etiqueta amarilla encima del paso: pulsando si hay alguna abierta, apagada
// con ✓ si todas las de esa etapa ya se resolvieron. Al pasar el mouse
// muestra el detalle; con abiertas, el clic lleva a sus tarjetas.
export function MarcaNovedadPaso({ novedades, nombre }: {
  novedades: OrdenCalibracionNovedad[]
  nombre: (id: string | null) => string
}) {
  const [hover, setHover] = useState(false)
  const abiertas = novedades.filter(n => !n.resuelta_at)
  const activa = abiertas.length > 0
  const texto = novedades.length > 1
    ? `${novedades.length} novedades`
    : activa ? `Novedad · ${antiguedad(novedades[0].created_at)}` : 'Novedad'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={e => {
        e.stopPropagation()
        if (activa) document.getElementById('novedades-orden')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }}
      style={{ position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}
    >
      <style>{ESTILOS_PULSO}</style>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        padding: '1px 8px', borderRadius: 20, fontSize: 10.5, fontFamily: 'var(--mono)', fontWeight: 600,
        cursor: activa ? 'pointer' : 'default',
        background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)',
        opacity: activa ? 1 : 0.6,
      }}>
        {activa
          ? <span className="novedad-pulso" style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
          : <Check size={10} />}
        {texto}
      </span>

      {hover && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', width: 280,
          background: 'var(--surface)', border: '1px solid var(--yellow-border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: '10px 12px', textAlign: 'left',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {novedades.map(n => (
            <div key={n.id} style={{ fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: n.resuelta_at ? 'var(--muted)' : 'var(--yellow)', fontWeight: 700 }}>
                <span>{n.resuelta_at ? '✓ Resuelta' : '⚠ Abierta'}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 400, fontSize: 10.5 }}>{fechaHora(n.created_at)}</span>
              </div>
              <div style={{ color: 'var(--text)', marginTop: 3, whiteSpace: 'pre-wrap' }}>{n.detalle}</div>
              <div style={{ color: 'var(--muted)', marginTop: 3, fontSize: 11 }}>
                {nombre(n.abierta_por)} · {n.avances.length} {n.avances.length === 1 ? 'avance' : 'avances'}
              </div>
              {n.resuelta_at && n.resolucion && (
                <div style={{ color: 'var(--muted)', marginTop: 3, fontSize: 11 }}>Solución: {n.resolucion}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
