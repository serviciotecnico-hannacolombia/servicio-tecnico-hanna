import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import { useProfiles } from '../../../hooks/useProfiles'
import { nivelPorFecha, type NivelSemaforo } from '../../calibraciones/hooks/useCalibraciones'
import type { EstadoGarantia, Garantia, GarantiaHistorial, GarantiaNota, Profile } from '../../../types'

export function useGarantias() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['garantias'],
    queryFn: () => fetchAllRows<Garantia>('garantias', q => q.order('created_at', { ascending: false })),
    enabled: !!user,
  })
}

export function useNotasGarantia(garantiaId: string | undefined) {
  return useQuery({
    queryKey: ['garantias_notas', garantiaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('garantias_notas').select('*')
        .eq('garantia_id', garantiaId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as GarantiaNota[]
    },
    enabled: !!garantiaId,
  })
}

export function useHistorialGarantia(garantiaId: string | undefined) {
  return useQuery({
    queryKey: ['garantias_historial', garantiaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('garantias_historial').select('*')
        .eq('garantia_id', garantiaId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as GarantiaHistorial[]
    },
    enabled: !!garantiaId,
  })
}

// Ids de los perfiles que el Admin habilitó como responsables seleccionables
// (tabla garantias_responsables, editable solo por Admin).
export function useResponsablesConfig() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['garantias_responsables'],
    queryFn: async () => {
      const { data, error } = await supabase.from('garantias_responsables').select('profile_id')
      if (error) throw error
      return (data as { profile_id: string }[]).map(r => r.profile_id)
    },
    enabled: !!user,
  })
}

export function ordenarPorNombre(a: Profile, b: Profile) {
  return (a.full_name || a.email).localeCompare(b.full_name || b.email)
}

// Responsables asignables: perfiles activos habilitados por el Admin.
export function useResponsablesGarantias() {
  const { data: profiles = [] } = useProfiles()
  const { data: ids = [] } = useResponsablesConfig()
  const habilitados = new Set(ids)
  return profiles.filter(p => p.activo && habilitados.has(p.id)).sort(ordenarPorNombre)
}

export async function setResponsableHabilitado(profileId: string, habilitado: boolean) {
  return habilitado
    ? supabase.from('garantias_responsables').insert({ profile_id: profileId })
    : supabase.from('garantias_responsables').delete().eq('profile_id', profileId)
}

export function useInvalidateGarantias() {
  const qc = useQueryClient()
  return {
    invalidate: () => qc.invalidateQueries({ queryKey: ['garantias'] }),
    invalidateDetalle: (garantiaId: string) => {
      qc.invalidateQueries({ queryKey: ['garantias_historial', garantiaId] })
      qc.invalidateQueries({ queryKey: ['garantias_notas', garantiaId] })
    },
  }
}

export const ESTADO_LABEL_GAR: Record<EstadoGarantia, string> = {
  pnc_pendiente: 'PNC pendiente',
  nv: 'NV',
  importacion: 'Importación',
  informe: 'Informe',
  finalizada: 'Finalizada',
}

export const CAMPO_LABEL_GAR: Record<string, string> = {
  creacion: 'Garantía creada',
  cliente: 'Cliente',
  referencia: 'Referencia',
  otst: 'OTST',
  asesor_correo: 'Asesor comercial',
  hay_stock: 'Hay stock',
  responsables: 'Responsables',
  estado: 'Estado',
  numero_nv: 'Número de NV',
  fecha_seguimiento: 'Fecha de seguimiento',
  numero_pnc: 'PNC',
  fecha_limite_entrega: 'Fecha límite de entrega',
  anulada: 'Anulación',
  motivo_anulacion: 'Motivo de anulación',
  nota: 'Nota de avance',
}

// Pasos del stepper según la ruta: con stock se salta NV/Importación; sin
// stock se salta "PNC pendiente" (el PNC se carga dentro de Importación).
export type PasoGarantia = 'registro' | EstadoGarantia

export function flujoGarantia(hayStock: boolean): PasoGarantia[] {
  return hayStock
    ? ['registro', 'pnc_pendiente', 'informe', 'finalizada']
    : ['registro', 'nv', 'importacion', 'informe', 'finalizada']
}

