export interface VoidRecord {
  id?: string;
  registro_id?: string;
  libro?: string;
  created_at?: string;
  qr_equipo: string;
  referencia?: string;
  numero_serie?: string;
  nombre_equipo?: string;
  void_blanco: string;
  void_gris: string;
  documento_referencia?: string; // Factura, Remisión u OTST
  observaciones?: string;
}

export interface VoidAudit {
  id: string;
  void_id: string | null;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  datos_anteriores: VoidRecord | null;
  datos_nuevos: VoidRecord | null;
  usuario_id: string | null;
  created_at: string;
}

export interface ParsedQR {
  referencia: string;
  serie: string;
  origen: string;
  nombre: string;
  isValid: boolean;
}