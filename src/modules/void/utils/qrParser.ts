export interface ParsedQR {
  referencia: string;
  serie: string;
  origen: string;
  nombre: string;
  isValid: boolean;
}

// Diccionario de traducción para términos comunes de equipos
const DICCIONARIO_TRADUCCION: Record<string, string> = {
  // Instrumentos comunes
  'probe': 'Sonda',
  'sensor': 'Sensor',
  'meter': 'Medidor',
  'analyzer': 'Analizador',
  'reader': 'Lector',
  'detector': 'Detector',
  'calibrator': 'Calibrador',
  'transmitter': 'Transmisor',
  'receiver': 'Receptor',
  'controller': 'Controlador',
  'monitor': 'Monitor',
  'indicator': 'Indicador',
  'gauge': 'Manómetro',
  'valve': 'Válvula',
  'pump': 'Bomba',
  'dispenser': 'Dispensador',
  'dosimeter': 'Dosímetro',
  'photometer': 'Fotómetro',
  'spectrometer': 'Espectrómetro',
  'spectrophotometer': 'Espectrofotómetro',
  'chromatograph': 'Cromatógrafo',
  'thermometer': 'Termómetro',
  'hygrometer': 'Higrómetro',
  'barometer': 'Barómetro',
  'manometer': 'Manómetro',
  'voltmeter': 'Voltímetro',
  'ammeter': 'Amperímetro',
  'ohmmeter': 'Ohmímetro',
  'multimeter': 'Multímetro',
  'oscilloscope': 'Osciloscopio',
  'power supply': 'Fuente de alimentación',
  'generator': 'Generador',
  'counter': 'Contador',
  'timer': 'Temporizador',
  'stroboscope': 'Estroboscopio',
  'tachometer': 'Tacómetro',
  'pyrometer': 'Pirómetro',
  'refractometer': 'Refractómetro',
  'polarimeter': 'Polarímetro',
  'balance': 'Balanza',
  'scale': 'Báscula',
  'burette': 'Bureta',
  'pipette': 'Pipeta',
  'syringe': 'Jeringa',
  'centrifuge': 'Centrífuga',
  'incubator': 'Incubadora',
  'autoclave': 'Autoclave',
  'microscope': 'Microscopio',
  'telescope': 'Telescopio',
  'binoculars': 'Binoculares',
  'magnifier': 'Lupa',
  'camera': 'Cámara',
  'printer': 'Impresora',
  'scanner': 'Escáner',
  'microscopy': 'Microscopía',
  'multiparameter': 'Multiparámetro',
  'portable': 'Portátil',
  'digital': 'Digital',
  'analog': 'Analógico',
  'wireless': 'Inalámbrico',
  'conductivity': 'Conductividad',
  'dissolved oxygen': 'Oxígeno disuelto',
  'ph': 'pH',
  'temperature': 'Temperatura',
  'pressure': 'Presión',
  'flow': 'Flujo',
  'level': 'Nivel',
  'turbidity': 'Turbidez',
  'chlorine': 'Cloro',
  'ammonia': 'Amoníaco',
  'nitrate': 'Nitrato',
  'phosphate': 'Fosfato',
  'sulfate': 'Sulfato',
  'hardness': 'Dureza',
  'salinity': 'Salinidad',
  'density': 'Densidad',
};

const traducir = (texto: string): string => {
  if (!texto) return '';

  let resultado = texto;

  // Buscar coincidencias en el diccionario (palabras completas primero)
  for (const [ingles, espanol] of Object.entries(DICCIONARIO_TRADUCCION)) {
    const regex = new RegExp(`\\b${ingles}\\b`, 'gi');
    resultado = resultado.replace(regex, espanol);
  }

  return resultado;
};

// Algunos equipos (los que traen reactivos) insertan una fecha de
// vencimiento entre el origen y el nombre, ej:
// HI98494ÑM04430001111ÑROMANIAÑ12-2028ÑMultiparameter WP pH-EC-OPDo-ORP
// Sin este filtro esa fecha se reconocía como si fuera el nombre del equipo.
const FECHA_VENCIMIENTO_REGEX = /^\d{1,2}[/-]\d{4}$|^\d{4}[/-]\d{1,2}$|^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/;

const esFechaVencimiento = (texto: string): boolean => FECHA_VENCIMIENTO_REGEX.test(texto.trim());

export const parseEquipoQR = (qrRaw: string): ParsedQR => {
  if (!qrRaw || qrRaw.trim() === '') {
    return { referencia: '', serie: '', origen: '', nombre: '', isValid: false };
  }

  // Limpiar el QR
  const qrLimpio = qrRaw.trim();

  // Intentar dividir por Ñ
  const parts = qrLimpio.split('Ñ').map(p => p.trim()).filter(p => p !== '');

  if (parts.length === 0) {
    return { referencia: '', serie: '', origen: '', nombre: '', isValid: false };
  }

  const referencia = parts[0] || '';
  const serie = parts[1] || '';
  // Todo lo que viene después de REF y SERIAL: [ORIGEN?, FECHA_VENCIMIENTO?..., NOMBRE]
  const resto = parts.slice(2);

  if (resto.length === 0) {
    // Solo referencia (y quizás serie) — no alcanza a tener nombre de
    // equipo, se deja para corrección manual en vez de marcarlo válido.
    return { referencia, serie, origen: '', nombre: '', isValid: false };
  }

  // El nombre del equipo siempre es el último campo real (no una fecha).
  let nombreIndex = resto.length - 1;
  while (nombreIndex > 0 && esFechaVencimiento(resto[nombreIndex])) {
    nombreIndex--;
  }

  const nombre = traducir(resto[nombreIndex] || '');
  const origen = resto
    .slice(0, nombreIndex)
    .filter(p => !esFechaVencimiento(p))
    .join(' ');

  return {
    referencia,
    serie,
    origen,
    nombre,
    isValid: true
  };
};