// ── Semáforo ─────────────────────────────────────────────────────────────────
// En NV / Importación manda la fecha de seguimiento (reprogramable); con PNC
// pendiente o en Informe manda la fecha límite de entrega de la garantía.
export function fechaObjetivoGarantia(g: Pick<Garantia, 'estado' | 'fecha_seguimiento' | 'fecha_limite_entrega'>): string | null {
  if (g.estado === 'nv' || g.estado === 'importacion') return g.fecha_seguimiento
  if (g.estado === 'pnc_pendiente' || g.estado === 'informe') return g.fecha_limite_entrega
  return null
}

export function semaforoGarantia(g: Pick<Garantia, 'estado' | 'fecha_seguimiento' | 'fecha_limite_entrega' | 'anulada'>): NivelSemaforo | null {
  if (g.anulada || g.estado === 'finalizada') return null
  const objetivo = fechaObjetivoGarantia(g)
  return objetivo ? nivelPorFecha(objetivo) : null
}

// Enlace a la ficha del producto no conforme en la intranet.
export function linkPnc(numero: string | null): string | null {
  const v = (numero || '').trim()
  return v ? `https://intranet.hannacolombia.com/stecnico/producto_no_conforme/item/${encodeURIComponent(v)}` : null
}

export function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// ── Mutaciones ───────────────────────────────────────────────────────────────

export interface GarantiaForm {
  cliente: string
  referencia: string
  otst: string
  asesor_correo: string
  responsables: string[]
  hay_stock: boolean
  numero_pnc: string
  fecha_limite_entrega: string
}

// Estado inicial según la ruta: sin stock → NV; con stock → Informe si ya
// trae PNC, si no queda con PNC pendiente.
export function estadoInicial(f: Pick<GarantiaForm, 'hay_stock' | 'numero_pnc'>): EstadoGarantia {
  if (!f.hay_stock) return 'nv'
  return f.numero_pnc.trim() ? 'informe' : 'pnc_pendiente'
}

function camposBase(f: GarantiaForm) {
  return {
    cliente: f.cliente.trim(),
    referencia: f.referencia.trim(),
    otst: f.otst.trim() || null,
    asesor_correo: f.asesor_correo,
    responsables: f.responsables,
  }
}

export async function crearGarantia(f: GarantiaForm, creadoPor: string | null) {
  const { data, error } = await supabase.from('garantias').insert({
    ...camposBase(f),
    hay_stock: f.hay_stock,
    estado: estadoInicial(f),
    numero_pnc: f.hay_stock ? (f.numero_pnc.trim() || null) : null,
    fecha_limite_entrega: f.hay_stock ? (f.fecha_limite_entrega || null) : null,
    creado_por: creadoPor,
  }).select().single()
  return { data: data as Garantia | null, error }
}

// Edición de los datos del formulario inicial (el trigger audita cambios).
// La ruta (hay stock / no) solo se puede cambiar mientras no haya avanzado
// más allá de su primer paso.
export async function editarGarantia(id: string, f: GarantiaForm, cambiaRuta: boolean) {
  const extra: Partial<Garantia> = cambiaRuta
    ? { hay_stock: f.hay_stock, estado: f.hay_stock ? 'pnc_pendiente' : 'nv' }
    : {}
  return supabase.from('garantias')
    .update({ ...camposBase(f), ...extra, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function actualizarGarantia(id: string, overrides: Partial<Garantia>) {
  return supabase.from('garantias').update({ ...overrides, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function agregarNotaGarantia(garantiaId: string, texto: string) {
  return supabase.from('garantias_notas').insert({ garantia_id: garantiaId, texto: texto.trim() })
}

export async function anularGarantia(id: string, motivo: string) {
  return actualizarGarantia(id, { anulada: true, motivo_anulacion: motivo.trim() })
}

export async function reactivarGarantia(id: string) {
  return actualizarGarantia(id, { anulada: false, motivo_anulacion: null })
}

// Solo Admin (gateado también en RLS).
export async function eliminarGarantia(id: string) {
  return supabase.from('garantias').delete().eq('id', id)
}
