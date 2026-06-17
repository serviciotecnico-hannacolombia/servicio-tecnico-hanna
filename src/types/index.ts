export type EstadoLlamada = 'CIERRE' | 'CONTACTADO' | 'SIN CONTACTO' | 'NO LLAMADO' | ''

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
