// Vista genérica para las etapas "de tránsito" que solo necesitan capturar
// los datos de su propia transición (Enviado, En calibración, En retorno,
// Control de calidad — en ambos flujos). No hace falta un archivo por cada
// una: los campos ya están descritos en `etapa.siguiente.campos`.
import type { EtapaFlujo } from '../hooks/useCalibraciones'
import { BloqueAvanzar } from './CamposCompartidos'
import type { OrdenCalibracion } from '../../../types'

export function VistaEtapaGenerica({ etapa, form, puedeEditar, soloLectura, saving, onAvanzar }: {
  etapa: EtapaFlujo
  form: Partial<OrdenCalibracion>
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        {soloLectura ? `Revisando "${etapa.label}" (solo lectura)` : etapa.label}
      </div>
      {etapa.siguiente ? (
        <BloqueAvanzar
          siguiente={etapa.siguiente} form={form} puedeEditar={puedeEditar} soloLectura={soloLectura}
          saving={saving} onAvanzar={onAvanzar}
        />
      ) : (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Esta etapa no tiene más datos que capturar.</p>
      )}
    </div>
  )
}
