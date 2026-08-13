// Vista dedicada para el estado final "Terminado": resumen completo y
// cronológico de todo el proceso, de solo lectura — desde la identificación
// de la orden hasta el envío de certificados. Cada bloque corresponde a una
// etapa del stepper, con los datos que se capturaron ahí.
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import { FG, Grid2, INP, B_INFO, fmtFecha, fmtCOP } from '../ui'
import { MODALIDAD_LABEL } from '../hooks/useCalibraciones'
import { linkOtst, linkSaci, parseOtstCodes } from './CamposCompartidos'
import type { Asesor, OrdenCalibracion, RvCalibrItem } from '../../../types'

function Dato({ label, valor, copiable }: { label: string, valor: string | null | undefined, copiable?: boolean }) {
  function copiar() {
    if (!valor) return
    navigator.clipboard.writeText(valor).then(() => toast.success(`${label} copiado al portapapeles`))
  }
  return (
    <FG label={label}>
      <div
        onClick={copiable && valor ? copiar : undefined}
        title={copiable && valor ? 'Clic para copiar' : undefined}
        style={{ ...INP, color: valor ? 'var(--text)' : 'var(--muted)', cursor: copiable && valor ? 'copy' : 'default' }}
      >
        {valor || '—'}
      </div>
    </FG>
  )
}

function Bloque({ titulo, children, abiertoInicial = true }: { titulo: string, children: React.ReactNode, abiertoInicial?: boolean }) {
  const [abierto, setAbierto] = useState(abiertoInicial)
  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setAbierto(a => !a)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginBottom: abierto ? 14 : 0, fontSize: 12, fontWeight: 700, color: 'var(--accent)',
          textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--sans)',
        }}
      >
        {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {titulo}
      </button>
      {abierto && children}
    </div>
  )
}

export function VistaTerminado({ form, catalogo, codigosSel, asesorSeleccionado }: {
  form: Partial<OrdenCalibracion>
  catalogo: RvCalibrItem[]
  codigosSel: Set<string>
  asesorSeleccionado: Asesor | undefined
}) {
  const otstCodigos = parseOtstCodes(form.otst)
  const serviciosSeleccionados = catalogo.filter(c => codigosSel.has(c.codigo))
  const esLaboratorio = form.modalidad === 'laboratorio_externo'

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--green-bg, #dcfce7)', border: '1px solid var(--green-border, #86efac)', color: 'var(--green, #16a34a)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <CheckCircle2 size={16} /> Orden terminada — resumen completo del proceso
      </div>

      <Bloque titulo="Identificación">
        <Grid2>
          <Dato label="Cliente" valor={form.cliente} />
          <Dato label="No. Orden de Compra" valor={form.numero_oc} />
          <Dato label="Correo cliente" valor={form.correo_cliente} />
          <FG label="Correo asesor(a)">
            <div style={{ ...INP, color: form.correo_asesor ? 'var(--text)' : 'var(--muted)' }}>{form.correo_asesor || '—'}</div>
            {asesorSeleccionado && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                {asesorSeleccionado.nombre}{asesorSeleccionado.plataforma ? ` — ${asesorSeleccionado.plataforma}` : ''}
              </div>
            )}
          </FG>
          <Dato label="RMV/FV" valor={form.rmv_fv} copiable />
          {form.valor_oc_antes_iva != null && <Dato label="Valor OC antes de IVA" valor={fmtCOP(form.valor_oc_antes_iva)} />}
        </Grid2>
      </Bloque>

      <Bloque titulo="Referencias">
        <Grid2>
          {form.saci && (
            <FG label="SACI">
              <a href={linkSaci(form.saci) || undefined} target="_blank" rel="noopener noreferrer" style={{
                ...INP, display: 'block', color: 'var(--accent)', textDecoration: 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{form.saci}</a>
            </FG>
          )}
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
      </Bloque>

      <Bloque titulo="Proceso">
        <Grid2>
          <Dato label="Modalidad" valor={form.modalidad ? MODALIDAD_LABEL[form.modalidad] : null} />
          <Dato label="Proveedor (laboratorio)" valor={form.proveedor} />
          {form.modalidad === 'in_situ' && <Dato label="Lugar de ejecución" valor={form.lugar_ejecucion} />}
          <Dato label="Cantidad de equipos" valor={form.cantidad_equipos != null ? String(form.cantidad_equipos) : null} />
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
        {form.parametros_nota && (
          <div style={{ marginTop: 14 }}>
            <Dato label="Notas de parámetros" valor={form.parametros_nota} />
          </div>
        )}
      </Bloque>

      {form.fecha_salida_mantenimiento && (
        <Bloque titulo="Mantenimiento y reparación">
          <Grid2>
            <Dato label="Fecha estimada de salida de mantenimiento" valor={fmtFecha(form.fecha_salida_mantenimiento)} />
            <Dato label="Fecha de salida de mantenimiento" valor={fmtFecha(form.fecha_salida_mantenimiento_real ?? null)} />
            <Dato label="Nota de mantenimiento" valor={form.nota_mantenimiento} />
          </Grid2>
        </Bloque>
      )}

      {esLaboratorio ? (
        <Bloque titulo="Envío">
          <Grid2>
            <Dato label="Fecha ideal de envío" valor={fmtFecha(form.fecha_programada_envio ?? null)} />
            <Dato label="Fecha de envío" valor={fmtFecha(form.fecha_envio ?? null)} />
            <Dato label="Nota de envío" valor={form.nota_envio} />
          </Grid2>
        </Bloque>
      ) : (
        <Bloque titulo="Visita">
          <Grid2>
            <Dato label="Fecha estimada de la visita" valor={fmtFecha(form.fecha_programada_envio ?? null)} />
            <Dato label="Fecha de llegada del metrólogo(a)" valor={fmtFecha(form.fecha_llegada_metrologo ?? null)} />
          </Grid2>
        </Bloque>
      )}

      <Bloque titulo="Recepción y calibración">
        <Grid2>
          <Dato label="Código de recepción" valor={form.codigo_recepcion} />
          <Dato label="Fecha inicio de calibración" valor={fmtFecha(form.certificado_fecha_inicio ?? null)} />
          <Dato label="Fecha estimada de finalización" valor={fmtFecha(form.certificado_fecha_fin ?? null)} />
          <Dato label="Códigos de certificados" valor={form.codigos_certificados} />
        </Grid2>
      </Bloque>

      {esLaboratorio && (
        <Bloque titulo="Retorno">
          <Grid2>
            <Dato label="Fecha de retorno" valor={fmtFecha(form.fecha_retorno ?? null)} />
            <Dato label="Fecha de llegada" valor={fmtFecha(form.fecha_llegada_hanna ?? null)} />
            <Dato label="Nota de retorno" valor={form.nota_retorno} />
          </Grid2>
        </Bloque>
      )}

      <Bloque titulo="Control de calidad">
        <Grid2>
          <Dato label="Fecha de control de calidad" valor={fmtFecha(form.fecha_control_calidad ?? null)} />
          <Dato label="Notas" valor={form.notas_control_calidad} />
        </Grid2>
      </Bloque>

      <Bloque titulo="Envío de certificados" abiertoInicial={false}>
        <Grid2>
          <Dato label="Fecha de entrega del certificado" valor={fmtFecha(form.fecha_entrega_certificado ?? null)} />
          <Dato label="Carta del certificado" valor={form.carta_certificado} />
        </Grid2>
      </Bloque>
    </div>
  )
}
