// Vista dedicada para el estado "Para enviar" (flujo de laboratorio externo):
// resume lo que ya se definió en la creación (fecha ideal, proveedor, RMV/FV,
// OTST) y solo pide los datos propios de esta transición — fecha real de
// envío y nota de envío — antes de pasar a "Enviado".
import { useState } from 'react'
import { toast } from 'sonner'
import { Send, AlertTriangle } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, GHOST, fmtFecha } from '../ui'
import { hoyISO } from '../hooks/useCalibraciones'
import { linkOtst, parseOtstCodes } from './CamposCompartidos'
import type { OrdenCalibracion } from '../../../types'

export function VistaParaEnviar({ form, puedeEditar, soloLectura, saving, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [fechaEnvio, setFechaEnvio] = useState(() => form.fecha_envio || hoyISO())
  const [notaEnvio, setNotaEnvio] = useState(form.nota_envio || '')
  const [fechaIdeal, setFechaIdeal] = useState(form.fecha_programada_envio || '')
  const otstCodigos = parseOtstCodes(form.otst)
  // Si la orden pasó por mantenimiento, nunca se definió una fecha ideal de
  // envío en la creación — la referencia más útil pasa a ser la fecha real
  // en que salió de mantenimiento. Solo se usa para el resumen en solo
  // lectura: el campo editable sigue siendo fecha_programada_envio.
  const fechaIdealMostrada = form.fecha_programada_envio || form.fecha_salida_mantenimiento_real

  function confirmar() {
    if (!fechaEnvio) { toast.error('Ingresa la fecha de envío'); return }
    if (!notaEnvio.trim()) { toast.error('Ingresa la nota de envío'); return }
    onAvanzar({ estado: 'enviado', fecha_envio: fechaEnvio, nota_envio: notaEnvio.trim() })
  }

  // Guarda solo la fecha ideal de envío, sin avanzar de etapa — vacía
  // también es válida, para volver a "sin programar" si hace falta.
  function guardarFechaIdeal() {
    onAvanzar({ fecha_programada_envio: fechaIdeal || null })
  }

  function copiarRmvFv() {
    if (!form.rmv_fv) return
    navigator.clipboard.writeText(form.rmv_fv).then(() => toast.success('RMV/FV copiado al portapapeles'))
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <Send size={16} /> {soloLectura ? 'Revisando "Para enviar" (solo lectura)' : `Se enviará al proveedor: ${form.proveedor || 'sin definir'}`}
      </div>

      {!form.fecha_programada_envio && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
          background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)',
          marginBottom: 24, fontSize: 13, fontWeight: 600,
        }}>
          <AlertTriangle size={16} /> Envío aún no programado — define abajo la fecha ideal de envío.
        </div>
      )}

      <Seccion titulo="Resumen">
        <Grid2>
          <FG label="Fecha ideal de envío">
            {soloLectura ? (
              <div style={{ ...INP, color: fechaIdealMostrada ? 'var(--text)' : 'var(--muted)' }}>
                {fechaIdealMostrada ? fmtFecha(fechaIdealMostrada) : 'No definida en la creación'}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="date"
                  value={fechaIdeal}
                  onChange={e => setFechaIdeal(e.target.value)}
                  disabled={!puedeEditar}
                  style={INP}
                />
                {puedeEditar && fechaIdeal !== (form.fecha_programada_envio || '') && (
                  <button onClick={guardarFechaIdeal} disabled={saving} style={{ ...GHOST, whiteSpace: 'nowrap' }}>
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                )}
              </div>
            )}
          </FG>
          <FG label="Proveedor (laboratorio)">
            <div style={{ ...INP, color: form.proveedor ? 'var(--text)' : 'var(--muted)' }}>{form.proveedor || '—'}</div>
          </FG>
          <FG label="RMV/FV">
            {form.rmv_fv ? (
              <div
                onClick={copiarRmvFv} title="Clic para copiar"
                style={{ ...INP, cursor: 'copy', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
              >
                {form.rmv_fv}
              </div>
            ) : (
              <div style={{ ...INP, color: 'var(--muted)' }}>—</div>
            )}
          </FG>
          <FG label="OTST">
            {otstCodigos.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {otstCodigos.map(codigo => (
                  <a key={codigo} href={linkOtst(codigo)!} target="_blank" rel="noopener noreferrer" style={{
                    padding: '9px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--accent)', textDecoration: 'none', fontSize: 13, fontFamily: 'var(--sans)',
                  }}>{codigo} ↗</a>
                ))}
              </div>
            ) : (
              <div style={{ ...INP, color: 'var(--muted)' }}>Sin OTST</div>
            )}
          </FG>
        </Grid2>
      </Seccion>

      <Seccion titulo="Datos de envío">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 220 }}>
            <FG label="Fecha de envío" required>
              <input
                type="date"
                value={soloLectura ? (form.fecha_envio || '') : fechaEnvio}
                onChange={e => setFechaEnvio(e.target.value)}
                disabled={soloLectura || !puedeEditar}
                style={INP}
              />
            </FG>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <FG label="Nota de envío" required>
              <input
                value={soloLectura ? (form.nota_envio || '') : notaEnvio}
                onChange={e => setNotaEnvio(e.target.value)}
                disabled={soloLectura || !puedeEditar}
                style={INP}
              />
            </FG>
          </div>
        </div>
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Enviado →'}</button>
        </div>
      )}
    </div>
  )
}
