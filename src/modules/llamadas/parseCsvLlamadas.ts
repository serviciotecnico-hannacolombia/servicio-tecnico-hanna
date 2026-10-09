// Parser del "CSV del día" de Control de Llamadas. Acepta tanto el formato
// con comas como el export de la intranet / Excel en español, que usa ";"
// y trae encabezados con texto extra (ej. "OTSTordenar por icono").
// Las columnas se ubican por su encabezado; si no se reconoce ninguno, se
// usa el orden clásico OTST, Cliente, Técnico Asignado, ¿En garantía?.

export interface CsvRowLlamada {
  otst: string
  cliente: string
  ingeniero: string
  garantia: 'SI' | 'NO'
}

const SEPARADORES = [';', ',', '\t'] as const

function contarFueraDeComillas(linea: string, sep: string): number {
  let n = 0, enComillas = false
  for (const ch of linea) {
    if (ch === '"') enComillas = !enComillas
    else if (ch === sep && !enComillas) n++
  }
  return n
}

function detectarSeparador(encabezado: string): string {
  let mejor = ',', max = 0
  for (const sep of SEPARADORES) {
    const n = contarFueraDeComillas(encabezado, sep)
    if (n > max) { mejor = sep; max = n }
  }
  return mejor
}

// Separa una línea respetando comillas ("EMPRESA, SAS") y comillas escapadas ("").
function separar(linea: string, sep: string): string[] {
  const cols: string[] = []
  let cur = '', enComillas = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]
    if (ch === '"') {
      if (enComillas && linea[i + 1] === '"') { cur += '"'; i++ }
      else enComillas = !enComillas
    } else if (ch === sep && !enComillas) { cols.push(cur.trim()); cur = '' }
    else cur += ch
  }
  cols.push(cur.trim())
  return cols
}

const normalizar = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function parseCsvLlamadas(texto: string): CsvRowLlamada[] {
  const lineas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim())
  if (lineas.length < 2) return []

  const sep = detectarSeparador(lineas[0])
  const encabezados = separar(lineas[0], sep).map(normalizar)
  const buscar = (...claves: string[]) => encabezados.findIndex(h => claves.some(c => h.includes(c)))
  const idx = {
    otst: buscar('otst'),
    cliente: buscar('cliente'),
    ingeniero: buscar('tecnico', 'ingeniero'),
    garantia: buscar('garantia'),
  }
  // Encabezados no reconocidos → orden clásico por posición.
  const col = (campo: keyof typeof idx, posicion: number) => idx[campo] >= 0 ? idx[campo] : posicion

  return lineas.slice(1).map(linea => {
    const cols = separar(linea, sep)
    const g = normalizar(cols[col('garantia', 3)] ?? '').trim()
    return {
      otst: (cols[col('otst', 0)] ?? '').trim(),
      cliente: (cols[col('cliente', 1)] ?? '').trim(),
      ingeniero: (cols[col('ingeniero', 2)] ?? '').trim(),
      garantia: (g === 'si' || g === 'yes' || g === 's') ? 'SI' as const : 'NO' as const,
    }
  }).filter(r => r.otst)
}
