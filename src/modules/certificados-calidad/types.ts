export interface MedicionFila {
  valor: string;
  estandar: string;
  tolerancia: string;
}

// Un bloque = una tabla de Mediciones para un equipo (título + filas), o —
// para plantillas sin tabla (Bomba, Reactivo, Titulador, Solución) — un
// encabezado con lote/vencimiento propios de ESE certificado (no de la
// plantilla, que es reutilizable) más el texto de certificación.
export interface MedicionBloque {
  titulo: string;
  filas: MedicionFila[];
  notas: string;
  // Lote y fecha de vencimiento del producto certificado en este bloque
  // (reactivo/solución), propios de esta instancia — varían cada vez que se
  // certifica un lote distinto, así que no se guardan en la plantilla.
  lote: string;
  // "AAAA-MM" (<input type="month">): los certificados de fábrica solo traen
  // mes y año de vencimiento, nunca un día exacto garantizable.
  fecha_vencimiento: string;
  // Referencia a la plantilla de origen (si vino de una) — permite que
  // "Guardar como plantilla" ofrezca actualizarla en vez de crear otra.
  plantilla_id: string | null;
  // Fila de Equipos dueña de este bloque (EquipoFila.id) — cada fila tiene
  // como máximo un bloque: si cambia de plantilla, este bloque se reemplaza
  // en vez de acumularse; si se quita la fila, el bloque se elimina con ella.
  equipo_id: string;
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
  // IDs de ArchivoCertificado elegidos para este certificado (máx. 5, tantos
  // como campos "Adjunto" tiene el formulario de la intranet).
  adjuntos: string[];
  created_at?: string;
}

export interface EquipoFila {
  // Identificador local de la fila (no se persiste como concepto propio),
  // usado para vincular esta fila con su único bloque de Mediciones.
  id: string;
  // Solo elige qué plantilla de mediciones/checklist aplicar — código, serie
  // y demás datos del equipo NO se guardan aquí: la intranet ya los carga
  // sola desde la factura, y no interesa duplicar seriales en este sistema.
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
