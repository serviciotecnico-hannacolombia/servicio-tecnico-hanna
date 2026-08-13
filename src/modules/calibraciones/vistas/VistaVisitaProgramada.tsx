// Vista dedicada para el estado "Visita programada" (sede Hanna Dorado /
// in situ): solo muestra el bloque de Proceso, con la fecha de la visita
// integrada ahí — y alerta si esa fecha todavía no está definida.
import { AlertTriangle, CalendarClock } from 'lucide-react'
import { FG, Seccion, Grid2, INP } from '../ui'
import { MODALIDAD_LABEL, PROVEEDOR_SEDE_HANNA } from '../hooks/useCalibraciones'
import type { EtapaFlujo } from '../hooks/useCalibraciones'
import { BloqueAvanzar } from './CamposCompartidos'
import type { CorreoProveedor, Modalidad, OrdenCalibracion } from '../../../types'

export function VistaVisitaProgramada({ etapa, form, set, setForm, puedeEditar, soloLectura, saving, onAvanzar, proveedores }: {
  etapa: EtapaFlujo
  form: Partial<OrdenCalibracion>
  set: <K extends keyof OrdenCalibracion>(key: K, value: OrdenCalibracion[K]) => void
  setForm: React.Dispatch<React.SetStateAction<Partial<OrdenCalibracion>>>
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
  proveedores: CorreoProveedor[]
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <CalendarClock size={16} /> {soloLectura ? 'Revisando "Visita programada" (solo lectura)' : 'Visita programada — solo se muestra el bloque de Proceso para esta etapa.'}
      </div>
      <fieldset disabled={!puedeEditar || soloLectura} style={{ border: 'none', padding: 0, margin: 0 }}>
        <Seccion titulo="Proceso">
          <Grid2>
            <FG label="Modalidad">
              <select
                value={form.modalidad || ''}
                onChange={e => {
                  const m = (e.target.value || null) as Modalidad | null
                  setForm(f => ({
                    ...f,
                    modalidad: m,
                    proveedor: m === 'sede_hanna_dorado' ? PROVEEDOR_SEDE_HANNA : f.proveedor,
                    lugar_ejecucion: m === 'in_situ' ? f.lugar_ejecucion : '',
                  }))
                }}
                style={INP}
              >
                <option value="">Sin definir</option>
                {(['laboratorio_externo', 'in_situ', 'sede_hanna_dorado'] as Modalidad[]).map(m => (
                  <option key={m} value={m}>{MODALIDAD_LABEL[m]}</option>
                ))}
              </select>
            </FG>
            <FG label="Proveedor (laboratorio)">
              {form.modalidad === 'sede_hanna_dorado' ? (
                <div style={{ ...INP, color: 'var(--muted)' }}>{PROVEEDOR_SEDE_HANNA} (único proveedor en esta sede)</div>
              ) : (
                <>
                  <input value={form.proveedor || ''} onChange={e => set('proveedor', e.target.value)} list="proveedores-sugeridos" style={INP} />
                  <datalist id="proveedores-sugeridos">
                    {proveedores.filter(p => p.activo).map(p => <option key={p.id} value={p.nombre} />)}
                  </datalist>
                </>
              )}
            </FG>
            {form.modalidad === 'in_situ' && (
              <FG label="Lugar de ejecución">
                <input value={form.lugar_ejecucion || ''} onChange={e => set('lugar_ejecucion', e.target.value)} placeholder="Dirección o instalaciones del cliente" style={INP} />
              </FG>
            )}
            <FG label="Fecha de la visita">
              <input
                type="date" value={form.fecha_programada_envio || ''}
                onChange={e => set('fecha_programada_envio', e.target.value || null)}
                style={INP}
              />
            </FG>
          </Grid2>

          {!form.fecha_programada_envio && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 14px', borderRadius: 8,
              background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)',
              fontSize: 12.5, fontWeight: 600,
            }}>
              <AlertTriangle size={14} /> Esta orden no tiene fecha de visita definida.
            </div>
          )}
        </Seccion>
      </fieldset>
      {etapa.siguiente && (
        <BloqueAvanzar
          siguiente={etapa.siguiente} form={form} puedeEditar={puedeEditar} soloLectura={soloLectura}
          saving={saving} onAvanzar={onAvanzar}
        />
      )}
    </div>
  )
}
