export interface VoidRecord {
  id?: string;
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

export interface ParsedQR {
  referencia: string;
  serie: string;
  origen: string;
  nombre: string;
  isValid: boolean;
}