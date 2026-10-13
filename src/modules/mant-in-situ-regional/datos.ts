import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '../../lib/supabase'
import { useUser } from '../../hooks/useUser'
import type { MantInSituConfig, MantInSituDestino, MantInSituPeaje } from '../../types'
import type { EquipoInSitu } from '../mant-in-situ/hooks/useMantInSitu'

export interface SedeRegional { id: string, nombre: string, codigo: string, direccion: string, lat: number, lng: number, fuente: string }
export interface CodigoRegional { codigo: string, precio: number, horas: number }
export interface EquipoRegional { referencia: string, codigo: string, horas: number | null, precio: number | null, descripcion_servicio: string | null }
export interface DestinoRegional extends MantInSituDestino { sede_id: string, peajes_confirmados: boolean, consultado_at: string }
interface Instrumento { codigo: string, descripcion: string | null, familia: string | null }

export function useSedesRegionales() {
  const { hasModule } = useUser()
  return useQuery({ queryKey: ['regional_sedes'], enabled: hasModule('mant_in_situ_regional'),
    queryFn: () => fetchAllRows<SedeRegional>('mant_regional_sedes', q => q.order('nombre')) })
}

export function useRegional(sede: SedeRegional | undefined) {
  const { hasModule } = useUser()
  return useQuery({ queryKey: ['regional', sede?.id], enabled: !!sede && hasModule('mant_in_situ_regional'),
    queryFn: async () => {
      const id = sede!.id
      const [configResult, codigos, asignaciones, destinos, peajes, instrumentos] = await Promise.all([
        supabase.from('mant_regional_config').select('*').eq('sede_id', id).single(),
        fetchAllRows<CodigoRegional>('mant_regional_servicios', q => q.order('codigo')),
        fetchAllRows<EquipoRegional>('mant_regional_referencias', q => q.order('referencia')),
        fetchAllRows<DestinoRegional>('mant_regional_destinos', q => q.eq('sede_id', id).order('municipio')),
        fetchAllRows<MantInSituPeaje>('mant_regional_peajes', q => q.order('nombre')),
        fetchAllRows<Instrumento>('codigos_inet', q => q.order('codigo')),
      ])
      if (configResult.error) throw configResult.error
      const config: MantInSituConfig = { ...configResult.data, id: 1, origen_nombre: sede!.nombre,
        origen_direccion: sede!.direccion, origen_lat: sede!.lat, origen_lng: sede!.lng, rutas_consultadas_at: null }
      const porCodigo = new Map(codigos.map(c => [c.codigo, c]))
      const porReferencia = new Map(instrumentos.map(i => [i.codigo, i]))
      const equipos: EquipoInSitu[] = asignaciones.map(a => {
        const c = porCodigo.get(a.codigo), i = porReferencia.get(a.referencia)
        const horas = a.horas ?? c?.horas ?? null, precio = a.precio ?? c?.precio ?? null
        return { referencia: a.referencia, nombre: i?.descripcion ?? '', familia: i?.familia ?? '',
          codigo: a.codigo, horas, precio, descripcionServicio: a.descripcion_servicio ?? config.descripcion_servicio,
          precioIndividual: a.precio != null, tieneExcepcion: a.horas != null || a.precio != null,
          completo: !!c && precio != null && precio > 0 && horas != null && horas > 0,
          codigoNormal: '', excepcion: null }
      })
      return { config, codigos, asignaciones, destinos: destinos.filter(d => Number(d.ida_km) <= 60), peajes, equipos }
    } })
}

export function useInvalidarRegional() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['regional'] })
}
