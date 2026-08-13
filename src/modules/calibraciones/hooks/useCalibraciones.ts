import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type { Asesor, CorreoProveedor, EstadoCalibracion, Modalidad, OrdenCalibracion, OrdenCalibracionHistorial, OrdenCalibracionParametro, RvCalibrItem } from '../../../types'

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
      const { data, error } = await supabase.from('rv_calibr_catalogo').select('*')
      if (error) throw error
      // Orden numérico (1, 2, 3…) — un ORDER BY de texto en 'codigo' pondría
      // "RV CALIBR.10" antes que "RV CALIBR.2".
      return (data as RvCalibrItem[]).sort((a, b) =>
        Number(a.codigo.replace(/\D/g, '')) - Number(b.codigo.replace(/\D/g, '')))
    },
    enabled: !!user,
  })
}

export function useAsesores() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['calibraciones_asesores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calibraciones_asesores').select('*').order('nombre')
      if (error) throw error
      return data as Asesor[]
    },
    enabled: !!user,
  })
}

// Reutiliza el maestro de proveedores del módulo de Correos OC
// (correos_proveedores) — son los mismos laboratorios de calibración a los
// que ya se les envían las órdenes de compra por correo.
export function useProveedores() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['correos_proveedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('correos_proveedores').select('*').order('nombre')
      if (error) throw error
      return data as CorreoProveedor[]
    },
    enabled: !!user,
  })
}

// Sede Hanna Dorado solo calibra con este laboratorio.
export const PROVEEDOR_SEDE_HANNA = 'METROLOGICAL CENTER SAS'

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
    asesores: () => qc.invalidateQueries({ queryKey: ['calibraciones_asesores'] }),
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
  control_calidad: 'en_curso',
  envio_certificados: 'en_curso',
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
  en_mantenimiento_reparacion: 'En mantenimiento y reparación',
  en_programacion_visita: 'En programación de visita',
  visita_programada: 'Visita programada',
  enviado: 'Enviado',
  en_calibracion: 'En calibración',
  en_retorno: 'En retorno',
  novedad: 'Novedad',
  control_calidad: 'Control de calidad',
  envio_certificados: 'Envío de certificados',
  terminado: 'Terminado',
}

// ── Flujo de estados: difiere según modalidad. Laboratorio externo pasa por
// envío/retorno del equipo; sede Hanna Dorado e in situ programan una visita
// en vez de enviarlo. Ambos flujos cierran con "Control de calidad" antes de
// Terminado. Cada etapa declara los campos que pide el asistente al avanzar
// a la siguiente (ModalAvanzarEtapa en OrdenCalibracionDetailPage). ─────────

export interface CampoTransicion {
  key: keyof OrdenCalibracion
  label: string
  tipo: 'date' | 'text'
}

export interface EtapaFlujo {
  key: string
  label: string
  match: EstadoCalibracion[]
  siguiente?: { estado: EstadoCalibracion, label: string, campos: CampoTransicion[] }
}

export const FLUJO_LABORATORIO: EtapaFlujo[] = [
  { key: 'oc_creada', label: 'OC creada', match: ['oc_creada'] },
  // Sin "siguiente" en estas dos: el paso a la siguiente etapa lo maneja
  // cada vista dedicada por su cuenta (VistaMantenimiento decide el destino
  // según la modalidad; "Siguiente paso" fija Para enviar directamente).
  { key: 'en_mantenimiento_reparacion', label: 'En mantenimiento y reparación', match: ['en_mantenimiento_reparacion'] },
  {
    key: 'para_enviar', label: 'Para enviar', match: ['para_enviar'],
    // Sin "siguiente" aquí: VistaParaEnviar maneja su propia transición a
    // "Enviado" con un resumen dedicado en vez del bloque genérico.
  },
  {
    key: 'enviado', label: 'Enviado', match: ['enviado'],
    // Sin "siguiente" aquí: VistaEnviado maneja su propia transición a
    // "En calibración" con un resumen dedicado en vez del bloque genérico.
  },
  {
    key: 'en_calibracion', label: 'En calibración', match: ['en_calibracion'],
    // Sin "siguiente" aquí: VistaEnCalibracion maneja su propia transición a
    // "En retorno" con un resumen dedicado en vez del bloque genérico.
  },
  {
    key: 'en_retorno', label: 'En retorno', match: ['en_retorno'],
    // Sin "siguiente" aquí: VistaEnRetorno maneja su propia transición a
    // "Control de calidad" con un resumen dedicado en vez del bloque genérico.
  },
  {
    key: 'control_calidad', label: 'Control de calidad', match: ['control_calidad'],
    // Sin "siguiente" aquí: VistaControlCalidad maneja su propia transición a
    // "Envío de certificados" con un resumen dedicado en vez del bloque genérico.
  },
  {
    key: 'envio_certificados', label: 'Envío de certificados', match: ['envio_certificados'],
    // Sin "siguiente" aquí: VistaEnvioCertificados maneja su propia transición
    // a "Terminado" con un resumen dedicado en vez del bloque genérico.
  },
  { key: 'terminado', label: 'Terminado', match: ['terminado'] },
]

