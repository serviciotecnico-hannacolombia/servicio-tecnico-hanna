// Datos del módulo Mant. In Situ. El catálogo de equipos es codigos_inet
// (módulo Códigos). Cada referencia tiene su código normal y su código IN
// SITU (codigos_inet.codigo_mantenimiento_insitu, que solo se escribe desde
// este módulo vía la RPC mant_in_situ_asignar_codigo). Este módulo aporta
// el catálogo de códigos in situ (precio/horas), excepciones por referencia
// (horas/precio/descripción), configuración del vehículo y rutas/peajes.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type {
  MantInSituCodigo, MantInSituConfig, MantInSituDestino, MantInSituDestinoPeaje,
  MantInSituEquipoExcepcion, MantInSituPeaje,
} from '../../../types'

export const CODIGO_BOGOTA = '11001'

interface CodigoInet {
  codigo: string
  familia: string | null
  descripcion: string | null
  codigo_mantenimiento: string | null
  codigo_mantenimiento_insitu: string | null
}

export function useConfigInSitu() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['mant_in_situ_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mant_in_situ_config').select('*').eq('id', 1).maybeSingle()
      if (error) throw error
      return data as MantInSituConfig | null
    },
    enabled: !!user,
  })
}

export function useCodigosInSitu() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['mant_in_situ_codigos'],
    queryFn: () => fetchAllRows<MantInSituCodigo>('mant_in_situ_codigos', q => q.order('codigo')),
    enabled: !!user,
  })
}

// ── Invalidación tras importar ───────────────────────────────────────────────

export function useInvalidarMantInSitu() {
  const qc = useQueryClient()
  return () => {
    for (const k of ['mant_in_situ_config', 'mant_in_situ_codigos', 'mant_in_situ_equipos', 'mant_in_situ_destinos', 'mant_in_situ_codigos_inet', 'codigos-inet']) {
      qc.invalidateQueries({ queryKey: [k] })
    }
  }
}

function useExcepcionesInSitu() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['mant_in_situ_equipos'],
    queryFn: () => fetchAllRows<MantInSituEquipoExcepcion>('mant_in_situ_equipos'),
    enabled: !!user,
  })
}

function useCodigosInet() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['mant_in_situ_codigos_inet'],
    queryFn: async () => {
      const PAGE = 1000
      let all: CodigoInet[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase.from('codigos_inet')
          .select('codigo, familia, descripcion, codigo_mantenimiento, codigo_mantenimiento_insitu').order('codigo').range(from, from + PAGE - 1)
        if (error) throw error
        all = all.concat(data as CodigoInet[])
        if (data.length < PAGE) break
      }
      return all
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  })
}

export function useDestinosInSitu() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['mant_in_situ_destinos'],
    queryFn: async () => {
      const [destinos, peajes, pasos] = await Promise.all([
        fetchAllRows<MantInSituDestino>('mant_in_situ_destinos', q => q.order('municipio')),
        fetchAllRows<MantInSituPeaje>('mant_in_situ_peajes', q => q.order('nombre')),
        fetchAllRows<MantInSituDestinoPeaje>('mant_in_situ_destino_peajes'),
      ])
      // Bogotá primero (solo se cobra el servicio), el resto alfabético.
      destinos.sort((a, b) => Number(b.codigo === CODIGO_BOGOTA) - Number(a.codigo === CODIGO_BOGOTA) || a.municipio.localeCompare(b.municipio, 'es'))
      return { destinos, peajes, pasos }
    },
    enabled: !!user,
  })
}


// ── Catálogo efectivo de equipos ────────────────────────────────────────────

export interface EquipoInSitu {
  referencia: string
  nombre: string
  familia: string
  codigo: string | null          // código IN SITU asignado (null = sin asignar → pendiente)
  horas: number | null
  precio: number | null
  descripcionServicio: string
  precioIndividual: boolean      // el precio viene de la excepción, no del código
  tieneExcepcion: boolean
  completo: boolean              // tiene código, horas y precio válidos
  codigoNormal: string           // código de mantenimiento normal (Códigos) — solo informativo
  excepcion: MantInSituEquipoExcepcion | null
}

// Combina codigos_inet + excepciones + precio/horas del código in situ.
// Sin código in situ asignado la referencia queda pendiente: el precio in
// situ nunca se toma del código normal.
export function useEquiposInSitu() {
  const inet = useCodigosInet()
  const excepciones = useExcepcionesInSitu()
  const codigos = useCodigosInSitu()
  const config = useConfigInSitu()

  const isLoading = inet.isLoading || excepciones.isLoading || codigos.isLoading || config.isLoading
  const error = inet.error || excepciones.error || codigos.error || config.error
  const porCodigo = new Map((codigos.data ?? []).map(c => [c.codigo, c]))
  const porReferencia = new Map((excepciones.data ?? []).map(e => [e.referencia, e]))
  const descripcionGeneral = config.data?.descripcion_servicio ?? ''

  const equipos: EquipoInSitu[] = (inet.data ?? []).map(i => {
    const exc = porReferencia.get(i.codigo)
    const cod = i.codigo_mantenimiento_insitu ? porCodigo.get(i.codigo_mantenimiento_insitu) : undefined
    const horas = exc?.horas ?? cod?.horas ?? null
    const precio = exc?.precio ?? cod?.precio ?? null
    return {
      referencia: i.codigo,
      nombre: i.descripcion || '',
      familia: i.familia || '',
      codigo: cod ? cod.codigo : null,
      horas,
      precio,
      descripcionServicio: exc?.descripcion_servicio || descripcionGeneral,
      precioIndividual: exc?.precio != null,
      tieneExcepcion: !!exc,
      completo: !!cod && horas != null && precio != null,
      codigoNormal: (i.codigo_mantenimiento || '').trim(),
      excepcion: exc ?? null,
    }
  })

  return { equipos, isLoading, error, codigos: codigos.data ?? [] }
}

// ── Formato ─────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
export function fmtCOP(v: number | null | undefined): string {
  return v == null ? '—' : COP.format(v)
}

export function fmtHoras(h: number): string {
  return `${Number.isInteger(h) ? h : h.toFixed(2).replace(/\.?0+$/, '')} h`
}

export function fmtMinutos(min: number | null): string {
  if (min == null) return '—'
  const m = Math.round(min)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`
}
