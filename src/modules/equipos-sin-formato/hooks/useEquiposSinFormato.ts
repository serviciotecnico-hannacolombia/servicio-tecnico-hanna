import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type { EquipoSinFormato, EquipoSinFormatoItem } from '../../../types'

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

export function useInvalidateEquiposSinFormato() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['equipos_sin_formato'] })
    qc.invalidateQueries({ queryKey: ['equipos_sin_formato_items'] })
  }
}

export const ESTADO_LABEL_SF: Record<string, string> = {
  recibido: 'Recibido',
  pendiente: 'Pendiente',
  preingresado: 'Preingresado',
  ingresado: 'Ingresado',
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

export async function crearEquipoSinFormato(
  payload: Omit<EquipoSinFormato, 'id' | 'numero' | 'estado' | 'fecha_recibido' | 'fecha_pendiente' | 'fecha_preingreso' | 'fecha_ingreso' | 'created_at' | 'updated_at' | 'numero_pre_ingreso' | 'otst'>,
  items: { referencia: string, serial: string, observaciones: string }[],
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
