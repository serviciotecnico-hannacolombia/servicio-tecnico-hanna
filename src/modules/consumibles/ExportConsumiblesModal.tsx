import { useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { exportToExcel } from '../../utils/exportToExcel'
import type { ConsumibleLlegada, ConsumibleDestape } from '../../types'

interface ExportConsumiblesModalProps {
  open: boolean
  onClose: () => void
  llegadas: ConsumibleLlegada[]
  destapes: ConsumibleDestape[]
}

type Dataset = 'inventario' | 'llegadas' | 'destapes'

export function ExportConsumiblesModal({ open, onClose, llegadas, destapes }: ExportConsumiblesModalProps) {
  const [dataset, setDataset]   = useState<Dataset>('inventario')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  function handleExport() {
    const inRange = (fecha: string | null) =>
      (!dateFrom || (fecha ?? '') >= dateFrom) && (!dateTo || (fecha ?? '') <= dateTo)

    if (dataset === 'llegadas') {
      const rows = llegadas.filter(l => inRange(l.fecha))
      if (!rows.length) { toast.error('No hay llegadas en ese rango de fechas'); return }
      exportToExcel(rows, {
        fecha: 'Fecha', nombre: 'Nombre', ref: 'Referencia', lote: 'Lote',
        vol: 'Volumen', venc: 'Vencimiento', responsable: 'Responsable',
        ubicacion: 'Ubicación', obs: 'Observaciones',
      }, 'Consumibles_Llegadas', 'Llegadas de Consumibles')
    } else if (dataset === 'destapes') {
      const rows = destapes.filter(d => inRange(d.fecha))
      if (!rows.length) { toast.error('No hay destapes en ese rango de fechas'); return }
      exportToExcel(rows, {
        fecha: 'Fecha', nombre: 'Nombre', ref: 'Referencia', lote: 'Lote',
        responsable: 'Responsable', ubicacion: 'Ubicación', obs: 'Observaciones',
      }, 'Consumibles_Destapes', 'Destapes de Consumibles')
    } else {
      const destapedMap = new Map(destapes.filter(d => d.llegada_id).map(d => [d.llegada_id!, d]))
      const rows = llegadas.filter(l => inRange(l.fecha)).map(l => {
        const d = destapedMap.get(l.id)
        return {
          fecha: l.fecha, estado: d ? 'Destapado' : 'En stock', nombre: l.nombre, ref: l.ref,
          lote: l.lote, vol: l.vol, venc: l.venc, responsable: l.responsable, ubicacion: l.ubicacion,
          fecha_destape: d?.fecha ?? '',
        }
      })
      if (!rows.length) { toast.error('No hay registros en ese rango de fechas'); return }
      exportToExcel(rows, {
        fecha: 'F. Llegada', estado: 'Estado', nombre: 'Nombre', ref: 'Referencia', lote: 'Lote',
        vol: 'Volumen', venc: 'Vencimiento', responsable: 'Responsable', ubicacion: 'Ubicación',
        fecha_destape: 'F. Destape',
      }, 'Consumibles_Inventario', 'Inventario de Consumibles')
    }
    toast.success('Archivo Excel generado')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Exportar a Excel" width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Select
          label="Datos a exportar"
          value={dataset}
          onChange={e => setDataset(e.target.value as Dataset)}
          options={[
            { value: 'inventario', label: 'Inventario (llegadas + estado)' },
            { value: 'llegadas',   label: 'Solo llegadas' },
            { value: 'destapes',   label: 'Solo destapes' },
          ]}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input type="date" label="Desde (opcional)" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input type="date" label="Hasta (opcional)" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleExport}><Download size={15} /> Exportar</Button>
        </div>
      </div>
    </Modal>
  )
}
