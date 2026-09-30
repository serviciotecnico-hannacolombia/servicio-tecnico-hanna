// Informe: ya con PNC cargado no hay más campos, solo finalizar.
import { useState } from 'react'
import { ClipboardCheck, CheckCircle2 } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { fmtFecha } from '../hooks/useGarantias'
import { BannerEstado, PRI, LinkPNC } from '../ui'
import type { Garantia } from '../../../types'
import type { VistaProps } from './tipos'

function Dato({ label, valor }: { label: string, valor: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)' }}>{label}</div>
      <strong style={{ fontSize: 13 }}>{valor}</strong>
    </div>
  )
}

function Resumen({ garantia }: { garantia: Garantia }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
      {garantia.numero_nv && <Dato label="NV" valor={garantia.numero_nv} />}
      <Dato label="PNC" valor={<LinkPNC numero={garantia.numero_pnc} />} />
      <Dato label="Fecha límite de entrega" valor={fmtFecha(garantia.fecha_limite_entrega)} />
    </div>
  )
}

export function VistaInforme({ garantia, puedeEditar, soloLectura, onActualizar }: VistaProps) {
  const [guardando, setGuardando] = useState(false)

  async function finalizar() {
    if (!confirm(`¿Finalizar la garantía GAR-${garantia.numero}?`)) return
    setGuardando(true)
    await onActualizar({ estado: 'finalizada', fecha_finalizada: new Date().toISOString() }, 'Garantía finalizada')
    setGuardando(false)
  }

  return (
    <Card>
      <BannerEstado icon={<ClipboardCheck size={16} />}>
        {soloLectura ? 'Revisando "Informe" (solo lectura)' : 'En informe — PNC cargado, solo falta finalizar la garantía.'}
      </BannerEstado>
      <Resumen garantia={garantia} />
      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={finalizar} disabled={guardando} style={PRI}>{guardando ? 'Guardando…' : '✓ Finalizar'}</button>
        </div>
      )}
    </Card>
  )
}

export function VistaFinalizada({ garantia }: { garantia: Garantia }) {
  return (
    <Card>
      <BannerEstado icon={<CheckCircle2 size={16} />} tono="green">
        Finalizada{garantia.fecha_finalizada ? ` el ${fmtFecha(garantia.fecha_finalizada)}` : ''} — proceso completo.
      </BannerEstado>
      <Resumen garantia={garantia} />
    </Card>
  )
}
