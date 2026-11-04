// Vista dedicada para el estado "Carga al sistema" (exclusiva del flujo de
// sitio: in situ / sede Hanna Dorado): permite cargar el código de
// recepción, las fechas de calibración y los códigos de certificados que
// ese flujo nunca capturó antes (el de laboratorio ya lo hace en "Enviado"),
// antes de pasar a "Envío de certificados".
import { useState } from 'react'
import { toast } from 'sonner'
import { UploadCloud } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, B_INFO, fmtFecha } from '../ui'
import { sumarDias } from '../hooks/useCalibraciones'
import { parsearCodigos, mismosCodigos, unirCodigos, TH_EQUIPOS as TH, TD_EQUIPOS as TD, type CambioCodigosEquipo } from '../equipos'
import type { OrdenCalibracion, OrdenCalibracionEquipo, RvCalibrItem } from '../../../types'
import { NovedadesSlot } from './NovedadesSlot'

// Los códigos de certificado de cada equipo deben coincidir con sus códigos
// de referencia (registrados en "En calibración"). Órdenes que llegaron
// aquí antes de existir los equipos piden también la referencia por equipo.
export function VistaCargaAlSistema({ form, catalogo, codigosSel, equipos, puedeEditar, soloLectura, saving, onGuardarCodigos, onAvanzar }: {
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
  const [fechaInicio, setFechaInicio] = useState(form.certificado_fecha_inicio || '')
  const [fechaFin, setFechaFin] = useState(form.certificado_fecha_fin || '')
  const [refEquipo, setRefEquipo] = useState<Record<string, string>>({})
  const [certEquipo, setCertEquipo] = useState<Record<string, string>>({})
  const [guardandoCodigos, setGuardandoCodigos] = useState(false)
  const editable = !soloLectura && puedeEditar
  const textoRef = (e: OrdenCalibracionEquipo) => refEquipo[e.id] ?? e.codigos_referencia.join(', ')
  const textoCert = (e: OrdenCalibracionEquipo) => certEquipo[e.id] ?? e.codigos_certificado.join(', ')
  // La referencia se pide aquí solo si el equipo no la trae de "En calibración".
  const refEditable = (e: OrdenCalibracionEquipo) => editable && e.codigos_referencia.length === 0
  const filas = equipos.map(e => {
    const ref = parsearCodigos(textoRef(e))
    const cert = parsearCodigos(textoCert(e))
    return { e, ref, cert, coincide: mismosCodigos(ref, cert) }
  })
  // Guía calculada en "En calibración" a partir de la misma fecha de fin de
  // calibración con la que se entra a esta etapa — no se persiste.
  const fechaEstimadaCertificados = form.certificado_fecha_fin ? sumarDias(form.certificado_fecha_fin, 10) : null
  const serviciosSeleccionados = catalogo.filter(c => codigosSel.has(c.codigo))

  async function confirmar() {
    if (!codigoRecepcion.trim()) { toast.error('Ingresa el código de recepción'); return }
    if (!fechaInicio) { toast.error('Ingresa la fecha de inicio de calibración'); return }
    if (!fechaFin) { toast.error('Ingresa la fecha estimada de finalización'); return }
    const cantidad = form.cantidad_equipos ?? 0
    if (equipos.length !== cantidad) {
      toast.error(`La orden es de ${cantidad} equipos y hay ${equipos.length} registrados — complétalos en la sección Equipos`)
      return
    }
    const sinRef = filas.filter(f => !f.ref.length)
    if (sinRef.length) { toast.error(`Falta el código de referencia de: ${sinRef.map(f => f.e.serial).join(', ')}`); return }
    const sinCert = filas.filter(f => !f.cert.length)
    if (sinCert.length) { toast.error(`Falta el código de certificado de: ${sinCert.map(f => f.e.serial).join(', ')}`); return }
    const noCoinciden = filas.filter(f => !f.coincide)
    if (noCoinciden.length) {
      toast.error(`Los certificados no coinciden con los códigos de referencia en: ${noCoinciden.map(f => f.e.serial).join(', ')}`)
      return
    }
    const cambios: CambioCodigosEquipo[] = filas.flatMap(f => {
      const c: CambioCodigosEquipo = { id: f.e.id }
      if (f.ref.join('|') !== f.e.codigos_referencia.join('|')) c.codigos_referencia = f.ref
      if (f.cert.join('|') !== f.e.codigos_certificado.join('|')) c.codigos_certificado = f.cert
      return c.codigos_referencia || c.codigos_certificado ? [c] : []
    })
    if (cambios.length) {
      setGuardandoCodigos(true)
      const ok = await onGuardarCodigos(cambios)
      setGuardandoCodigos(false)
      if (!ok) return
    }
    onAvanzar({
      estado: 'envio_certificados',
      codigo_recepcion: codigoRecepcion.trim(),
      certificado_fecha_inicio: fechaInicio,
      certificado_fecha_fin: fechaFin,
      codigos_referencia: unirCodigos(filas.map(f => f.ref)),
      codigos_certificados: unirCodigos(filas.map(f => f.cert)),
    })
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <UploadCloud size={16} /> {soloLectura ? 'Revisando "Carga al sistema" (solo lectura)' : 'Carga al sistema — resumen de la orden'}
      </div>

      <Seccion titulo="Resumen">
        <Grid2>
          <FG label="Cantidad de equipos">
            <div style={{ ...INP, color: form.cantidad_equipos ? 'var(--text)' : 'var(--muted)' }}>{form.cantidad_equipos ?? '—'}</div>
          </FG>
          <FG label="Fecha de control de calidad">
            <div style={{ ...INP, color: form.fecha_control_calidad ? 'var(--text)' : 'var(--muted)' }}>
              {form.fecha_control_calidad ? fmtFecha(form.fecha_control_calidad) : '—'}
            </div>
          </FG>
          <FG label="Notas de control de calidad">
            <div style={{ ...INP, color: form.notas_control_calidad ? 'var(--text)' : 'var(--muted)' }}>{form.notas_control_calidad || '—'}</div>
          </FG>
          <FG label="Códigos de referencia">
            <div style={{ ...INP, color: form.codigos_referencia ? 'var(--text)' : 'var(--muted)' }}>{form.codigos_referencia || '—'}</div>
          </FG>
          <FG label="Metrólogo(a)">
            <div style={{ ...INP, color: form.nombre_metrologo ? 'var(--text)' : 'var(--muted)' }}>{form.nombre_metrologo || '—'}</div>
          </FG>
          <FG label="Fecha estimada de certificados In Situ (guía, +10 días)">
            <div style={{ ...INP, color: fechaEstimadaCertificados ? 'var(--text)' : 'var(--muted)' }}>
              {fechaEstimadaCertificados ? fmtFecha(fechaEstimadaCertificados) : '—'}
            </div>
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
      </Seccion>
      <NovedadesSlot />

      <Seccion titulo="Carga al sistema">
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
              value={soloLectura ? (form.certificado_fecha_fin || '') : fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </Grid2>
        <div style={{ marginTop: 14 }}>
          <FG label="Códigos de certificados por equipo" required>
            {equipos.length === 0 ? (
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
                      <th style={TH}>Códigos de referencia</th>
                      <th style={{ ...TH, width: '30%' }}>Códigos de certificado</th>
                      <th style={{ ...TH, width: 28 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map(({ e, cert, coincide }) => (
                      <tr key={e.id}>
                        <td style={TD}>{e.referencia}</td>
                        <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{e.serial}</td>
                        <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{e.id_equipo || '—'}</td>
                        <td style={{ ...TD, fontFamily: 'var(--mono)' }}>
                          {refEditable(e) ? (
                            <input value={textoRef(e)} onChange={ev => setRefEquipo(r => ({ ...r, [e.id]: ev.target.value }))}
                              placeholder="Referencia" style={{ ...INP, padding: '7px 10px', fontSize: 13 }} />
                          ) : (e.codigos_referencia.join(', ') || '—')}
                        </td>
                        <td style={TD}>
                          <input
                            value={soloLectura ? e.codigos_certificado.join(', ') : textoCert(e)}
                            onChange={ev => setCertEquipo(c => ({ ...c, [e.id]: ev.target.value }))}
                            placeholder="Separa varios con coma"
                            disabled={!editable}
                            style={{
                              ...INP, padding: '7px 10px', fontSize: 13,
                              ...(cert.length ? { borderColor: coincide ? 'var(--green, #16a34a)' : 'var(--red)' } : {}),
                            }}
                          />
                        </td>
                        <td style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>
                          {cert.length > 0 && (coincide
                            ? <span title="Coincide con los códigos de referencia" style={{ color: 'var(--green, #16a34a)' }}>✓</span>
                            : <span title="No coincide con los códigos de referencia" style={{ color: 'var(--red)' }}>✗</span>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FG>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
            Los códigos de certificado de cada equipo deben ser los mismos que sus códigos de referencia.
          </p>
        </div>
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving || guardandoCodigos} style={PRI}>{saving || guardandoCodigos ? 'Guardando…' : '✓ Envío de certificados →'}</button>
        </div>
      )}
    </div>
  )
}
