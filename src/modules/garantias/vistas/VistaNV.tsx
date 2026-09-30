// Ruta sin stock: se registra la NV con la que se aparta el stock de la
// importación y una fecha de seguimiento (la que muestra el semáforo).
import { useState } from 'react'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { BannerEstado, FG, INP, PRI } from '../ui'
import type { VistaProps } from './tipos'

export function VistaNV({ garantia, puedeEditar, soloLectura, onActualizar }: VistaProps) {
  const [nv, setNv] = useState(garantia.numero_nv || '')
  const [fechaSeg, setFechaSeg] = useState(garantia.fecha_seguimiento || '')
  const [guardando, setGuardando] = useState(false)
  const deshabilitado = !puedeEditar || soloLectura

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!nv.trim()) { toast.error('Ingresa el número de NV'); return }
    if (!fechaSeg) { toast.error('Ingresa la fecha de seguimiento'); return }
    setGuardando(true)
    await onActualizar({ numero_nv: nv.trim(), fecha_seguimiento: fechaSeg, estado: 'importacion' }, 'NV registrada — garantía en Importación')
    setGuardando(false)
  }

  return (
    <Card>
      <BannerEstado icon={<FileText size={16} />}>
        {soloLectura ? 'Revisando "NV" (solo lectura)' : 'No hay stock — registra la NV con la que se aparta el stock para la importación.'}
      </BannerEstado>
      <form onSubmit={confirmar}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <FG label="Número de NV" required>
            <input value={nv} onChange={e => setNv(e.target.value.toUpperCase())} placeholder="Ej. 12345" style={INP} disabled={deshabilitado} autoFocus={!deshabilitado} />
          </FG>
          <FG label="Fecha de seguimiento" required>
            <input type="date" value={fechaSeg} onChange={e => setFechaSeg(e.target.value)} style={INP} disabled={deshabilitado} />
          </FG>
        </div>
        {!deshabilitado && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="submit" disabled={guardando} style={PRI}>{guardando ? 'Guardando…' : '✓ Enviar a importación →'}</button>
          </div>
        )}
      </form>
    </Card>
  )
}
