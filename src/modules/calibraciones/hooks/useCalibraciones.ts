import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import { businessDaysBetween } from '../../../lib/colombiaCalendar'
import type { Asesor, CorreoProveedor, EstadoCalibracion, Modalidad, OrdenCalibracion, OrdenCalibracionHistorial, OrdenCalibracionParametro, RvCalibrItem, UbicacionEquipo } from '../../../types'

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

// Contador para el badge del Sidebar — cuántas órdenes están vencidas ahora
// mismo (mismo patrón que useTareasBadgeCount en modules/tareas/hooks/useTareas.ts).
export function useCalibracionesBadgeCount(): number {
  const { user, hasModule } = useUser()
  const { data } = useQuery({
    queryKey: ['calibraciones_badge', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordenes_calibracion')
        .select('estado, modalidad, certificado_fecha_fin, fecha_programada_envio, fecha_llegada_metrologo, fecha_envio, fecha_retorno, fecha_llegada_hanna, estado_desde')
        .neq('estado', 'terminado')
      if (error) throw error
      return data as OrdenParaSemaforo[]
    },
    enabled: !!user && hasModule('calibraciones'),
    refetchInterval: 60_000,
  })
  if (!data) return 0
  return data.filter(o => semaforoOrden(o) === 'vencida').length
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

// Todos los parámetros (servicios RV CALIBR) de todas las órdenes — a
// diferencia de useOrdenParametros (una orden), esto sirve para agregar por
// magnitud a través de varias órdenes a la vez (ej. coordinación semanal de
// Sede Hanna Dorado). Tabla pequeña, se carga completa y se filtra en cliente.
export function useTodosParametros() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['ordenes_calibracion_parametros_todos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ordenes_calibracion_parametros').select('*')
      if (error) throw error
      return data as OrdenCalibracionParametro[]
    },
    enabled: !!user,
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

// ── Novedad ──────────────────────────────────────────────────────────────────
// Bandera independiente del estado real de la orden (novedad_detalle no nulo
// = activa) — a diferencia del viejo diseño, no reemplaza el estado ni toca
// fechas/semáforo. "Marcar" y "resolver" cambian esa columna (ya auditada
// por el trigger de BD); los avances intermedios se registran directo en el
// historial desde el cliente, igual que logServiciosChange.

export async function marcarNovedad(ordenId: string, detalle: string) {
  const { error } = await supabase.from('ordenes_calibracion')
    .update({ novedad_detalle: detalle.trim() }).eq('id', ordenId)
  if (error) throw error
}

export async function agregarAvanceNovedad(ordenId: string, mensaje: string) {
  const { error } = await supabase.from('ordenes_calibracion_historial').insert({
    orden_id: ordenId, campo: 'novedad_avance', valor_nuevo: mensaje.trim(),
  })
  if (error) throw error
}

