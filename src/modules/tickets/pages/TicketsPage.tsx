import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TicketForm } from '../components/TicketForm'
import { TicketsTable } from '../components/TicketsTable'
import { EditTicketModal } from '../components/EditTicketModal'
import { useTickets } from '../hooks/useTickets'
import { Header } from '../../../components/layout/Header'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type { TicketFabrica } from '../types'

export function TicketsPage() {
  const qc = useQueryClient()
  const { user } = useUser()
  const { data: tickets = [] } = useTickets()
  const [selected, setSelected] = useState<TicketFabrica | null>(null)

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
      />

      <TicketForm onSave={handleSave} />
      <TicketsTable tickets={tickets} onEdit={setSelected} onDelete={handleDelete} />

      <EditTicketModal ticket={selected} onClose={() => setSelected(null)} onSave={handleUpdate} />
    </div>
  )
}

export default TicketsPage
