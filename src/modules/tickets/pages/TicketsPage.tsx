import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { TicketForm } from '../components/TicketForm'
import { TicketsTable } from '../components/TicketsTable'
import { EditTicketModal } from '../components/EditTicketModal'
import { ImportTicketsModal } from '../components/ImportTicketsModal'
import { useTickets } from '../hooks/useTickets'
import { Header } from '../../../components/layout/Header'
import { Button } from '../../../components/ui/Button'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import { useProfiles } from '../../../hooks/useProfiles'
import type { TicketFabrica } from '../types'
import type { ParsedTicketRow } from '../utils/parseTicketsExcel'

export function TicketsPage() {
  const qc = useQueryClient()
  const { user } = useUser()
  const { data: tickets = [] } = useTickets()
  const { data: profiles = [] } = useProfiles()
  const [selected, setSelected] = useState<TicketFabrica | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tickets_fabrica'] })

  const handleSave = async (ticket: TicketFabrica) => {
    const { error } = await supabase.from('tickets_fabrica').insert({
      nombre: ticket.nombre,
      codigo: ticket.codigo || null,
      serial: ticket.serial || null,
      equipo_nombre: ticket.equipo_nombre || null,
      origen: ticket.origen || null,
      estado: ticket.estado || null,
      nota_estado: ticket.nota_estado || null,
      es_equipo_hijo: ticket.es_equipo_hijo ?? false,
      equipo_madre_codigo: ticket.es_equipo_hijo ? (ticket.equipo_madre_codigo || null) : null,
      equipo_madre_serial: ticket.es_equipo_hijo ? (ticket.equipo_madre_serial || null) : null,
      equipo_madre_nombre: ticket.es_equipo_hijo ? (ticket.equipo_madre_nombre || null) : null,
      creado_por: user?.id ?? null,
    })
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    invalidate()
    toast.success('Ticket guardado')
  }

  const handleUpdate = async (ticket: TicketFabrica) => {
    if (!ticket.id) return
    const { error } = await supabase.from('tickets_fabrica').update({
      nombre: ticket.nombre,
      codigo: ticket.codigo || null,
      serial: ticket.serial || null,
      equipo_nombre: ticket.equipo_nombre || null,
      origen: ticket.origen || null,
      estado: ticket.estado || null,
      nota_estado: ticket.nota_estado || null,
      es_equipo_hijo: ticket.es_equipo_hijo ?? false,
      equipo_madre_codigo: ticket.es_equipo_hijo ? (ticket.equipo_madre_codigo || null) : null,
      equipo_madre_serial: ticket.es_equipo_hijo ? (ticket.equipo_madre_serial || null) : null,
      equipo_madre_nombre: ticket.es_equipo_hijo ? (ticket.equipo_madre_nombre || null) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', ticket.id)
    if (error) { toast.error('Error al actualizar: ' + error.message); return }
    invalidate()
    toast.success('Ticket actualizado')
    setSelected(null)
  }

  const handleImport = async (rows: ParsedTicketRow[], userMap: Record<string, string | null>) => {
    const toInsert = rows.map(r => ({
      nombre: r.nombre,
      codigo: r.codigo || null,
      serial: r.serial || null,
      origen: r.origen || null,
      estado: r.estado || null,
      nota_estado: r.notaEstado || null,
      creado_por: r.creadoPorRaw ? (userMap[r.creadoPorRaw] ?? null) : null,
      es_equipo_hijo: false,
      // Siempre se envía una fecha: si se omitiera en algunas filas del lote,
      // Supabase manda NULL explícito en vez de aplicar el DEFAULT now() de la
      // columna cuando otras filas del mismo insert sí traen la columna.
      created_at: r.createdAt || new Date().toISOString(),
    }))

    const CHUNK = 200
    let inserted = 0
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK)
      const { error } = await supabase.from('tickets_fabrica').insert(chunk)
      if (error) { toast.error('Error importando lote: ' + error.message); break }
      inserted += chunk.length
    }

    invalidate()
    toast.success(`Importación completada: ${inserted} tickets registrados`)
    return { inserted }
  }

  const handleDelete = async (ticket: TicketFabrica) => {
    if (!ticket.id) return
    if (!window.confirm(`¿Eliminar el ticket "${ticket.nombre}"?`)) return
    const { error } = await supabase.from('tickets_fabrica').delete().eq('id', ticket.id)
    if (error) { toast.error('Error al eliminar: ' + error.message); return }
    invalidate()
    toast.success('Ticket eliminado')
  }

  return (
    <div>
      <Header
        title="Tickets a Fábrica"
        subtitle="Reporte de fallas y novedades de equipos ante fábrica — reemplaza el seguimiento en Notion"
        actions={
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
            <Upload size={14} /> Importar Excel
          </Button>
        }
      />

      <TicketForm onSave={handleSave} />
      <TicketsTable tickets={tickets} onEdit={setSelected} onDelete={handleDelete} />

      <EditTicketModal ticket={selected} onClose={() => setSelected(null)} onSave={handleUpdate} />

      <ImportTicketsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        profiles={profiles}
        onImport={handleImport}
      />
    </div>
  )
}

export default TicketsPage
