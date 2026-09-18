export interface MedicionFila {
  valor: string;
  estandar: string;
  tolerancia: string;
}

// Un bloque = una tabla de Mediciones para un equipo (título + filas), más
// notas narrativas para plantillas sin tabla (Bomba, Reactivo, Titulador).
export interface MedicionBloque {
  titulo: string;
  filas: MedicionFila[];
  notas: string;
  // Referencia a la plantilla de origen (si vino de una) — permite que
  // "Guardar como plantilla" ofrezca actualizarla en vez de crear otra.
  plantilla_id: string | null;
}

export interface CertificadoPlantilla {
  id: string;
  codigo: string;
  nombre: string | null;
  categoria: string | null;
  filas: MedicionFila[];
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
  equipos: EquipoFila[];
  soluciones: SolucionFila[];
  mediciones: MedicionBloque[];
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
  // real de factura: la plantilla es solo el punto de partida — el técnico
  // edita el título y las filas antes de copiar).
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
