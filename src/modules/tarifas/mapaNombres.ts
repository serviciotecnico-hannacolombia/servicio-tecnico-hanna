// Cruce de los nombres de Tarifas de Envío (departamento + ciudad, escritos
// a mano en el CSV) con el mapa generado desde la DIVIPOLA del DANE
// (mapaColombia.json, ver scripts/preparar-mapa-colombia.mjs).

export interface MapaDepartamento { cod: string, nombre: string, n: string, d: string }
export interface MapaMunicipio { c: string, n: string, nombre: string, x: number, y: number }
export interface MapaColombiaData {
  viewBox: string
  recuadroSai: { x: number, y: number, w: number, h: number }
  departamentos: MapaDepartamento[]
  municipios: MapaMunicipio[]
}

// Misma limpieza que `limpiar` en scripts/preparar-mapa-colombia.mjs:
// sin tildes, minúsculas, sin "D.C.", paréntesis ni puntuación.
export function limpiarNombre(v: string): string {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\bd\.?\s?c\.?$/, '').replace(/\(.*?\)/g, ' ').replace(/[.,'´`-]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Nombres de departamento que no coinciden con el oficial → código DANE.
const ALIAS_DEPARTAMENTO: Record<string, string> = {
  'bogota': '11',
  'bogota dc': '11',
  'santafe de bogota': '11',
  'distrito capital': '11',
  'valle': '76',
  'norte santander': '54',
  'guajira': '44',
  'san andres': '88',
  'san andres y providencia': '88',
  'san andres providencia y santa catalina': '88',
  'archipielago de san andres': '88',
}

// Ciudades con otro nombre en el CSV → nombre DIVIPOLA limpio, cuando las
// reglas de ubicarEnMapa no alcanzan. La clave lleva el código del
// departamento para no confundir homónimos.
const ALIAS_CIUDAD: Record<string, string> = {
  '88|san andres isla': 'san andres',
  '88|providencia isla': 'providencia',
  '13|mompos': 'santa cruz de mompox',
  '52|tumaco': 'san andres de tumaco',
  '19|piendamo': 'piendamo tunia',
  '73|armero guayabal': 'armero',
  '25|san juan de rio seco': 'san juan de rioseco',
  '70|tolu viejo': 'san jose de toluviejo',
  '05|don matias': 'donmatias',
  '05|san pedro': 'san pedro de los milagros',
  '05|santafe de antioquia': 'santa fe de antioquia',
  '94|barranco minas': 'barrancominas',
  '47|chibolo': 'chivolo',
  '97|papunaua': 'papunahua',
  '47|cerro san antonio': 'cerro de san antonio',
  '23|san andres sotavento': 'san andres de sotavento',
}

export interface UbicacionMapa {
  departamento: MapaDepartamento | null
  municipio: MapaMunicipio | null
}

export function ubicarEnMapa(mapa: MapaColombiaData, departamento: string, ciudad: string): UbicacionMapa {
  const depN = limpiarNombre(departamento || '')
  const ciuN = limpiarNombre(ciudad || '')

  let dep = mapa.departamentos.find(d => d.n === depN)
    || mapa.departamentos.find(d => d.cod === ALIAS_DEPARTAMENTO[depN])
    || null

  const candidatos = (cod: string) => mapa.municipios.filter(m => m.c === cod)
  let mun: MapaMunicipio | null = null
  if (dep) {
    const objetivo = ALIAS_CIUDAD[`${dep.cod}|${ciuN}`] || ciuN
    const enDep = candidatos(dep.cod)
    // Nombre corto vs. oficial: "CARTAGENA" → "cartagena de indias",
    // "CUCUTA" → "san jose de cucuta", "BUGA" → "guadalajara de buga".
    // Solo se acepta si hay un único candidato en el departamento.
    const unico = (f: (m: MapaMunicipio) => boolean) => { const r = enDep.filter(f); return r.length === 1 ? r[0] : null }
    mun = enDep.find(m => m.n === objetivo)
      || unico(m => m.n.startsWith(objetivo + ' '))
      || unico(m => m.n.endsWith(' ' + objetivo))
      || unico(m => objetivo.startsWith(m.n + ' '))
  }
  if (!mun) {
    // Sin departamento reconocido (o mal escrito): solo si el nombre es único en el país.
    const iguales = mapa.municipios.filter(m => m.n === ciuN)
    if (iguales.length === 1) mun = iguales[0]
  }
  // El departamento del municipio manda (p. ej. "CUNDINAMARCA / BOGOTÁ D.C." → Bogotá).
  if (mun && dep?.cod !== mun.c) dep = mapa.departamentos.find(d => d.cod === mun!.c) || dep
  return { departamento: dep, municipio: mun }
}
