import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type { EquipoSinFormato, EquipoSinFormatoHistorial, EquipoSinFormatoItem } from '../../../types'

export function useEquiposSinFormato() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['equipos_sin_formato'],
    queryFn: () => fetchAllRows<EquipoSinFormato>('equipos_sin_formato', q => q.order('created_at', { ascending: false })),
    enabled: !!user,
  })
}

export function useEquiposSinFormatoItems() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['equipos_sin_formato_items'],
    queryFn: () => fetchAllRows<EquipoSinFormatoItem>('equipos_sin_formato_items'),
    enabled: !!user,
  })
}

export function useHistorialEquipoSF(equipoSfId: string | undefined) {
  return useQuery({
    queryKey: ['equipos_sin_formato_historial', equipoSfId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipos_sin_formato_historial').select('*')
        .eq('equipo_sf_id', equipoSfId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EquipoSinFormatoHistorial[]
    },
    enabled: !!equipoSfId,
  })
}

export function useInvalidateEquiposSinFormato() {
  const qc = useQueryClient()
  return {
    invalidate: () => {
      qc.invalidateQueries({ queryKey: ['equipos_sin_formato'] })
      qc.invalidateQueries({ queryKey: ['equipos_sin_formato_items'] })
    },
    invalidateHistorial: (equipoSfId: string) => {
      qc.invalidateQueries({ queryKey: ['equipos_sin_formato_historial', equipoSfId] })
    },
  }
}

export const ESTADO_LABEL_SF: Record<string, string> = {
  recibido: 'Recibido',
  pendiente: 'Pendiente',
  preingresado: 'Preingresado',
  ingresado: 'Ingresado',
}

export const CAMPO_LABEL_SF: Record<string, string> = {
  creacion: 'Registro creado',
  razon_social: 'Razón social',
  fecha_llegada: 'Fecha de llegada',
  modo_llegada: 'Modo de llegada',
  asesor_correo: 'Asesor',
  estado: 'Estado',
  numero_pre_ingreso: 'Número de pre-ingreso',
  otst: 'OTST',
  anulada: 'Anulación',
  motivo_anulacion: 'Motivo de anulación',
  equipos: 'Equipos',
}

export function linkPreIngreso(numero: string): string | null {
  const v = numero.trim()
  return v ? `https://intranet.hannacolombia.com/stecnico/pre_ingreso/item/${v}` : null
}

export function linkOtst(otst: string): string | null {
  const v = otst.trim()
  return v ? `https://intranet.hannacolombia.com/stecnico/item/${v}` : null
}

// El campo otst guarda uno o varios códigos separados por coma.
export function parseOtstCodes(otst: string | null): string[] {
  if (!otst) return []
  return otst.split(',').map(s => s.trim()).filter(Boolean)
}

type ItemForm = { referencia: string, serial: string, observaciones: string }

function resumenItems(items: ItemForm[]): string {
  return items.map(it => `${it.referencia}${it.serial ? ` (S/N ${it.serial})` : ''}`).join(', ')
}

export async function crearEquipoSinFormato(
  payload: Omit<EquipoSinFormato, 'id' | 'numero' | 'estado' | 'fecha_recibido' | 'fecha_pendiente' | 'fecha_preingreso' | 'fecha_ingreso' | 'created_at' | 'updated_at' | 'numero_pre_ingreso' | 'otst' | 'anulada' | 'motivo_anulacion'>,
  items: ItemForm[],
) {
  // Al enviar el correo ya se sabe que el registro queda pendiente de
  // respuesta del asesor — no hace falta un paso manual "Recibido → Pendiente".
  const { data, error } = await supabase.from('equipos_sin_formato')
    .insert({ ...payload, estado: 'pendiente', fecha_pendiente: new Date().toISOString() }).select().single()
  if (error) return { data: null, error }
  const { error: itemsError } = await supabase.from('equipos_sin_formato_items').insert(
    items.map(it => ({ equipo_sf_id: data.id, referencia: it.referencia, serial: it.serial || null, observaciones: it.observaciones || null }))
  )
  if (itemsError) return { data: null, error: itemsError }
  return { data: data as EquipoSinFormato, error: null }
}

export async function avanzarEquipoSinFormato(id: string, overrides: Partial<EquipoSinFormato>) {
  return supabase.from('equipos_sin_formato').update({ ...overrides, updated_at: new Date().toISOString() }).eq('id', id)
}

// Edición completa post-creación: actualiza los campos principales (el
// trigger de BD registra en el historial lo que haya cambiado) y reemplaza
// los equipos — como viven en una tabla aparte, su cambio se registra a
// mano con un solo resumen en el historial en vez de diffear campo a campo.
export async function editarEquipoSinFormato(
  id: string,
  payload: { razon_social: string, fecha_llegada: string, modo_llegada: string, asesor_correo: string },
  itemsAnteriores: ItemForm[],
  itemsNuevos: ItemForm[],
) {
  const { error } = await supabase.from('equipos_sin_formato').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error }

  const resumenAntes = resumenItems(itemsAnteriores)
  const resumenDespues = resumenItems(itemsNuevos)
  if (resumenAntes !== resumenDespues) {
    const { error: delError } = await supabase.from('equipos_sin_formato_items').delete().eq('equipo_sf_id', id)
    if (delError) return { error: delError }
    const { error: insError } = await supabase.from('equipos_sin_formato_items').insert(
      itemsNuevos.map(it => ({ equipo_sf_id: id, referencia: it.referencia, serial: it.serial || null, observaciones: it.observaciones || null }))
    )
    if (insError) return { error: insError }
    const { error: histError } = await supabase.from('equipos_sin_formato_historial').insert({
      equipo_sf_id: id, campo: 'equipos', valor_anterior: resumenAntes, valor_nuevo: resumenDespues,
    })
    if (histError) return { error: histError }
  }
  return { error: null }
}

export async function anularEquipoSinFormato(id: string, motivo: string) {
  const { error } = await supabase.from('equipos_sin_formato')
    .update({ anulada: true, motivo_anulacion: motivo.trim(), updated_at: new Date().toISOString() }).eq('id', id)
  return { error }
}

export async function reactivarEquipoSinFormato(id: string) {
  const { error } = await supabase.from('equipos_sin_formato')
    .update({ anulada: false, motivo_anulacion: null, updated_at: new Date().toISOString() }).eq('id', id)
  return { error }
}

// Solo Admin (gateado también en RLS) — a diferencia de anular, esto borra
// el registro y su historial permanentemente.
export async function eliminarEquipoSinFormato(id: string) {
  const { error } = await supabase.from('equipos_sin_formato').delete().eq('id', id)
  return { error }
}
