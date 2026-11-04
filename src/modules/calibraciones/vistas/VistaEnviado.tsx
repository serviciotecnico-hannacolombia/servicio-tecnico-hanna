// Vista dedicada para el estado "Enviado": resume lo que ya se definió antes
// (cantidad de equipos, proveedor, servicios RV CALIBR, OTST, RMV/FV) y pide
// los datos propios de esta transición — código de recepción, códigos de
// certificado de cada equipo y las fechas de calibración — antes de pasar a
// "En calibración". En laboratorio externo no hay códigos de referencia: el
// certificado de cada equipo se registra aquí y la orden guarda la unión.
import { useState } from 'react'
import { toast } from 'sonner'
import { PackageCheck } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, B_INFO } from '../ui'
import { linkOtst, parseOtstCodes } from './CamposCompartidos'
import { semaforoOrden, descripcionSemaforo } from '../hooks/useCalibraciones'
import { parsearCodigos, unirCodigos, TH_EQUIPOS as TH, TD_EQUIPOS as TD, type CambioCodigosEquipo } from '../equipos'
import { ContadorEquipos } from '../EquiposOrden'
import type { OrdenCalibracion, OrdenCalibracionEquipo, RvCalibrItem } from '../../../types'
import { NovedadesSlot } from './NovedadesSlot'