export const FLUJO_SITIO: EtapaFlujo[] = [
  { key: 'oc_creada', label: 'OC creada', match: ['oc_creada'] },
  // Sin "siguiente" en estas dos: igual que en el flujo de laboratorio, el
  // paso a la siguiente etapa lo resuelve cada vista dedicada.
  { key: 'en_mantenimiento_reparacion', label: 'En mantenimiento y reparación', match: ['en_mantenimiento_reparacion'] },
  {
    key: 'visita_programada', label: 'Visita programada', match: ['en_programacion_visita', 'visita_programada'],
    siguiente: {
      estado: 'en_calibracion', label: 'En calibración', campos: [
        { key: 'codigo_recepcion', label: 'Código de recepción', tipo: 'text' },
        { key: 'certificado_fecha_inicio', label: 'Inicio de calibración', tipo: 'date' },
      ],
    },
  },
  {
    key: 'en_calibracion', label: 'En calibración', match: ['en_calibracion'],
    siguiente: {
      estado: 'control_calidad', label: 'Control de calidad', campos: [
        { key: 'certificado_fecha_fin', label: 'Fin de calibración (emisión de certificado)', tipo: 'date' },
      ],
    },
  },
  {
    key: 'control_calidad', label: 'Control de calidad', match: ['control_calidad'],
    // Sin "siguiente" aquí: VistaControlCalidad maneja su propia transición a
    // "Envío de certificados" con un resumen dedicado en vez del bloque genérico.
  },
  {
    key: 'envio_certificados', label: 'Envío de certificados', match: ['envio_certificados'],
    // Sin "siguiente" aquí: VistaEnvioCertificados maneja su propia transición
    // a "Terminado" con un resumen dedicado en vez del bloque genérico.
  },
  { key: 'terminado', label: 'Terminado', match: ['terminado'] },
]

// Con modalidad sin definir todavía no sabemos si el siguiente paso es
// "Para enviar" o "Visita programada" — se usa el flujo de laboratorio solo
// para pintar el stepper; las vistas que dependen de la modalidad se
// deshabilitan hasta que se elija (ver OrdenCalibracionDetailPage).
//
// "En mantenimiento y reparación" es un desvío opcional: solo se muestra
// como paso del stepper si la orden realmente pasó por ahí (a diferencia de
// "Para enviar"/"Visita programada", que sí son parte fija del flujo). El
// llamador decide `incluirMantenimiento` — normalmente
// `estado === 'en_mantenimiento_reparacion' || !!fecha_salida_mantenimiento`.
export function flujoPorModalidad(modalidad: Modalidad | null, incluirMantenimiento: boolean): EtapaFlujo[] {
  const base = modalidad === 'sede_hanna_dorado' || modalidad === 'in_situ' ? FLUJO_SITIO : FLUJO_LABORATORIO
  return incluirMantenimiento ? base : base.filter(s => s.key !== 'en_mantenimiento_reparacion')
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

export function hoyISO(): string { return localISO(new Date()) }

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
  cantidad_equipos: 'Cantidad de equipos',
  fecha_salida_mantenimiento: 'Salida de mantenimiento',
  fecha_programada_envio: 'Programada de envío',
  fecha_envio: 'Envío',
  nota_envio: 'Nota de envío',
  codigos_certificados: 'Códigos de certificados',
  certificado_fecha_inicio: 'Certificados — inicio',
  certificado_fecha_fin: 'Certificados — fin',
  fecha_salida_lab: 'Salida del laboratorio',
  fecha_retorno: 'Retorno',
  nota_retorno: 'Nota de retorno',
  fecha_llegada_hanna: 'Llegada a Hanna',
  fecha_entrega_certificado: 'Entrega del certificado',
  carta_entrega: 'Carta de entrega',
  carta_certificado: 'Carta del certificado',
  fecha_control_calidad: 'Fecha de control de calidad',
  notas_control_calidad: 'Notas de control de calidad',
  parametros_nota: 'Notas de parámetros',
  valor_oc_antes_iva: 'Valor OC antes de IVA',
}

const CAMPOS_FECHA = new Set([
  'fecha_programada_envio', 'fecha_envio', 'certificado_fecha_inicio', 'certificado_fecha_fin',
  'fecha_salida_lab', 'fecha_retorno', 'fecha_llegada_hanna', 'fecha_entrega_certificado',
  'fecha_salida_mantenimiento', 'fecha_control_calidad',
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
