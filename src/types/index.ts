export type EstadoLlamada = 'CIERRE' | 'CONTACTADO' | 'SIN CONTACTO' | 'NO LLAMADO' | ''

// ── Correos OC ────────────────────────────────────────────────
export interface CorreoProveedor {
  id: string
  nombre: string
  activo: boolean
}

export interface CorreoDestinatario {
  id: string
  proveedor_id: string
  nombre: string
  email: string
  tipo: 'to' | 'cc'
  orden: number
}

export type ModuleKey =
  | 'llamadas' | 'bodega' | 'consumibles' | 'tarifas' | 'codigos'
  | 'editor' | 'indicadores' | 'correos' | 'reporte_st' | 'tareas'
  | 'mantenimiento_programado' | 'calibraciones' | 'void' | 'bodega_st' | 'admin'

export type CapabilityKey =
  | 'importar_csv_tarifas' | 'importar_csv_codigos' | 'importar_csv_llamadas'
  | 'bodega_registrar_ingreso' | 'editar_codigos' | 'gestion_codigos' | 'bodega_eliminar'
  | 'calibraciones_editar'

export interface Role {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role_id: string | null
  activo: boolean
  avatar_emoji: string | null
  avatar_color: string | null
  created_at: string
}

export interface LlamadaDiario {
  id: string
  otst: string
  cliente: string | null
  ingeniero: string | null
  garantia: 'SI' | 'NO'
  estado: EstadoLlamada
  prioridad: boolean
  hora: string
  usuario: string
  fecha_dia: string
  created_at: string
  updated_at: string
}

export interface LlamadaHistorico {
  id: string
  otst: string
  cliente: string | null
  ingeniero: string | null
  garantia: 'SI' | 'NO'
  estado: EstadoLlamada
  hora: string
  usuario: string
  fecha_dia: string
  archivado_at: string
}

export interface LlamadaCierre {
  fecha: string
  total_llamadas: number
  marcadas_no_llamado: number
  tipo: 'automatico' | 'manual'
  cerrado_en: string
}

export interface ConsumibleLlegada {
  id: string
  fecha: string
  qr: string | null
  ref: string | null
  nombre: string | null
  lote: string | null
  vol: string | null
  venc: string | null
  responsable: string | null
  ubicacion: string | null
  obs: string | null
  created_at: string
}

export interface ConsumibleDestape {
  id: string
  fecha: string
  llegada_id: string | null
  ref: string | null
  nombre: string | null
  lote: string | null
  responsable: string | null
  ubicacion: string | null
  obs: string | null
  created_at: string
}

export interface ConsumibleCatalogo {
  ref: string
  nombre: string
  vol: string | null
  venc: string | null
}

export interface TarifaZona {
  id: string
  zona: string
  zona_codigo: string | null
  transportadora: string | null
  tarifa_base: number | null
  tarifa_kg: number | null
  peso_minimo: number | null
  updated_at: string
}

export type CategoriaIndicador = 'mantenimiento' | 'calibracion' | 'codigos_hanna'

export interface IndicadorMeta {
  id: string
  anio: number
  categoria: CategoriaIndicador
  mes: number
  meta: number
  porcentaje: number | null
  created_at: string
  updated_at: string
}

export interface IndicadorReal {
  id: string
  anio: number
  categoria: CategoriaIndicador
  mes: number
  valor_real: number
  actualizado_por: string | null
  created_at: string
  updated_at: string
}

export interface TarifaEnvio {
  id: number
  numero: number | null
  departamento: string
  ciudad: string
  promesa: string | null
  tarifa_hasta_2m: number | null
  tarifa_2m_3m: number | null
  tarifa_3m_4m: number | null
  tarifa_4m_5m: number | null
  tarifa_5m_6m: number | null
  tarifa_mas_6m: number | null
}

export type EstadoOtstBodega = 'en_bodega' | 'contactado' | 'retirado' | 'novedad'
export type TipoMovimientoOtst = 'ingreso' | 'traslado' | 'contacto' | 'retiro' | 'novedad'

export interface OtstBodega {
  id: string
  otst: string
  correo_cliente: string | null
  nit_cliente: string | null
  mes_ingreso: number
  anio_ingreso: number
  columna: string
  fila: number
  subcolumna: number
  estado: EstadoOtstBodega
  nota: string | null
  usuario: string | null
  responsable_novedad: string | null
  created_at: string
  updated_at: string
}

export interface OtstBodegaMovimiento {
  id: string
  otst_id: string
  tipo: TipoMovimientoOtst
  usuario: string | null
  ubicacion_origen: string | null
  ubicacion_destino: string | null
  motivo: string | null
  created_at: string
}

export interface OtstBodegaZona {
  id: string
  mes_inicio: number
  anio_inicio: number
  mes_fin: number
  anio_fin: number
  columnas: string[]
  created_at: string
}

export interface OtstBodegaConfig {
  id: number
  umbral_meses: number
  columnas: string[]
}

export type EstadoPendienteOtst = 'pendiente' | 'completado'

export interface OtstBodegaPendiente {
  id: string
  otst: string
  otst_id: string | null
  nota: string | null
  estado: EstadoPendienteOtst
  solicitado_por: string | null
  completado_por: string | null
  completado_at: string | null
  created_at: string
}

