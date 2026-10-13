import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import type { Tarea } from '../../types'
import { mesActual, tareasEnRango, generarReporteCSV, descargarReporteCSV, type FechaReporte } from './reporte'

export function ExportTareasModal({ tareas, nombre, onClose }: {
  tareas: Tarea[], nombre: (id: string) => string, onClose: () => void,
}) {
  const [rango, setRango] = useState(() => mesActual())
  const [criterio, setCriterio] = useState<FechaReporte>('vencimiento')

  function descargar() {
    if (!rango.desde || !rango.hasta) { toast.error('Selecciona ambas fechas'); return }
    if (rango.desde > rango.hasta) { toast.error('Desde no puede ser posterior a Hasta'); return }
    const seleccionadas = tareasEnRango(tareas, rango.desde, rango.hasta, criterio)
    if (!seleccionadas.length) { toast.error('No hay tareas en ese rango de fechas'); return }
    descargarReporteCSV(generarReporteCSV(seleccionadas, nombre), rango.desde, rango.hasta, criterio)
    toast.success(`Reporte generado: ${seleccionadas.length} tareas`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Descargar reporte de tareas" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          Filtrar por
          <select value={criterio} onChange={e => setCriterio(e.target.value as FechaReporte)}
            style={{ padding: 10, borderRadius: 8, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="vencimiento">Fecha de vencimiento</option>
            <option value="creacion">Fecha de creación</option>
          </select>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input type="date" label="Desde" value={rango.desde} onChange={e => setRango(r => ({ ...r, desde: e.target.value }))} />
          <Input type="date" label="Hasta" value={rango.hasta} onChange={e => setRango(r => ({ ...r, hasta: e.target.value }))} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Incluye pendientes y completadas de todas las tareas que puedes ver, sin aplicar los filtros de la lista.
          Ambas fechas se incluyen. {criterio === 'vencimiento' && 'Las tareas sin vencimiento se excluyen; puedes usar la fecha de creación para incluirlas.'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={descargar}><Download size={15} /> Descargar CSV</Button>
        </div>
      </div>
    </Modal>
  )
}