export async function resolverNovedad(ordenId: string, resolucion: string) {
  const { error: e1 } = await supabase.from('ordenes_calibracion_historial').insert({
    orden_id: ordenId, campo: 'novedad_resuelta', valor_nuevo: resolucion.trim(),
  })
  if (e1) throw e1
  const { error: e2 } = await supabase.from('ordenes_calibracion')
    .update({ novedad_detalle: null }).eq('id', ordenId)
  if (e2) throw e2
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
  control_calidad: 'en_curso',
  carga_al_sistema: 'en_curso',
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

export const UBICACION_EQUIPO_LABEL: Record<UbicacionEquipo, string> = {
  en_sitio: 'En sitio (listo)',
  en_bodega: 'En bodega — falta traer',
  en_mantenimiento: 'En mantenimiento',
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
  control_calidad: 'Control de calidad',
  carga_al_sistema: 'Carga al sistema',
  envio_certificados: 'Envío de certificados',
  terminado: 'Terminado',
}

// ── Flujo de estados: difiere según modalidad. Laboratorio externo pasa por
// envío/retorno del equipo; sede Hanna Dorado e in situ programan una visita
// en vez de enviarlo. Ambos flujos cierran con "Control de calidad" y
// "Envío de certificados" antes de Terminado. Cada etapa tiene su propia
// vista dedicada (VistaMantenimiento, VistaParaEnviar, VistaEnviado…) que
// resuelve el paso a la siguiente. ──────────────────────────────────────────

export interface EtapaFlujo {
  key: string
  label: string
  match: EstadoCalibracion[]
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
    // Sin "siguiente" aquí: VistaVisitaProgramada maneja su propia transición
    // a "En calibración" con un resumen dedicado en vez del bloque genérico.
  },
  {
    key: 'en_calibracion', label: 'En calibración', match: ['en_calibracion'],
    // Sin "siguiente" aquí: VistaEnCalibracionSitio maneja su propia
    // transición a "Control de calidad" con un resumen dedicado.
  },
  {
    key: 'control_calidad', label: 'Control de calidad', match: ['control_calidad'],
    // Sin "siguiente" aquí: VistaControlCalidad maneja su propia transición a
    // "Carga al sistema" con un resumen dedicado en vez del bloque genérico.
  },
  {
    key: 'carga_al_sistema', label: 'Carga al sistema', match: ['carga_al_sistema'],
    // Exclusivo del flujo de sitio: aquí se cargan código de recepción,
    // fechas de calibración y códigos de certificados, que en el flujo de
    // laboratorio ya se capturan antes (en "Enviado"). Sin "siguiente" aquí:
    // VistaCargaAlSistema maneja su propia transición a "Envío de certificados".
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

// ── Semáforo por etapa ───────────────────────────────────────────────────
// Cada estado tiene, si aplica, un campo de fecha objetivo propio. Mientras
// esa fecha no exista todavía (OC creada, en mantenimiento, en programación
// de visita antes de fijar fecha…) el semáforo no se queda "apagado": usa la
// antigüedad de la orden en su estado actual (estado_desde, ver migración
// 20260813f) en días hábiles de Colombia para detectar órdenes estancadas.

// Fecha local en formato ISO (no UTC) — con toISOString() el semáforo se
// adelanta un día durante la noche en Colombia (UTC-5).
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function hoyISO(): string { return localISO(new Date()) }

const UMBRAL_PROXIMA_DIAS_HABILES = 2
const UMBRAL_VENCIDA_DIAS_HABILES = 4

// Regla de semáforo por estado. Un estado puede tener una fecha objetivo
// propia — un campo fijo (campoFecha, comparado contra hoy en días
// calendario) o, cuando el objetivo no es un campo directo sino un cálculo,
// una función (calcularObjetivo). El flujo in situ / Sede Hanna Dorado
// recalcula el límite general varias veces según avanza (no hay una sola
// "fecha_programada_envio" que sirva para todo el proceso, como en el
// comentario original suponía):
//   1. en_programacion_visita / visita_programada → fecha_programada_envio
//      ("Fecha estimada de la visita").
//   2. en_calibracion (sitio) → fecha_llegada_metrologo + 10 días (guía).
//      certificado_fecha_fin todavía no existe en este punto del flujo sitio.
//   3. control_calidad / carga_al_sistema → certificado_fecha_fin + 10 días.
//      Ese certificado_fecha_fin es "fecha de fin de calibración" (se fija
//      al salir de en_calibracion) — todavía no es la fecha oficial.
//   4. envio_certificados → certificado_fecha_fin sin +10: en carga_al_
//      sistema el usuario reconfirma/edita ese mismo campo como "Fecha
//      estimada de finalización" oficial al salir hacia envío de
//      certificados, y de ahí en adelante ya no cambia.
// En laboratorio externo certificado_fecha_fin se fija una sola vez (al
// salir de "Enviado") y nunca se reescribe, así que ahí no aplica ningún +10
// — por eso en_calibracion/control_calidad distinguen por modalidad.
// Aparte de la fecha objetivo, un estado puede tener también un SLA de
// tránsito propio en días hábiles desde un campo de referencia — hoy usado
// por "enviado" (fecha_envio, normalmente TCC, entrega máx. 3 días hábiles),
// "en_retorno" (fecha_retorno, mismo SLA de vuelta) y "control_calidad"
// (fecha_llegada_hanna, 1 día hábil completo para revisar el equipo). Cuando
// un estado tiene fecha objetivo y SLA de tránsito a la vez, se evalúan las
// dos y manda la más urgente.
interface ReglaSemaforo {
  campoFecha?: 'fecha_programada_envio' | 'certificado_fecha_fin'
  calcularObjetivo?: (orden: Pick<OrdenCalibracion, 'modalidad' | 'certificado_fecha_fin' | 'fecha_llegada_metrologo'>) => string | null
  campoReferenciaHabiles?: 'fecha_envio' | 'fecha_retorno' | 'fecha_llegada_hanna'
  umbralProximaHabiles?: number
  umbralVencidaHabiles?: number
}

const ES_LABORATORIO = (modalidad: OrdenCalibracion['modalidad']) => modalidad === 'laboratorio_externo'

const REGLA_POR_ESTADO: Partial<Record<EstadoCalibracion, ReglaSemaforo>> = {
  para_enviar: { campoFecha: 'fecha_programada_envio' },
  en_programacion_visita: { campoFecha: 'fecha_programada_envio' },
  visita_programada: { campoFecha: 'fecha_programada_envio' },
  enviado: { campoReferenciaHabiles: 'fecha_envio', umbralProximaHabiles: 2, umbralVencidaHabiles: 3 },
  en_calibracion: {
    calcularObjetivo: orden => ES_LABORATORIO(orden.modalidad)
      ? orden.certificado_fecha_fin
      : (orden.fecha_llegada_metrologo ? sumarDias(orden.fecha_llegada_metrologo, 10) : null),
  },
  en_retorno: { campoFecha: 'certificado_fecha_fin', campoReferenciaHabiles: 'fecha_retorno', umbralProximaHabiles: 2, umbralVencidaHabiles: 3 },
  control_calidad: {
    calcularObjetivo: orden => ES_LABORATORIO(orden.modalidad)
      ? orden.certificado_fecha_fin
      : (orden.certificado_fecha_fin ? sumarDias(orden.certificado_fecha_fin, 10) : null),
    campoReferenciaHabiles: 'fecha_llegada_hanna', umbralProximaHabiles: 0, umbralVencidaHabiles: 1,
  },
  carga_al_sistema: {
    calcularObjetivo: orden => orden.certificado_fecha_fin ? sumarDias(orden.certificado_fecha_fin, 10) : null,
  },
  envio_certificados: { campoFecha: 'certificado_fecha_fin' },
}

// Etiqueta para mostrar junto a la fecha de referencia de días hábiles en la
// UI — solo para los estados con SLA de tránsito propio; el resto usa el
// genérico "En este estado desde" (ver infoAntiguedadEstado).
const ETIQUETA_REFERENCIA_HABILES: Partial<Record<EstadoCalibracion, string>> = {
  enviado: 'Viajando desde',
  en_retorno: 'En retorno desde',
  control_calidad: 'Llegó a Hanna',
}

// Fecha objetivo de la orden según su estado actual — null si el estado no
// tiene una fecha propia todavía (usar antigüedad en días hábiles en su lugar).
export function fechaObjetivo(orden: Pick<OrdenCalibracion, 'estado' | 'modalidad' | 'certificado_fecha_fin' | 'fecha_programada_envio' | 'fecha_llegada_metrologo'>): string | null {
  const regla = REGLA_POR_ESTADO[orden.estado]
  if (regla?.calcularObjetivo) return regla.calcularObjetivo(orden)
  return regla?.campoFecha ? orden[regla.campoFecha] : null
}

export type NivelSemaforo = 'ok' | 'proxima' | 'vencida'

type OrdenParaSemaforo = Pick<OrdenCalibracion, 'estado' | 'modalidad' | 'certificado_fecha_fin' | 'fecha_programada_envio' | 'fecha_llegada_metrologo' | 'fecha_envio' | 'fecha_retorno' | 'fecha_llegada_hanna' | 'estado_desde'>

// Convierte una fecha `date` (YYYY-MM-DD, sin hora) a medianoche local —
// new Date(str) la interpreta en UTC y se corre un día en Colombia (UTC-5).
// Mismo patrón que sumarDias/miercolesSiguiente más abajo.
function fechaLocalDesdeISO(fechaISO: string): Date {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Fecha desde la que se cuentan los días hábiles: el campo de referencia
// propio del estado (ej. fecha_envio para "enviado") si existe, o
// estado_desde por defecto.
function fechaReferenciaHabiles(orden: OrdenParaSemaforo): Date {
  const campo = REGLA_POR_ESTADO[orden.estado]?.campoReferenciaHabiles
  const valor = campo ? orden[campo] : null
  return valor ? fechaLocalDesdeISO(valor) : new Date(orden.estado_desde)
}

// Días hábiles transcurridos desde la referencia del estado actual (0 si
// arrancó hoy) — para "enviado"/"en_retorno" es "días viajando" desde
// fecha_envio/fecha_retorno; para el resto, antigüedad desde estado_desde.
export function diasHabilesEnEstado(orden: OrdenParaSemaforo): number {
  return businessDaysBetween(fechaReferenciaHabiles(orden), new Date())
}

const ORDEN_NIVEL: Record<NivelSemaforo, number> = { ok: 0, proxima: 1, vencida: 2 }
function peorNivel(a: NivelSemaforo, b: NivelSemaforo): NivelSemaforo {
  return ORDEN_NIVEL[a] >= ORDEN_NIVEL[b] ? a : b
}
function nivelPorFecha(objetivo: string): NivelSemaforo {
  if (objetivo < hoyISO()) return 'vencida'
  const limite = new Date()
  limite.setDate(limite.getDate() + 2)
  if (objetivo <= localISO(limite)) return 'proxima'
  return 'ok'
}
function nivelPorHabiles(habiles: number, umbralProxima: number, umbralVencida: number): NivelSemaforo {
  if (habiles >= umbralVencida) return 'vencida'
  if (habiles >= umbralProxima) return 'proxima'
  return 'ok'
}

export function semaforoOrden(orden: OrdenParaSemaforo): NivelSemaforo {
  if (grupoEstado(orden.estado) === 'completado') return 'ok'

  const regla = REGLA_POR_ESTADO[orden.estado]
  let nivel: NivelSemaforo = 'ok'
  let evaluado = false

  if (regla?.campoReferenciaHabiles) {
    const umbralProxima = regla.umbralProximaHabiles ?? UMBRAL_PROXIMA_DIAS_HABILES
    const umbralVencida = regla.umbralVencidaHabiles ?? UMBRAL_VENCIDA_DIAS_HABILES
    nivel = peorNivel(nivel, nivelPorHabiles(diasHabilesEnEstado(orden), umbralProxima, umbralVencida))
    evaluado = true
  }

  const objetivo = fechaObjetivo(orden)
  if (objetivo) {
    nivel = peorNivel(nivel, nivelPorFecha(objetivo))
    evaluado = true
  }

  if (evaluado) return nivel

  // Estado sin regla propia todavía (o con campoFecha configurado pero el
  // campo aún vacío, ej. carga_al_sistema antes de fijar certificado_fecha_fin):
  // usar antigüedad genérica desde estado_desde.
  return nivelPorHabiles(diasHabilesEnEstado(orden), UMBRAL_PROXIMA_DIAS_HABILES, UMBRAL_VENCIDA_DIAS_HABILES)
}

// Diferencia en días calendario entre hoy y una fecha objetivo (negativa si
// ya pasó) — a diferencia de diasHabilesEnEstado, esto compara contra una
// fecha concreta conocida, no mide tiempo transcurrido.
function diasCalendarioHasta(fechaISO: string): number {
  const objetivo = fechaLocalDesdeISO(fechaISO)
  const hoy = new Date()
  const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.round((objetivo.getTime() - hoyLocal.getTime()) / 86_400_000)
}

function textoPlazoCalendario(dias: number): string {
  if (dias < 0) return `Vencida hace ${-dias} día${-dias !== 1 ? 's' : ''}`
  if (dias === 0) return 'Vence hoy'
  return `Vence en ${dias} día${dias !== 1 ? 's' : ''}`
}
function textoPlazoHabiles(restantes: number): string {
  if (restantes <= 0) {
    const exceso = -restantes
    return exceso === 0 ? 'Vencida hoy' : `Vencida hace ${exceso} día${exceso !== 1 ? 's' : ''} hábil${exceso !== 1 ? 'es' : ''}`
  }
  return `Vence en ${restantes} día${restantes !== 1 ? 's' : ''} hábil${restantes !== 1 ? 'es' : ''}`
}

// Cuenta regresiva en palabras hacia el próximo hito de la orden. Cuando el
// estado tiene SLA de tránsito propio (enviado/en_retorno) va primero — es
// lo más urgente/accionable — seguido del plazo general si también aplica
// (ej. en_retorno: "Vence en 2 días hábiles · Vence en 5 días"). Es la misma
// fuente que pinta el semáforo, en texto.
export function descripcionSemaforo(orden: OrdenParaSemaforo): string {
  if (grupoEstado(orden.estado) === 'completado') return ''

  const regla = REGLA_POR_ESTADO[orden.estado]
  const partes: string[] = []

  if (regla?.campoReferenciaHabiles) {
    const umbralVencida = regla.umbralVencidaHabiles ?? UMBRAL_VENCIDA_DIAS_HABILES
    partes.push(textoPlazoHabiles(umbralVencida - diasHabilesEnEstado(orden)))
  }

  const objetivo = fechaObjetivo(orden)
  if (objetivo) partes.push(textoPlazoCalendario(diasCalendarioHasta(objetivo)))

  if (partes.length === 0) {
    partes.push(textoPlazoHabiles(UMBRAL_VENCIDA_DIAS_HABILES - diasHabilesEnEstado(orden)))
  }

  return partes.join(' · ')
}

// Fecha y antigüedad en días hábiles a mostrar junto a "Fecha límite" en la
// lista — null cuando el estado no tiene nada propio que agregar (ya sea
// porque solo tiene fecha objetivo sin SLA de tránsito, o esa fecha ya
// resume todo lo que hay que saber).
export function infoAntiguedadEstado(orden: OrdenParaSemaforo): { etiqueta: string, fechaISO: string, habiles: number } | null {
  if (grupoEstado(orden.estado) === 'completado') return null

  const regla = REGLA_POR_ESTADO[orden.estado]
  const habiles = diasHabilesEnEstado(orden)

  if (regla?.campoReferenciaHabiles) {
    const valor = orden[regla.campoReferenciaHabiles]
    return {
      etiqueta: ETIQUETA_REFERENCIA_HABILES[orden.estado] ?? 'En este estado desde',
      fechaISO: valor || localISO(new Date(orden.estado_desde)),
      habiles,
    }
  }

  if (!fechaObjetivo(orden)) {
    return { etiqueta: 'En este estado desde', fechaISO: localISO(new Date(orden.estado_desde)), habiles }
  }

  return null
}

// ── Efectividad de tiempos (retrospectiva, para la vista "Terminado") ──────
// A diferencia del semáforo en vivo (que mide contra "hoy"), esto compara
// las fechas que la propia orden ya tiene guardadas — cada tramo se evalúa
// con el mismo par de campos que ya se captura en las vistas del flujo, sin
// depender del historial de auditoría. Cada checkpoint solo se evalúa si
// ambas fechas del par existen (algunas rutas se saltan un tramo, ej. una
// orden que pasó por mantenimiento nunca tuvo fecha_programada_envio).

export interface CheckpointEfectividad {
  etapa: string
  cumplio: boolean
  margenTexto: string
}

function diasCalendarioEntre(desdeISO: string, hastaISO: string): number {
  const desde = fechaLocalDesdeISO(desdeISO)
  const hasta = fechaLocalDesdeISO(hastaISO)
  return Math.round((hasta.getTime() - desde.getTime()) / 86_400_000)
}

function textoMargenCalendario(margen: number): string {
  if (margen > 0) return `Se adelantó ${margen} día${margen !== 1 ? 's' : ''}`
  if (margen < 0) return `Se pasó ${-margen} día${-margen !== 1 ? 's' : ''}`
  return 'Justo a tiempo'
}
function textoMargenHabiles(margen: number): string {
  if (margen > 0) return `Se adelantó ${margen} día${margen !== 1 ? 's' : ''} hábil${margen !== 1 ? 'es' : ''}`
  if (margen < 0) return `Se pasó ${-margen} día${-margen !== 1 ? 's' : ''} hábil${-margen !== 1 ? 'es' : ''}`
  return 'Justo a tiempo'
}

export function evaluarEfectividad(orden: Partial<OrdenCalibracion>): { checkpoints: CheckpointEfectividad[], porcentaje: number | null } {
  const checkpoints: CheckpointEfectividad[] = []
  const esLab = orden.modalidad === 'laboratorio_externo'

  // 0. Mantenimiento y reparación a tiempo — solo si la orden realmente pasó
  // por ahí (fecha_salida_mantenimiento_real solo existe en ese caso). Se
  // evalúa igual en ambos flujos, laboratorio y sitio, es el mismo tramo.
  if (orden.fecha_salida_mantenimiento && orden.fecha_salida_mantenimiento_real) {
    const margen = diasCalendarioEntre(orden.fecha_salida_mantenimiento_real, orden.fecha_salida_mantenimiento)
    checkpoints.push({ etapa: 'Mantenimiento y reparación', cumplio: margen >= 0, margenTexto: textoMargenCalendario(margen) })
  }

  // 1. Envío (lab) / Visita (in situ · sede Hanna) a tiempo — vs. la fecha
  // ideal definida en la creación (o al salir de mantenimiento).
  if (orden.fecha_programada_envio) {
    const actual = esLab ? orden.fecha_envio : orden.fecha_llegada_metrologo
    if (actual) {
      const margen = diasCalendarioEntre(actual, orden.fecha_programada_envio)
      checkpoints.push({ etapa: esLab ? 'Envío' : 'Visita', cumplio: margen >= 0, margenTexto: textoMargenCalendario(margen) })
    }
  }

  // 2. Tránsito de envío — 3 días hábiles (solo laboratorio externo).
  if (esLab && orden.fecha_envio && orden.certificado_fecha_inicio) {
    const habiles = businessDaysBetween(fechaLocalDesdeISO(orden.fecha_envio), fechaLocalDesdeISO(orden.certificado_fecha_inicio))
    checkpoints.push({ etapa: 'Tránsito de envío', cumplio: habiles <= 3, margenTexto: textoMargenHabiles(3 - habiles) })
  }

  // 3. Tránsito de retorno — 3 días hábiles (solo laboratorio externo).
  if (esLab && orden.fecha_retorno && orden.fecha_llegada_hanna) {
    const habiles = businessDaysBetween(fechaLocalDesdeISO(orden.fecha_retorno), fechaLocalDesdeISO(orden.fecha_llegada_hanna))
    checkpoints.push({ etapa: 'Tránsito de retorno', cumplio: habiles <= 3, margenTexto: textoMargenHabiles(3 - habiles) })
  }

  // 4. Control de calidad — 1 día hábil. El punto de partida difiere por
  // modalidad: en laboratorio es la llegada a Hanna; en sitio, el fin de la
  // calibración ya marca el inicio de control de calidad (no hay retorno).
  const inicioControlCalidad = esLab ? orden.fecha_llegada_hanna : orden.certificado_fecha_fin
  if (inicioControlCalidad && orden.fecha_control_calidad) {
    const habiles = businessDaysBetween(fechaLocalDesdeISO(inicioControlCalidad), fechaLocalDesdeISO(orden.fecha_control_calidad))
    checkpoints.push({ etapa: 'Control de calidad', cumplio: habiles <= 1, margenTexto: textoMargenHabiles(1 - habiles) })
  }

  // 5. Plazo general del servicio — certificado_fecha_fin es el compromiso
  // máximo de todo el proceso; se cumple si el certificado se entregó a
  // tiempo, sin importar cuánto tardó cada tramo individual.
  if (orden.certificado_fecha_fin && orden.fecha_entrega_certificado) {
    const margen = diasCalendarioEntre(orden.fecha_entrega_certificado, orden.certificado_fecha_fin)
    checkpoints.push({ etapa: 'Plazo general del servicio', cumplio: margen >= 0, margenTexto: textoMargenCalendario(margen) })
  }

  if (checkpoints.length === 0) return { checkpoints, porcentaje: null }
  const cumplidos = checkpoints.filter(c => c.cumplio).length
  return { checkpoints, porcentaje: Math.round((cumplidos / checkpoints.length) * 100) }
}

// Promedio de efectividad sobre las últimas `n` órdenes terminadas (más
// recientes primero por updated_at, que en una orden ya cerrada coincide con
// el momento en que se guardó la transición a "Terminado"). Ignora las
// órdenes sin checkpoints evaluables (evaluarEfectividad devuelve null).
export function efectividadPromedio(ordenes: OrdenCalibracion[], n = 30): number | null {
  const porcentajes = ordenes
    .filter(o => grupoEstado(o.estado) === 'completado')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, n)
    .map(o => evaluarEfectividad(o).porcentaje)
    .filter((p): p is number => p !== null)

  if (porcentajes.length === 0) return null
  return Math.round(porcentajes.reduce((sum, p) => sum + p, 0) / porcentajes.length)
}

// ── Resumen histórico mensual (para la pestaña Análisis) ───────────────────

export interface ResumenMes {
  mes: string
  mesLabel: string
  ordenesCreadas: number
  equiposGestionados: number
  efectividadPromedio: number | null
}

export const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Órdenes creadas y equipos gestionados se cuentan por mes de created_at.
// La efectividad se cuenta por mes en que la orden se cerró (updated_at de
// una orden terminada, igual que en efectividadPromedio) — una orden creada
// en enero pero cerrada en marzo aporta su % al mes de marzo, no al de enero.
export function resumenMensual(ordenes: OrdenCalibracion[], meses = 12): ResumenMes[] {
  const ahora = new Date()
  const resultado: ResumenMes[] = []

  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    const anio = d.getFullYear()
    const mesIdx = d.getMonth()

    const creadasEsteMes = ordenes.filter(o => {
      const c = new Date(o.created_at)
      return c.getFullYear() === anio && c.getMonth() === mesIdx
    })
    const terminadasEsteMes = ordenes.filter(o => {
      if (grupoEstado(o.estado) !== 'completado') return false
      const u = new Date(o.updated_at)
      return u.getFullYear() === anio && u.getMonth() === mesIdx
    })
    const efectividades = terminadasEsteMes
      .map(o => evaluarEfectividad(o).porcentaje)
      .filter((p): p is number => p !== null)

    resultado.push({
      mes: `${anio}-${String(mesIdx + 1).padStart(2, '0')}`,
      mesLabel: `${MES_CORTO[mesIdx]} ${anio}`,
      ordenesCreadas: creadasEsteMes.length,
      equiposGestionados: creadasEsteMes.reduce((s, o) => s + (o.cantidad_equipos || 0), 0),
      efectividadPromedio: efectividades.length
        ? Math.round(efectividades.reduce((s, p) => s + p, 0) / efectividades.length)
        : null,
    })
  }

  return resultado
}

// Ruta in situ / sede Hanna: al terminar mantenimiento se sugiere la fecha
// de la visita como el primer miércoles DESPUÉS de la salida de
// mantenimiento (nunca el mismo día, aunque ese día ya sea miércoles).
export function miercolesSiguiente(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  do {
    fecha.setDate(fecha.getDate() + 1)
  } while (fecha.getDay() !== 3)
  return localISO(fecha)
}

// Ruta in situ / sede Hanna: cálculo de guía (+10 días) que se muestra en
// "En calibración" y se repite en "Carga al sistema" a partir de la misma
// fecha de fin de calibración — no se persiste, es solo informativo.
export function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  fecha.setDate(fecha.getDate() + dias)
  return localISO(fecha)
}

