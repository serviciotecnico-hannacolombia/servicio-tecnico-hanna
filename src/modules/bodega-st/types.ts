export type EstadoRestauracion = 'en_diagnostico' | 'en_reparacion' | 'incompleto_espera_partes' | 'restaurado_listo';

export const UBICACIONES_BODEGA_ST: string[] = [
  'Bodega CC 1',
  'Bodega CC 2',
  'Rack CC 1',
  'Rack CC 2',
];

export const BODEGAS_DESTINO: string[] = [
  'Bodega Principal',
  'Bodega Incompletos',
];

export interface RegistroBodegaST {
  id?: string;
  registro_id?: string;
  created_at?: string;
  qr_equipo: string;
  referencia: string;
  numero_serie: string;
  nombre_equipo: string;
  estado: EstadoRestauracion;
  partes_requeridas?: string;
  reparaciones_realizadas?: string;
  tecnico_responsable?: string;
  ubicacion_estante?: string;
  bodega_destino?: string;
  observaciones?: string;
}

export interface BodegaSTAudit {
  id: string;
  bodega_st_id: string | null;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  datos_anteriores: RegistroBodegaST | null;
  datos_nuevos: RegistroBodegaST | null;
  usuario_id: string | null;
  created_at: string;
}