export function VistaEnviado({ form, catalogo, codigosSel, equipos, puedeEditar, soloLectura, saving, onGuardarCodigos, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  catalogo: RvCalibrItem[]
  codigosSel: Set<string>
  equipos: OrdenCalibracionEquipo[]
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onGuardarCodigos: (cambios: CambioCodigosEquipo[]) => Promise<boolean>
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [codigoRecepcion, setCodigoRecepcion] = useState(form.codigo_recepcion || '')
  const [certEquipo, setCertEquipo] = useState<Record<string, string>>({})
  const [guardandoCodigos, setGuardandoCodigos] = useState(false)
  const editable = !soloLectura && puedeEditar
  const textoCert = (e: OrdenCalibracionEquipo) => certEquipo[e.id] ?? e.codigos_certificado.join(', ')
  const filas = equipos.map(e => ({ e, cert: parsearCodigos(textoCert(e)) }))
  // Órdenes anteriores a los equipos: solo tienen el texto de toda la orden.
  const sinCodigosPorEquipo = equipos.every(e => !e.codigos_certificado.length)
  const [fechaInicio, setFechaInicio] = useState(form.certificado_fecha_inicio || '')
  const [fechaFinEstimada, setFechaFinEstimada] = useState(form.certificado_fecha_fin || '')
  const otstCodigos = parseOtstCodes(form.otst)
  const serviciosSeleccionados = catalogo.filter(c => codigosSel.has(c.codigo))

  // El transporte (normalmente TCC) tiene un SLA propio de 3 días hábiles
  // medido desde fecha_envio, independiente de la fecha de calibración
  // (que todavía no existe mientras el equipo está en tránsito).
  const semaforoInfo = form.estado === 'enviado' && form.estado_desde ? {
    estado: form.estado,
    modalidad: form.modalidad ?? null,
    certificado_fecha_fin: form.certificado_fecha_fin ?? null,
    fecha_programada_envio: form.fecha_programada_envio ?? null,
    fecha_llegada_metrologo: form.fecha_llegada_metrologo ?? null,
    fecha_envio: form.fecha_envio ?? null,
    fecha_retorno: form.fecha_retorno ?? null,
    fecha_llegada_hanna: form.fecha_llegada_hanna ?? null,
    estado_desde: form.estado_desde,
    anulada: form.anulada ?? false,
  } : null
  const nivelTransporte = semaforoInfo ? semaforoOrden(semaforoInfo) : 'ok'
  const colorTransporte = nivelTransporte === 'vencida' ? 'var(--red)' : nivelTransporte === 'proxima' ? 'var(--yellow)' : 'var(--text)'

  async function confirmar() {
    if (!codigoRecepcion.trim()) { toast.error('Ingresa el código de recepción'); return }
    if (!fechaInicio) { toast.error('Ingresa la fecha de inicio de calibración'); return }
    if (!fechaFinEstimada) { toast.error('Ingresa la fecha estimada de finalización'); return }
    const cantidad = form.cantidad_equipos ?? 0
    if (equipos.length !== cantidad) {
      toast.error(`La orden es de ${cantidad} equipos y hay ${equipos.length} registrados — complétalos en la sección Equipos`)
      return
    }
    const sinCert = filas.filter(f => !f.cert.length)
    if (sinCert.length) { toast.error(`Falta el código de certificado de: ${sinCert.map(f => f.e.serial).join(', ')}`); return }
    const cambios: CambioCodigosEquipo[] = filas
      .filter(f => f.cert.join('|') !== f.e.codigos_certificado.join('|'))
      .map(f => ({ id: f.e.id, codigos_certificado: f.cert }))
    if (cambios.length) {
      setGuardandoCodigos(true)
      const ok = await onGuardarCodigos(cambios)
      setGuardandoCodigos(false)
      if (!ok) return
    }
    onAvanzar({
      estado: 'en_calibracion',
      codigo_recepcion: codigoRecepcion.trim(),
      codigos_certificados: unirCodigos(filas.map(f => f.cert)),
      certificado_fecha_inicio: fechaInicio,
      certificado_fecha_fin: fechaFinEstimada,
    })
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
        <PackageCheck size={16} /> {soloLectura ? 'Revisando "Enviado" (solo lectura)' : 'Equipo enviado al proveedor — resumen de la orden'}
      </div>

      <Seccion titulo="Resumen">
        <Grid2>
          <FG label="Cantidad de equipos">
            <div style={{ ...INP, color: form.cantidad_equipos ? 'var(--text)' : 'var(--muted)' }}>{form.cantidad_equipos ?? '—'}</div>
          </FG>
          <FG label="Proveedor (laboratorio)">
            <div style={{ ...INP, color: form.proveedor ? 'var(--text)' : 'var(--muted)' }}>{form.proveedor || '—'}</div>
          </FG>
          <FG label="Transporte (SLA 3 días hábiles)">
            <div style={{ ...INP, color: colorTransporte, fontWeight: nivelTransporte === 'ok' ? 400 : 700 }}>
              {semaforoInfo ? descripcionSemaforo(semaforoInfo) : '—'}
            </div>
          </FG>
          <FG label="RMV/FV">
            {form.rmv_fv ? (
              <div
                onClick={copiarRmvFv} title="Clic para copiar"
                style={{ ...INP, cursor: 'copy' }}
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
        <div style={{ marginTop: 14 }}>
          <FG label="Servicios RV CALIBR">
            {serviciosSeleccionados.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {serviciosSeleccionados.map(c => (
                  <span key={c.codigo} title={c.descripcion} style={B_INFO}>{c.codigo} — {c.magnitud}</span>
                ))}
              </div>
            ) : (
              <div style={{ ...INP, color: 'var(--muted)' }}>Sin servicios seleccionados</div>
            )}
          </FG>
        </div>
        <div style={{ marginTop: 14 }}>
          <FG label="Nota de envío">
            <div style={{ ...INP, color: form.nota_envio ? 'var(--text)' : 'var(--muted)' }}>
              {form.nota_envio || 'Sin nota de envío'}
            </div>
          </FG>
        </div>
      </Seccion>
      <NovedadesSlot />

      <Seccion titulo="Recepción y calibración">
        <Grid2>
          <FG label="Código de recepción" required>
            <input
              value={soloLectura ? (form.codigo_recepcion || '') : codigoRecepcion}
              onChange={e => setCodigoRecepcion(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
          <FG label="Fecha inicio de calibración" required>
            <input
              type="date"
              value={soloLectura ? (form.certificado_fecha_inicio || '') : fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
          <FG label="Fecha estimada de finalización" required>
            <input
              type="date"
              value={soloLectura ? (form.certificado_fecha_fin || '') : fechaFinEstimada}
              onChange={e => setFechaFinEstimada(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </Grid2>
        <div style={{ marginTop: 14 }}>
          <FG label="Códigos de certificado por equipo" required>
            {equipos.length === 0 || (soloLectura && sinCodigosPorEquipo && form.codigos_certificados) ? (
              <div style={{ ...INP, color: 'var(--muted)' }}>
                {form.codigos_certificados
                  ? `Registrados para toda la orden: ${form.codigos_certificados}`
                  : 'Registra los equipos de la orden (sección Equipos) para cargar sus certificados.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={TH}>Referencia</th><th style={TH}>Serial</th><th style={TH}>ID</th>
                      <th style={{ ...TH, width: '38%' }}>Códigos de certificado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map(({ e }) => (
                      <tr key={e.id}>
                        <td style={TD}>{e.referencia}</td>
                        <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{e.serial}</td>
                        <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{e.id_equipo || '—'}</td>
                        <td style={TD}>
                          <input
                            value={soloLectura ? e.codigos_certificado.join(', ') : textoCert(e)}
                            onChange={ev => setCertEquipo(c => ({ ...c, [e.id]: ev.target.value }))}
                            placeholder="Separa varios con coma"
                            disabled={!editable}
                            style={{ ...INP, padding: '7px 10px', fontSize: 13 }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FG>
          {!soloLectura && (
            <div style={{ marginTop: 8 }}><ContadorEquipos registrados={equipos.length} cantidad={form.cantidad_equipos} /></div>
          )}
        </div>
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving || guardandoCodigos} style={PRI}>{saving || guardandoCodigos ? 'Guardando…' : '✓ En calibración →'}</button>
        </div>
      )}
    </div>
  )
}
