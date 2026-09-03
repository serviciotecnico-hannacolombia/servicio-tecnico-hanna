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

export const parseEquipoQR = (qrRaw: string): ParsedQR => {
  if (!qrRaw || qrRaw.trim() === '') {
    return { referencia: '', serie: '', origen: '', nombre: '', isValid: false };
  }

  // Limpiar el QR
  const qrLimpio = qrRaw.trim();
  
  // Intentar dividir por Ñ
  const parts = qrLimpio.split('Ñ').map(p => p.trim()).filter(p => p !== '');

  if (parts.length >= 4) {
    // Formato completo: REF Ñ SERIAL Ñ ORIGEN Ñ NOMBRE
    let nombre = parts[3] || '';
    nombre = traducir(nombre);
    
    return {
      referencia: parts[0] || '',
      serie: parts[1] || '',
      origen: parts[2] || '',
      nombre: nombre,
      isValid: true
    };
  } else if (parts.length === 3) {
    // Formato sin origen: REF Ñ SERIAL Ñ NOMBRE
    let nombre = parts[2] || '';
    nombre = traducir(nombre);
    
    return {
      referencia: parts[0] || '',
      serie: parts[1] || '',
      origen: '',
      nombre: nombre,
      isValid: true
    };
  } else if (parts.length >= 1) {
    // Solo referencia (y quizás serie) — no alcanza a tener nombre de
    // equipo, se deja para corrección manual en vez de marcarlo válido.
    return {
      referencia: parts[0] || '',
      serie: parts[1] || '',
      origen: '',
      nombre: '',
      isValid: false
    };
  }

  return {
    referencia: '',
    serie: '',
    origen: '',
    nombre: '',
    isValid: false
  };
};