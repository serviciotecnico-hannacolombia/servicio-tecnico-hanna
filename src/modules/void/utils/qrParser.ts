export interface ParsedQR {
  referencia: string;
  serie: string;
  origen: string;
  nombre: string;
  isValid: boolean;
}

export const parseEquipoQR = (qrRaw: string): ParsedQR => {
  if (!qrRaw) {
    return { referencia: '', serie: '', origen: '', nombre: '', isValid: false };
  }

  const parts = qrRaw.split('Ñ').map(p => p.trim());

  if (parts.length >= 4) {
    return {
      referencia: parts[0],
      serie: parts[1],
      origen: parts[2],
      nombre: parts[3],
      isValid: true
    };
  }

  return {
    referencia: parts[0] || '',
    serie: parts[1] || '',
    origen: parts[2] || '',
    nombre: parts[3] || '',
    isValid: parts.length > 0
  };
};