// Rango lunes-domingo de una semana relativa a hoy — offset 0 es la semana
// actual, -1 la anterior, +1 la siguiente. Para coordinación semanal
// (ej. Sede Hanna Dorado).
export function rangoSemana(offset: number): { inicio: string, fin: string } {
  const hoy = new Date()
  const diaSemana = hoy.getDay()
  const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + diffLunes + offset * 7)
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6)
  return { inicio: localISO(lunes), fin: localISO(domingo) }
}

export function estaVencido(orden: OrdenParaSemaforo): boolean {
  return semaforoOrden(orden) === 'vencida'
}

export function proximoAVencer(orden: OrdenParaSemaforo): boolean {
  return semaforoOrden(orden) === 'proxima'
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
  novedad_avance: 'Avance de novedad',
  novedad_resuelta: 'Novedad resuelta',
  enviado_cliente_final: 'Enviado a cliente final',
  cantidad_equipos: 'Cantidad de equipos',
  fecha_salida_mantenimiento: 'Salida estimada de mantenimiento',
  fecha_salida_mantenimiento_real: 'Salida de mantenimiento',
  nota_mantenimiento: 'Nota de mantenimiento',
  fecha_programada_envio: 'Programada de envío',
  fecha_llegada_metrologo: 'Llegada del metrólogo(a)',
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
  ubicacion_equipo: 'Ubicación del equipo',
}

