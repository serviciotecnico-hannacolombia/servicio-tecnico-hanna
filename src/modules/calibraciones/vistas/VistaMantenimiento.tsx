// Vista dedicada para el estado "En mantenimiento y reparación": solo
// muestra los datos relevantes para esta etapa (Identificación, Referencias
// y la fecha de salida) en vez del formulario completo de la orden.
import { Wrench } from 'lucide-react'
import { FG, Seccion, INP, PRI } from '../ui'
import type { Asesor, OrdenCalibracion } from '../../../types'
import { IdentificacionFields, ReferenciasFields } from './CamposCompartidos'

export function VistaMantenimiento({ form, set, setForm, puedeEditar, soloLectura, asesores, asesorSeleccionado, saving, onTerminar }: {
  form: Partial<OrdenCalibracion>
  set: <K extends keyof OrdenCalibracion>(key: K, value: OrdenCalibracion[K]) => void
  setForm: React.Dispatch<React.SetStateAction<Partial<OrdenCalibracion>>>
  puedeEditar: boolean
  soloLectura: boolean
  asesores: Asesor[]
  asesorSeleccionado: Asesor | undefined
  saving: boolean
  onTerminar: () => void
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <Wrench size={16} /> {soloLectura ? 'Revisando "En mantenimiento y reparación" (solo lectura)' : 'Equipo en mantenimiento y reparación — solo se muestran los datos relevantes para esta etapa.'}
      </div>
      <fieldset disabled={!puedeEditar || soloLectura} style={{ border: 'none', padding: 0, margin: 0 }}>
        <IdentificacionFields form={form} set={set} esNueva={false} asesores={asesores} asesorSeleccionado={asesorSeleccionado} />
        <ReferenciasFields form={form} setForm={setForm} set={set} />
        <Seccion titulo="Mantenimiento">
          <div style={{ maxWidth: 260 }}>
            <FG label="Fecha de salida de mantenimiento">
              <input
                type="date" value={form.fecha_salida_mantenimiento || ''}
                onChange={e => set('fecha_salida_mantenimiento', e.target.value || null)}
                style={INP}
              />
            </FG>
          </div>
        </Seccion>
      </fieldset>
      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button onClick={onTerminar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Mantenimiento terminado →'}</button>
        </div>
      )}
    </div>
  )
}
