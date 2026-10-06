// Escrituras de la Configuración de Mant. In Situ, compartidas por la
// edición en bloque de la interfaz y la importación CSV. Todas devuelven el
// mensaje de error o null.
import { supabase } from '../../lib/supabase'
import type { EquipoInSitu } from './hooks/useMantInSitu'
import type { MantInSituConfig, MantInSituDestino, MantInSituEquipoExcepcion } from '../../types'

const LOTE = 500

function lotes<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += LOTE) out.push(items.slice(i, i + LOTE))
  return out
}

// Asigna (o quita, con null) el código in situ en codigos_inet. Va por la
// RPC porque la escritura directa de codigos_inet es del módulo Códigos.
export async function asignarCodigoInSitu(referencias: string[], codigo: string | null): Promise<string | null> {
  for (const lote of lotes(referencias)) {
    const { error } = await supabase.rpc('mant_in_situ_asignar_codigo', { p_referencias: lote, p_codigo: codigo })
    if (error) return error.message
  }
  return null
}

export type ExcepcionEquipo = Omit<MantInSituEquipoExcepcion, 'referencia' | 'updated_at'>

export function excepcionActual(e: EquipoInSitu): ExcepcionEquipo {
  return {
    horas: e.excepcion?.horas ?? null,
    precio: e.excepcion?.precio ?? null,
    descripcion_servicio: e.excepcion?.descripcion_servicio ?? null,
  }
}

// Guarda las excepciones nuevas por referencia: upsert de las que tienen
// algún valor y borrado de las que quedaron vacías.
export async function guardarExcepciones(nuevas: Map<string, ExcepcionEquipo>): Promise<string | null> {
  const ahora = new Date().toISOString()
  const upserts: MantInSituEquipoExcepcion[] = []
  const borrar: string[] = []
  for (const [referencia, exc] of nuevas) {
    if (exc.horas == null && exc.precio == null && exc.descripcion_servicio == null) borrar.push(referencia)
    else upserts.push({ referencia, ...exc, updated_at: ahora })
  }
  for (const lote of lotes(upserts)) {
    const { error } = await supabase.from('mant_in_situ_equipos').upsert(lote, { onConflict: 'referencia' })
    if (error) return error.message
  }
  for (const lote of lotes(borrar)) {
    const { error } = await supabase.from('mant_in_situ_equipos').delete().in('referencia', lote)
    if (error) return error.message
  }
  return null
}

// ── Códigos in situ ─────────────────────────────────────────────────────────

// Renombrar cambia la PK: el ON UPDATE CASCADE de codigos_inet propaga el
// nombre nuevo a todas las referencias que lo tienen asignado.
export async function actualizarCodigo(original: string, datos: { codigo: string, precio: number, horas: number }): Promise<string | null> {
  const { error } = await supabase.from('mant_in_situ_codigos')
    .update({ ...datos, updated_at: new Date().toISOString() }).eq('codigo', original)
  return error?.message ?? null
}

export async function crearCodigo(datos: { codigo: string, precio: number, horas: number }): Promise<string | null> {
  const { error } = await supabase.from('mant_in_situ_codigos').insert(datos)
  if (error?.code === '23505') return `El código ${datos.codigo} ya existe`
  return error?.message ?? null
}

// Las referencias que lo tenían quedan sin asignar (ON DELETE SET NULL).
export async function eliminarCodigo(codigo: string): Promise<string | null> {
  const { error } = await supabase.from('mant_in_situ_codigos').delete().eq('codigo', codigo)
  return error?.message ?? null
}

// ── Destinos y peajes ───────────────────────────────────────────────────────

export type DatosDestino = Pick<MantInSituDestino, 'ida_km' | 'ida_min' | 'regreso_km' | 'regreso_min' | 'peaje_manual_valor' | 'peaje_manual_motivo' | 'activo'>

export async function guardarDestino(codigo: string, datos: DatosDestino): Promise<string | null> {
  const { error } = await supabase.from('mant_in_situ_destinos')
    .update({ ...datos, updated_at: new Date().toISOString() }).eq('codigo', codigo)
  return error?.message ?? null
}

export async function guardarPeaje(id: string, datos: { tarifa_categoria_i: number, actualizado: string | null }): Promise<string | null> {
  const { error } = await supabase.from('mant_in_situ_peajes')
    .update({ ...datos, updated_at: new Date().toISOString() }).eq('id', id)
  return error?.message ?? null
}

// ── Jornada y vehículo ──────────────────────────────────────────────────────

export async function guardarConfig(datos: Partial<Omit<MantInSituConfig, 'id' | 'updated_at'>>): Promise<string | null> {
  const { error } = await supabase.from('mant_in_situ_config')
    .update({ ...datos, updated_at: new Date().toISOString() }).eq('id', 1)
  return error?.message ?? null
}