export interface PlantillaInforme {
  id: string
  nombre: string
  descripcion: string | null
  html: string
  categoria: string | null
  activa: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── Tareas ───────────────────────────────────────────────────────────────────

export type EstadoTarea = 'pendiente' | 'completada'

export interface Tarea {
  id: string
  titulo: string
  descripcion: string | null
  creado_por: string
  asignado_a: string
  fecha_vencimiento: string | null
  estado: EstadoTarea
  completado_at: string | null
  created_at: string
  updated_at: string
}

// ── Mantenimiento Programado ──────────────────────────────────────────────────

export type Periodicidad = 'trimestral' | 'semestral' | 'anual'
export type EstadoEquipoMantenimiento = 'activo' | 'cancelado'

export interface EquipoMantenimiento {
  id: string
  serial: string
  familia: string
  cliente: string
  codigo_mantprog: string | null
  periodicidad: Periodicidad
  fecha_compra: string
  proxima_fecha: string
  estado: EstadoEquipoMantenimiento
  observaciones: string | null
  creado_por: string | null
  created_at: string
  updated_at: string
}

export interface EventoMantenimiento {
  id: string
  equipo_id: string
  fecha_recepcion: string
  fecha_entrega: string | null
  observaciones: string | null
  responsable: string | null
  created_at: string
}

// ── Calibraciones ──────────────────────────────────────────────────────────────

export type Modalidad = 'laboratorio_externo' | 'in_situ' | 'sede_hanna_dorado'

// Ubicación física del equipo — solo relevante para la coordinación semanal
// de Sede Hanna Dorado (a diferencia de in situ, el equipo debe estar en la
// sede antes de que llegue el metrólogo(a)).
export type UbicacionEquipo = 'en_sitio' | 'en_bodega' | 'en_mantenimiento'

export type EstadoCalibracion =
  | 'oc_creada' | 'para_enviar' | 'en_mantenimiento_reparacion'
  | 'en_programacion_visita' | 'visita_programada' | 'enviado'
  | 'en_calibracion' | 'en_retorno'
  | 'control_calidad' | 'carga_al_sistema' | 'envio_certificados' | 'terminado'

export interface RvCalibrItem {
  codigo: string
  magnitud: string
  descripcion: string
  modalidades_permitidas: Modalidad[]
  proveedores_permitidos: string[] | null
  solo_laboratorio_externo: boolean
  envio_exclusivo_tcc: boolean
  activo: boolean
}

export interface OrdenCalibracion {
  id: string
  numero_oc: string | null
  cliente: string
  correo_cliente: string | null
  asesor_id: string | null
  correo_asesor: string | null
  saci: string | null
  link_solicitud: string | null
  otst: string | null
  link_otst: string | null
  codigo_recepcion: string | null
  rmv_fv: string | null
  modalidad: Modalidad | null
  lugar_ejecucion: string | null
  proveedor: string | null
  estado: EstadoCalibracion
  novedad_detalle: string | null
  enviado_cliente_final: boolean
  cantidad_equipos: number | null
  fecha_salida_mantenimiento: string | null
  fecha_salida_mantenimiento_real: string | null
  nota_mantenimiento: string | null
  fecha_programada_envio: string | null
  fecha_llegada_metrologo: string | null
  fecha_envio: string | null
  nota_envio: string | null
  codigos_certificados: string | null
  certificado_fecha_inicio: string | null
  certificado_fecha_fin: string | null
  fecha_salida_lab: string | null
  fecha_retorno: string | null
  nota_retorno: string | null
  fecha_llegada_hanna: string | null
  fecha_entrega_certificado: string | null
  carta_entrega: string | null
  carta_certificado: string | null
  fecha_control_calidad: string | null
  notas_control_calidad: string | null
  parametros_nota: string | null
  valor_oc_antes_iva: number | null
  ubicacion_equipo: UbicacionEquipo | null
  anulada: boolean
  motivo_anulacion: string | null
  creado_por: string | null
  estado_desde: string
  created_at: string
  updated_at: string
}

export interface OrdenCalibracionParametro {
  orden_id: string
  rv_calibr_codigo: string
}

export interface OrdenCalibracionHistorial {
  id: string
  orden_id: string
  usuario_id: string | null
  campo: string
  valor_anterior: string | null
  valor_nuevo: string | null
  created_at: string
}

export interface Asesor {
  id: string
  nombre: string
  correo: string
  plataforma: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

// Logística → Pendientes: remisiones/facturas recibidas pero todavía sin
// procesar en el sistema. factura/remision son opcionales individualmente
// pero al menos una debe existir (validado en el formulario y en la BD).
export interface LogisticaPendiente {
  id: string
  cliente: string
  factura: string | null
  remision: string | null
  otst: string | null
  correo_asesor: string | null
  observaciones: string | null
  creado_por: string | null
  created_at: string
}

// Enlace entre un pendiente y una orden de calibración ya existente — un
// pendiente puede enlazarse a varias órdenes; en cuanto tiene al menos una,
// deja de contar como pendiente por procesar.
export interface LogisticaPendienteOrden {
  pendiente_id: string
  orden_id: string
  created_at: string
}
