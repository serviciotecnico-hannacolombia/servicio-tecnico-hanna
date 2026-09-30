import { PackageCheck } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { BannerEstado } from '../ui'
import { BloquePNC } from './BloquePNC'
import type { VistaProps } from './tipos'

export function VistaPncPendiente(props: VistaProps) {
  return (
    <Card>
      <BannerEstado icon={<PackageCheck size={16} />} tono="yellow">
        {props.soloLectura ? 'Revisando "PNC" (solo lectura)' : 'Hay stock — falta registrar el PNC y la fecha límite de entrega.'}
      </BannerEstado>
      <BloquePNC {...props} />
    </Card>
  )
}
