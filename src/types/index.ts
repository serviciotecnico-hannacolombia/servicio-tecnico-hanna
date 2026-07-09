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

export type UserRole = 'admin' | 'user'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
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

export type EstadoOtstBodega = 'en_bodega' | 'contactado' | 'retirado'
export type TipoMovimientoOtst = 'ingreso' | 'traslado' | 'contacto' | 'retiro'

export interface OtstBodega {
  id: string
  otst: string
  correo_cliente: string | null
  mes_ingreso: number
  anio_ingreso: number
  columna: string
  fila: number
  subcolumna: number
  estado: EstadoOtstBodega
  nota: string | null
  usuario: string | null
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
  mes: number
  anio: number
  columnas: string[]
  created_at: string
}

export interface OtstBodegaConfig {
  id: number
  umbral_meses: number
  columnas: string[]
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
