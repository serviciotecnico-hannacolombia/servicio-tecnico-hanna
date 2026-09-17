export interface CertificadoPlantilla {
  id: string;
  codigo: string;
  nombre: string | null;
  categoria: string | null;
  mediciones_html: string | null;
  test_funcional_items: string[];
  embalaje_items: string[];
  control_estetico_items: string[];
  notas_generales: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SolucionPatron {
  id: string;
  categoria: string;
  codigo: string | null;
  lote: string | null;
  fecha_expiracion: string | null;
  descripcion: string | null;
  activo: boolean;
}

export interface ArchivoCertificado {
  id: string;
  plantilla_id: string | null;
  categoria: string | null;
  nombre_archivo: string;
  storage_path: string;
  created_at?: string;
}

export interface CertificadoGenerado {
  id?: string;
  tipo_doc: string;
  numero_doc: string;
  nit: string;
  razon_social: string;
  equipos: EquipoFila[];
  soluciones: SolucionFila[];
  mediciones: string;
  checklist: ChecklistState;
  tecnico: string;
  fecha: string;
  created_at?: string;
}

export interface EquipoFila {
  codigo: string;
  nombre: string;
  serie: string;
  sello_calidad: string;
  // Plantilla de mediciones aplicada a esta fila (independiente del código
  // real de factura: muchas plantillas son "familias" genéricas — ej. "pH 2
  // decimales" — que no coinciden literalmente con la referencia facturada).
  plantilla_id: string | null;
}

export interface SolucionFila {
  codigo: string;
  lote: string;
  fecha_expiracion: string;
  descripcion: string;
}

export interface ChecklistState {
  test_funcional: Record<string, boolean>;
  embalaje: Record<string, boolean>;
  control_estetico: Record<string, boolean>;
  extra_test_funcional: string[];
  extra_embalaje: string[];
  extra_control_estetico: string[];
}

export const CHECKLIST_BASE = {
  test_funcional: ['Interruptor ON/OFF', 'LCD', 'Sonido', 'Hora/reloj', 'Teclado', 'Memoria', 'Medición', 'USB', 'Batería', 'Calibración'],
  embalaje: ['Instrumento', 'Sonda', 'Caja', 'Accesorios', 'Cable USB', 'Manual de Instrucciones', 'Soluciones'],
  control_estetico: ['Estética del instrumento'],
} as const;

export function emptyChecklist(): ChecklistState {
  return {
    test_funcional: {},
    embalaje: {},
    control_estetico: {},
    extra_test_funcional: [],
    extra_embalaje: [],
    extra_control_estetico: [],
  };
}
