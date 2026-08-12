import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type { EstadoCalibracion, Modalidad, OrdenCalibracion, OrdenCalibracionHistorial, OrdenCalibracionParametro, RvCalibrItem } from '../../../types'

export function useOrdenesCalibracion() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['ordenes_calibracion', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_calibracion').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as OrdenCalibracion[]
    },
    enabled: !!user,
  })
}

export function useOrdenParametros(ordenId: string | null) {
  return useQuery({
    queryKey: ['ordenes_calibracion_parametros', ordenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_calibracion_parametros').select('*').eq('orden_id', ordenId as string)
      if (error) throw error
      return data as OrdenCalibracionParametro[]
    },
    enabled: !!ordenId,
  })
}

export function useCatalogoRvCalibr() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['rv_calibr_catalogo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rv_calibr_catalogo').select('*').order('codigo')
      if (error) throw error
      return data as RvCalibrItem[]
    },
    enabled: !!user,
  })
}

export function useHistorialOrden(ordenId: string | null) {
  return useQuery({
    queryKey: ['ordenes_calibracion_historial', ordenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_calibracion_historial').select('*').eq('orden_id', ordenId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as OrdenCalibracionHistorial[]
    },
    enabled: !!ordenId,
  })
}

export function useInvalidateCalibraciones() {
  const qc = useQueryClient()
  const { user } = useUser()
  return {
    ordenes: () => qc.invalidateQueries({ queryKey: ['ordenes_calibracion', user?.id] }),
    parametros: (ordenId: string) => qc.invalidateQueries({ queryKey: ['ordenes_calibracion_parametros', ordenId] }),
    catalogo: () => qc.invalidateQueries({ queryKey: ['rv_calibr_catalogo'] }),
    historial: (ordenId: string) => qc.invalidateQueries({ queryKey: ['ordenes_calibracion_historial', ordenId] }),
  }
}

// Registra en el historial los servicios RV CALIBR agregados/quitados de una
// orden — el trigger de BD solo audita columnas de ordenes_calibracion, no la
// tabla de parámetros (many-to-many), así que este cambio se registra desde
// el cliente en el mismo insert que ya hace la escritura de parámetros.
export async function logServiciosChange(ordenId: string, antes: Set<string>, despues: Set<string>) {
  const agregados = [...despues].filter(c => !antes.has(c))
  const quitados = [...antes].filter(c => !despues.has(c))
  if (!agregados.length && !quitados.length) return
  const partes: string[] = []
  if (agregados.length) partes.push(`+ ${agregados.join(', ')}`)
  if (quitados.length) partes.push(`- ${quitados.join(', ')}`)
  await supabase.from('ordenes_calibracion_historial').insert({
    orden_id: ordenId, campo: 'servicios', valor_nuevo: partes.join('  '),
  })
}

// ── Estado / grupos ──────────────────────────────────────────────────────────

export type GrupoEstado = 'pendiente' | 'en_curso' | 'completado'

const GRUPO_POR_ESTADO: Record<EstadoCalibracion, GrupoEstado> = {
  oc_creada: 'pendiente',
  para_enviar: 'pendiente',
  en_mantenimiento_reparacion: 'pendiente',
  en_programacion_visita: 'en_curso',
  visita_programada: 'en_curso',
  enviado: 'en_curso',
  en_calibracion: 'en_curso',
  en_retorno: 'en_curso',
  novedad: 'en_curso',
  recolectado_en_hanna: 'completado',
  a_falta_certificado: 'completado',
  terminado: 'completado',
}

export function grupoEstado(estado: EstadoCalibracion): GrupoEstado {
  return GRUPO_POR_ESTADO[estado]
}

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  laboratorio_externo: 'Laboratorio externo',
  in_situ: 'In Situ',
  sede_hanna_dorado: 'Sede Hanna Dorado',
}

export const ESTADO_LABEL: Record<EstadoCalibracion, string> = {
  oc_creada: 'OC creada',
  para_enviar: 'Para enviar',
  en_mantenimiento_reparacion: 'En mantenimiento/reparación',
  en_programacion_visita: 'En programación de visita',
  visita_programada: 'Visita programada',
  enviado: 'Enviado',
  en_calibracion: 'En calibración',
  en_retorno: 'En retorno',
  novedad: 'Novedad',
  recolectado_en_hanna: 'Recolectado / en Hanna',
  a_falta_certificado: 'A falta de certificado',
  terminado: 'Terminado',
}

