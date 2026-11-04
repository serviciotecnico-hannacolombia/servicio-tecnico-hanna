// Funciones puras para los equipos de una orden de calibración: lectura
// del bloque pegado desde Excel y comparación de códigos por equipo.

export interface EquipoLeido { referencia: string, serial: string, id_equipo: string | null }

// Códigos de un equipo a guardar (solo los campos que cambiaron).
// Corrección de un equipo por Admin: datos básicos y, en una orden ya
// guardada, también sus códigos (referencia solo aplica a in situ / sede).
export interface EdicionEquipo extends EquipoLeido { codigos_referencia?: string[], codigos_certificado?: string[] }

export interface CambioCodigosEquipo { id: string, codigos_referencia?: string[], codigos_certificado?: string[] }

const ETIQUETAS: Record<string, keyof EquipoLeido | 'marca'> = {
  marca: 'marca',
  modelo: 'referencia',
  referencia: 'referencia',
  serie: 'serial',
  serial: 'serial',
  id: 'id_equipo',
}

const sinTildes = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
export const normalizarSerial = (v: string) => v.trim().toUpperCase()

// Lee el texto copiado de la planilla del cliente. Cada equipo son 4 líneas:
// Marca (se ignora), Modelo, Serie, ID. Si se copió también la columna de
// etiquetas ("Marca<TAB>HANNA"), se usan las etiquetas en vez de la posición.
// existentes: seriales ya registrados en la orden, para avisar repetidos.
export function parsearEquiposExcel(texto: string, existentes: string[] = []): { equipos: EquipoLeido[], errores: string[] } {
  const lineas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.replace(/\s+$/, '').replace(/^\s+/, '')).filter(Boolean)
  const errores: string[] = []
  const equipos: EquipoLeido[] = []
  if (!lineas.length) return { equipos, errores }

  const conEtiqueta = lineas.map(l => {
    const m = l.match(/^([^\t:]+?)\s*[\t:]\s*(.*)$/)
    const clave = m ? ETIQUETAS[sinTildes(m[1]).trim().toLowerCase()] : undefined
    return clave ? { clave, valor: m![2].trim() } : null
  })

  if (conEtiqueta.every(Boolean)) {
    // Agrupa por etiqueta: cada "Marca" (o una etiqueta que ya venía en el equipo actual) abre un equipo nuevo.
    let actual: Partial<EquipoLeido> & { abierto?: boolean } = {}
    const cerrar = () => {
      if (actual.abierto) equipos.push({ referencia: actual.referencia || '', serial: actual.serial || '', id_equipo: actual.id_equipo || null })
      actual = {}
    }
    for (const e of conEtiqueta) {
      const { clave, valor } = e!
      if (clave === 'marca') { cerrar(); actual.abierto = true; continue }
      if (actual[clave] !== undefined) cerrar()
      actual.abierto = true
      actual[clave] = valor
    }
    cerrar()
  } else {
    // Ignora una etiqueta suelta al inicio de línea si viene mezclada ("Serie<TAB>E00…").
    const valores = lineas.map((l, i) => conEtiqueta[i] ? conEtiqueta[i]!.valor : l)
    if (valores.length % 4 !== 0) {
      errores.push(`Se leyeron ${valores.length} líneas; deben ser grupos de 4 (Marca, Modelo, Serie, ID). Revisa que no falte ni sobre ninguna.`)
    }
    for (let i = 0; i + 3 < valores.length; i += 4) {
      equipos.push({ referencia: valores[i + 1], serial: valores[i + 2], id_equipo: valores[i + 3] || null })
    }
  }

  const vistos = new Set(existentes.map(normalizarSerial))
  equipos.forEach((e, i) => {
    const n = i + 1
    if (!e.referencia.trim()) errores.push(`Equipo ${n}: falta el modelo/referencia.`)
    if (!e.serial.trim()) { errores.push(`Equipo ${n}: falta el serial.`); return }
    const s = normalizarSerial(e.serial)
    if (vistos.has(s)) errores.push(`Equipo ${n}: el serial ${e.serial} está repetido.`)
    vistos.add(s)
  })
  return { equipos, errores }
}

// Quita repetidos sin distinguir mayúsculas (se queda con la primera forma escrita).
function sinRepetidos(codigos: string[]): string[] {
  const vistos = new Set<string>()
  return codigos.filter(c => {
    const k = c.toUpperCase()
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  })
}

// "pH26-123, Cl26-256; C3" → ["pH26-123", "Cl26-256", "C3"] (sin vacíos ni
// repetidos). Se respetan mayúsculas/minúsculas: hay certificados como
// pH26-123 o Cl26-256. La comparación (mismosCodigos) sí las ignora.
export function parsearCodigos(texto: string): string[] {
  return sinRepetidos(texto.split(/[,;\n]+/).map(c => c.trim().replace(/\s+/g, ' ')).filter(Boolean))
}

export function mismosCodigos(a: string[], b: string[]): boolean {
  const sa = new Set(a.map(c => c.trim().toUpperCase()))
  const sb = new Set(b.map(c => c.trim().toUpperCase()))
  return sa.size > 0 && sa.size === sb.size && [...sa].every(c => sb.has(c))
}

// Estilos de las tablas de equipos (aquí y no en el .tsx para no romper Fast Refresh).
export const TH_EQUIPOS: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontSize: 10.5, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--muted)', borderBottom: '1px solid var(--border)', fontWeight: 600 }
export const TD_EQUIPOS: React.CSSProperties = { padding: '7px 8px', fontSize: 13, borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }

// Unión de los códigos de todos los equipos, para los campos de texto de la orden.
export function unirCodigos(listas: string[][]): string {
  return sinRepetidos(listas.flat()).join(', ')
}