const CAMPOS_FECHA = new Set([
  'fecha_programada_envio', 'fecha_llegada_metrologo', 'fecha_envio', 'certificado_fecha_inicio', 'certificado_fecha_fin',
  'fecha_salida_lab', 'fecha_retorno', 'fecha_llegada_hanna', 'fecha_entrega_certificado',
  'fecha_salida_mantenimiento', 'fecha_salida_mantenimiento_real', 'fecha_control_calidad',
])

export function formatValorHistorial(campo: string, valor: string | null): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (CAMPOS_FECHA.has(campo)) {
    const [y, m, d] = valor.split('-')
    return y && m && d ? `${d}/${m}/${y}` : valor
  }
  if (campo === 'estado') return ESTADO_LABEL[valor as EstadoCalibracion] || valor
  if (campo === 'modalidad') return MODALIDAD_LABEL[valor as Modalidad] || valor
  if (campo === 'ubicacion_equipo') return UBICACION_EQUIPO_LABEL[valor as UbicacionEquipo] || valor
  if (campo === 'enviado_cliente_final') return valor === 'true' ? 'Sí' : 'No'
  if (campo === 'valor_oc_antes_iva') {
    const n = Number(valor)
    return Number.isFinite(n) ? '$' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : valor
  }
  return valor
}