// ── Semáforo simplificado (días calendario, no días hábiles exactos) ───────
// Aproximación para v1 — no replica el cálculo de días hábiles ni el
// calendario de festivos colombianos del semáforo real de Notion.

export function fechaLimite(orden: Pick<OrdenCalibracion, 'certificado_fecha_fin' | 'fecha_programada_envio'>): string | null {
  return orden.certificado_fecha_fin || orden.fecha_programada_envio || null
}

// Fecha local en formato ISO (no UTC) — con toISOString() el semáforo se
// adelanta un día durante la noche en Colombia (UTC-5).
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hoyISO(): string { return localISO(new Date()) }

export function estaVencido(orden: Pick<OrdenCalibracion, 'estado' | 'certificado_fecha_fin' | 'fecha_programada_envio'>): boolean {
  if (grupoEstado(orden.estado) === 'completado' || orden.estado === 'novedad') return false
  const f = fechaLimite(orden)
  return !!f && f < hoyISO()
}

export function proximoAVencer(orden: Pick<OrdenCalibracion, 'estado' | 'certificado_fecha_fin' | 'fecha_programada_envio'>, dias = 2): boolean {
  if (grupoEstado(orden.estado) === 'completado' || orden.estado === 'novedad' || estaVencido(orden)) return false
  const f = fechaLimite(orden)
  if (!f) return false
  const limite = new Date()
  limite.setDate(limite.getDate() + dias)
  return f <= localISO(limite)
}

// ── Historial: etiquetas y formateo de valores ──────────────────────────────

export const CAMPO_LABEL: Record<string, string> = {
  creacion: 'Creación',
  servicios: 'Servicios RV CALIBR',
  numero_oc: 'No. Orden de Compra',
  cliente: 'Cliente',
  correo_cliente: 'Correo cliente',
  asesor_id: 'Asesor (usuario)',
  correo_asesor: 'Correo asesor',
  saci: 'SACI',
  link_solicitud: 'Link solicitud SACI',
  otst: 'OTST',
  link_otst: 'Link OTST',
  codigo_recepcion: 'Código de recepción',
  rmv_fv: 'RMV/FV',
  modalidad: 'Modalidad',
  lugar_ejecucion: 'Lugar de ejecución',
  proveedor: 'Proveedor',
  estado: 'Estado',
  novedad_detalle: 'Detalle de novedad',
  enviado_cliente_final: 'Enviado a cliente final',
  fecha_programada_envio: 'Programada de envío',
  fecha_envio: 'Envío',
  nota_envio: 'Nota de envío',
  certificado_fecha_inicio: 'Certificados — inicio',
  certificado_fecha_fin: 'Certificados — fin',
  fecha_salida_lab: 'Salida del laboratorio',
  fecha_retorno: 'Retorno',
  nota_retorno: 'Nota de retorno',
  fecha_llegada_hanna: 'Llegada a Hanna',
  fecha_entrega_certificado: 'Entrega del certificado',
  carta_entrega: 'Carta de entrega',
  carta_certificado: 'Carta del certificado',
  parametros_nota: 'Notas de parámetros',
  valor_oc_antes_iva: 'Valor OC antes de IVA',
}

const CAMPOS_FECHA = new Set([
  'fecha_programada_envio', 'fecha_envio', 'certificado_fecha_inicio', 'certificado_fecha_fin',
  'fecha_salida_lab', 'fecha_retorno', 'fecha_llegada_hanna', 'fecha_entrega_certificado',
])

export function formatValorHistorial(campo: string, valor: string | null): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (CAMPOS_FECHA.has(campo)) {
    const [y, m, d] = valor.split('-')
    return y && m && d ? `${d}/${m}/${y}` : valor
  }
  if (campo === 'estado') return ESTADO_LABEL[valor as EstadoCalibracion] || valor
  if (campo === 'modalidad') return MODALIDAD_LABEL[valor as Modalidad] || valor
  if (campo === 'enviado_cliente_final') return valor === 'true' ? 'Sí' : 'No'
  if (campo === 'valor_oc_antes_iva') {
    const n = Number(valor)
    return Number.isFinite(n) ? '$' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : valor
  }
  return valor
}
