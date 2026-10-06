// Exportación e importación CSV de la configuración de Mant. In Situ.
//
// Reglas comunes (para no dañar datos con un archivo masivo):
//   · Solo se ACTUALIZAN registros que ya existen. Una clave desconocida
//     (referencia que no está en Códigos, código, municipio o peaje que no
//     existe) es un error: nunca se crean registros desde el CSV.
//   · Las filas que no vienen en el archivo no se tocan.
//   · Si falta una columna editable, ese campo no se toca en ninguna fila.
//   · Las columnas marcadas "solo lectura" se ignoran al importar.
//   · Primero se arma un plan (vista previa); con cualquier error no se
//     aplica nada.
import { supabase } from '../../lib/supabase'
import { descargarCSV, leerNumero, leerSiNo, texto, type CsvLeido } from './csv'
import type { EquipoInSitu } from './hooks/useMantInSitu'
import { asignarCodigoInSitu, excepcionActual, guardarExcepciones, type ExcepcionEquipo } from './acciones'
import type { MantInSituCodigo, MantInSituDestino, MantInSituPeaje } from '../../types'

export interface CambioCampo { campo: string, antes: string, despues: string }
export interface Cambio { clave: string, detalle?: string, campos: CambioCampo[] }
export interface ErrorFila { fila: number, mensaje: string }

export interface PlanImportacion {
  cambios: Cambio[]
  sinCambio: number
  errores: ErrorFila[]
  camposIgnorados: string[]      // columnas editables que no vinieron → no se tocan
  aplicar: () => Promise<string | null>
}

const fmt = (v: unknown) => v == null || v === '' ? '(vacío)' : String(v)
function normRef(v: string): string {
  return v.trim().toUpperCase().replace(/\s+/g, ' ')
}

// Valida la columna clave y detecta filas duplicadas. Devuelve la clave de
// cada fila (o null si la fila ya tiene error).
function clavesDeFilas(csv: CsvLeido, columnaClave: string, errores: ErrorFila[], normalizar: (v: string) => string): (string | null)[] {
  if (!csv.columnas.includes(columnaClave)) {
    errores.push({ fila: 1, mensaje: `Falta la columna "${columnaClave}".` })
    return csv.filas.map(() => null)
  }
  const vistas = new Map<string, number>()
  return csv.filas.map((f, i) => {
    const fila = i + 2
    const clave = normalizar(texto(f[columnaClave]))
    if (!clave) { errores.push({ fila, mensaje: `"${columnaClave}" vacío.` }); return null }
    if (vistas.has(clave)) { errores.push({ fila, mensaje: `${clave} repetido (también en la fila ${vistas.get(clave)}).` }); return null }
    vistas.set(clave, fila)
    return clave
  })
}

// ── Equipos y servicios ─────────────────────────────────────────────────────

const COLS_EQUIPOS = ['referencia', 'equipo', 'familia', 'codigo_normal', 'codigo_in_situ', 'horas', 'precio_individual', 'descripcion_servicio', 'horas_efectivas', 'precio_efectivo']
const EDITABLES_EQUIPOS = ['codigo_in_situ', 'horas', 'precio_individual', 'descripcion_servicio']

export function exportarEquipos(equipos: EquipoInSitu[]) {
  descargarCSV('equipos', COLS_EQUIPOS, equipos.map(e => [
    e.referencia, e.nombre, e.familia, e.codigoNormal, e.codigo ?? '',
    e.excepcion?.horas ?? '', e.excepcion?.precio ?? '', e.excepcion?.descripcion_servicio ?? '',
    e.horas ?? '', e.precio ?? '',
  ]))
}

// codigo_in_situ se escribe en codigos_inet (vía RPC, agrupado por código);
// horas / precio / descripción son excepciones de mant_in_situ_equipos.
export function planEquipos(csv: CsvLeido, equipos: EquipoInSitu[], codigos: MantInSituCodigo[], descripcionGeneral: string): PlanImportacion {
  const errores: ErrorFila[] = []
  const porRef = new Map(equipos.map(e => [normRef(e.referencia), e]))
  const codigoCanonico = new Map(codigos.map(c => [c.codigo.toUpperCase(), c.codigo]))
  const presentes = EDITABLES_EQUIPOS.filter(c => csv.columnas.includes(c))
  const claves = clavesDeFilas(csv, 'referencia', errores, normRef)

  const cambios: Cambio[] = []
  const asignaciones = new Map<string | null, string[]>()   // código in situ (null = quitar) → referencias
  const excepciones = new Map<string, ExcepcionEquipo>()
  let sinCambio = 0

  csv.filas.forEach((f, i) => {
    const fila = i + 2
    const clave = claves[i]
    if (!clave) return
    const eq = porRef.get(clave)
    if (!eq) { errores.push({ fila, mensaje: `${clave} no existe en Códigos — este archivo no crea equipos.` }); return }

    const actual = excepcionActual(eq)
    const nuevo = { ...actual }
    let codigoNuevo = eq.codigo
    let filaOk = true

    if (presentes.includes('codigo_in_situ')) {
      const v = texto(f.codigo_in_situ)
      if (!v) codigoNuevo = null
      else {
        const canon = codigoCanonico.get(v.toUpperCase())
        if (!canon) { errores.push({ fila, mensaje: `${clave}: el código in situ "${v}" no existe en Precios base.` }); filaOk = false }
        else codigoNuevo = canon
      }
    }
    if (presentes.includes('horas')) {
      const n = leerNumero(f.horas)
      if (n != null && (isNaN(n) || n <= 0 || n > 10000)) { errores.push({ fila, mensaje: `${clave}: horas "${f.horas}" no válidas.` }); filaOk = false }
      else nuevo.horas = n
    }
    if (presentes.includes('precio_individual')) {
      const n = leerNumero(f.precio_individual, true)
      if (n != null && (isNaN(n) || n <= 0)) { errores.push({ fila, mensaje: `${clave}: precio "${f.precio_individual}" no válido (sin decimales, mayor a 0).` }); filaOk = false }
      else nuevo.precio = n
    }
    if (presentes.includes('descripcion_servicio')) {
      const v = texto(f.descripcion_servicio)
      nuevo.descripcion_servicio = !v || v === descripcionGeneral.trim() ? null : v
    }
    if (!filaOk) return

    const campos: CambioCampo[] = []
    if (codigoNuevo !== eq.codigo) {
      campos.push({ campo: 'Código in situ', antes: eq.codigo ?? 'sin asignar', despues: codigoNuevo ?? 'sin asignar' })
      asignaciones.set(codigoNuevo, [...(asignaciones.get(codigoNuevo) ?? []), eq.referencia])
    }
    const cambiaExc = (campo: string, a: unknown, b: unknown) => { if ((a ?? null) !== (b ?? null)) campos.push({ campo, antes: fmt(a), despues: fmt(b) }) }
    cambiaExc('Horas', actual.horas, nuevo.horas)
    cambiaExc('Precio individual', actual.precio, nuevo.precio)
    if (actual.descripcion_servicio !== nuevo.descripcion_servicio) {
      campos.push({ campo: 'Descripción', antes: actual.descripcion_servicio ? 'personalizada' : 'general', despues: nuevo.descripcion_servicio ? 'personalizada' : 'general' })
    }
    if (!campos.length) { sinCambio++; return }
    cambios.push({ clave: eq.referencia, detalle: eq.nombre, campos })
    if (actual.horas !== nuevo.horas || actual.precio !== nuevo.precio || actual.descripcion_servicio !== nuevo.descripcion_servicio) {
      excepciones.set(eq.referencia, nuevo)
    }
  })

  return {
    cambios, sinCambio, errores,
    camposIgnorados: EDITABLES_EQUIPOS.filter(c => !presentes.includes(c)),
    aplicar: async () => {
      for (const [codigo, refs] of asignaciones) {
        const error = await asignarCodigoInSitu(refs, codigo)
        if (error) return error
      }
      return excepciones.size ? guardarExcepciones(excepciones) : null
    },
  }
}

// ── Precios base por código ─────────────────────────────────────────────────

export function exportarCodigos(codigos: MantInSituCodigo[]) {
  descargarCSV('precios-base', ['codigo', 'precio', 'horas'], codigos.map(c => [c.codigo, c.precio, c.horas]))
}

export function planCodigos(csv: CsvLeido, codigos: MantInSituCodigo[]): PlanImportacion {
  const errores: ErrorFila[] = []
  const porCodigo = new Map(codigos.map(c => [c.codigo.toUpperCase(), c]))
  const presentes = ['precio', 'horas'].filter(c => csv.columnas.includes(c))
  const claves = clavesDeFilas(csv, 'codigo', errores, v => v.toUpperCase())
  const cambios: Cambio[] = []
  const upserts: Omit<MantInSituCodigo, 'updated_at'>[] = []
  let sinCambio = 0

  csv.filas.forEach((f, i) => {
    const fila = i + 2
    const clave = claves[i]
    if (!clave) return
    const actual = porCodigo.get(clave)
    if (!actual) { errores.push({ fila, mensaje: `El código ${clave} no existe — este archivo no crea códigos.` }); return }
    const nuevo = { codigo: actual.codigo, precio: actual.precio, horas: actual.horas }
    let ok = true
    if (presentes.includes('precio')) {
      const n = leerNumero(f.precio, true)
      if (n == null || isNaN(n) || n <= 0) { errores.push({ fila, mensaje: `${clave}: precio "${f.precio ?? ''}" obligatorio y mayor a 0.` }); ok = false } else nuevo.precio = n
    }
    if (presentes.includes('horas')) {
      const n = leerNumero(f.horas)
      if (n == null || isNaN(n) || n <= 0) { errores.push({ fila, mensaje: `${clave}: horas "${f.horas ?? ''}" obligatorias y mayores a 0.` }); ok = false } else nuevo.horas = n
    }
    if (!ok) return
    const campos: CambioCampo[] = []
    if (Number(actual.precio) !== nuevo.precio) campos.push({ campo: 'Precio', antes: fmt(actual.precio), despues: fmt(nuevo.precio) })
    if (Number(actual.horas) !== nuevo.horas) campos.push({ campo: 'Horas', antes: fmt(actual.horas), despues: fmt(nuevo.horas) })
    if (!campos.length) { sinCambio++; return }
    cambios.push({ clave: actual.codigo, campos })
    upserts.push(nuevo)
  })

  return {
    cambios, sinCambio, errores,
    camposIgnorados: ['precio', 'horas'].filter(c => !presentes.includes(c)),
    aplicar: async () => {
      if (!upserts.length) return null
      const ahora = new Date().toISOString()
      const { error } = await supabase.from('mant_in_situ_codigos').upsert(upserts.map(u => ({ ...u, updated_at: ahora })), { onConflict: 'codigo' })
      return error?.message ?? null
    },
  }
}

// ── Destinos (rutas y peaje manual) ─────────────────────────────────────────

const COLS_DESTINOS = ['codigo', 'municipio', 'departamento', 'ida_km', 'ida_min', 'regreso_km', 'regreso_min', 'peaje_manual_valor', 'peaje_manual_motivo', 'activo']
const EDITABLES_DESTINOS = ['ida_km', 'ida_min', 'regreso_km', 'regreso_min', 'peaje_manual_valor', 'peaje_manual_motivo', 'activo']
type CampoNumDestino = 'ida_km' | 'ida_min' | 'regreso_km' | 'regreso_min'
const LABEL_DESTINO: Record<string, string> = {
  ida_km: 'Ida (km)', ida_min: 'Ida (min)', regreso_km: 'Regreso (km)', regreso_min: 'Regreso (min)',
  peaje_manual_valor: 'Peaje manual', peaje_manual_motivo: 'Motivo del peaje', activo: 'Activo',
}

// Excel quita los ceros a la izquierda de los códigos DANE (05001 → 5001).
const normDane = (v: string) => /^\d{1,5}$/.test(v.trim()) ? v.trim().padStart(5, '0') : v.trim()

export function exportarDestinos(destinos: MantInSituDestino[]) {
  descargarCSV('destinos', COLS_DESTINOS, destinos.map(d => [
    d.codigo, d.municipio, d.departamento, d.ida_km, d.ida_min, d.regreso_km, d.regreso_min,
    d.peaje_manual_valor, d.peaje_manual_motivo, d.activo ? 'si' : 'no',
  ]))
}

export function planDestinos(csv: CsvLeido, destinos: MantInSituDestino[]): PlanImportacion {
  const errores: ErrorFila[] = []
  const porCodigo = new Map(destinos.map(d => [d.codigo, d]))
  const presentes = EDITABLES_DESTINOS.filter(c => csv.columnas.includes(c))
  const claves = clavesDeFilas(csv, 'codigo', errores, normDane)
  const cambios: Cambio[] = []
  const upserts: Omit<MantInSituDestino, 'revision_peajes'>[] = []
  let sinCambio = 0

  csv.filas.forEach((f, i) => {
    const fila = i + 2
    const clave = claves[i]
    if (!clave) return
    const actual = porCodigo.get(clave)
    if (!actual) { errores.push({ fila, mensaje: `El municipio ${clave} no existe — este archivo no crea destinos.` }); return }
    const { revision_peajes: _revision, ...base } = actual
    void _revision
    const nuevo = { ...base }
    let ok = true
    for (const c of ['ida_km', 'ida_min', 'regreso_km', 'regreso_min'] as CampoNumDestino[]) {
      if (!presentes.includes(c)) continue
      const n = leerNumero(f[c])
      if (n != null && (isNaN(n) || n < 0)) { errores.push({ fila, mensaje: `${actual.municipio}: ${LABEL_DESTINO[c]} "${f[c]}" no válido.` }); ok = false } else nuevo[c] = n
    }
    if (presentes.includes('peaje_manual_valor')) {
      const n = leerNumero(f.peaje_manual_valor, true)
      if (n != null && (isNaN(n) || n < 0)) { errores.push({ fila, mensaje: `${actual.municipio}: peaje manual "${f.peaje_manual_valor}" no válido.` }); ok = false } else nuevo.peaje_manual_valor = n
    }
    if (presentes.includes('peaje_manual_motivo')) nuevo.peaje_manual_motivo = texto(f.peaje_manual_motivo) || null
    if (presentes.includes('activo')) {
      const b = leerSiNo(f.activo)
      if (b == null) { errores.push({ fila, mensaje: `${actual.municipio}: "activo" debe ser si o no.` }); ok = false } else nuevo.activo = b
    }
    if (!ok) return
    const campos: CambioCampo[] = []
    for (const c of EDITABLES_DESTINOS) {
      const a = actual[c as keyof MantInSituDestino], b = nuevo[c as keyof typeof nuevo]
      const igual = typeof a === 'number' || typeof b === 'number' ? (a == null ? null : Number(a)) === (b == null ? null : Number(b)) : (a ?? null) === (b ?? null)
      if (!igual) campos.push({ campo: LABEL_DESTINO[c], antes: c === 'activo' ? (a ? 'si' : 'no') : fmt(a), despues: c === 'activo' ? (b ? 'si' : 'no') : fmt(b) })
    }
    if (!campos.length) { sinCambio++; return }
    cambios.push({ clave: actual.municipio, detalle: actual.codigo, campos })
    upserts.push(nuevo)
  })

  return {
    cambios, sinCambio, errores,
    camposIgnorados: EDITABLES_DESTINOS.filter(c => !presentes.includes(c)),
    aplicar: async () => {
      if (!upserts.length) return null
      const ahora = new Date().toISOString()
      const { error } = await supabase.from('mant_in_situ_destinos').upsert(upserts.map(u => ({ ...u, updated_at: ahora })), { onConflict: 'codigo' })
      return error?.message ?? null
    },
  }
}

// ── Tarifas de peajes ───────────────────────────────────────────────────────

const normPeaje = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ')

function leerFecha(v: string | undefined): string | null | 'invalida' {
  const t = texto(v)
  if (!t) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : 'invalida'
}

export function exportarPeajes(peajes: MantInSituPeaje[]) {
  descargarCSV('peajes', ['nombre', 'tarifa_categoria_i', 'actualizado', 'sector', 'sentido', 'fuente'],
    peajes.map(p => [p.nombre, p.tarifa_categoria_i, p.actualizado, p.sector, p.sentido, p.fuente]))
}

export function planPeajes(csv: CsvLeido, peajes: MantInSituPeaje[]): PlanImportacion {
  const errores: ErrorFila[] = []
  const porNombre = new Map(peajes.map(p => [normPeaje(p.nombre), p]))
  const presentes = ['tarifa_categoria_i', 'actualizado'].filter(c => csv.columnas.includes(c))
  const claves = clavesDeFilas(csv, 'nombre', errores, normPeaje)
  const cambios: Cambio[] = []
  const upserts: Pick<MantInSituPeaje, 'id' | 'nombre' | 'tarifa_categoria_i' | 'actualizado'>[] = []
  let sinCambio = 0

  csv.filas.forEach((f, i) => {
    const fila = i + 2
    const clave = claves[i]
    if (!clave) return
    const actual = porNombre.get(clave)
    if (!actual) { errores.push({ fila, mensaje: `El peaje "${texto(f.nombre)}" no existe — este archivo no crea peajes.` }); return }
    const nuevo = { id: actual.id, nombre: actual.nombre, tarifa_categoria_i: actual.tarifa_categoria_i, actualizado: actual.actualizado }
    let ok = true
    if (presentes.includes('tarifa_categoria_i')) {
      const n = leerNumero(f.tarifa_categoria_i, true)
      if (n == null || isNaN(n) || n < 0) { errores.push({ fila, mensaje: `${actual.nombre}: tarifa "${f.tarifa_categoria_i ?? ''}" obligatoria (sin decimales).` }); ok = false } else nuevo.tarifa_categoria_i = n
    }
    if (presentes.includes('actualizado')) {
      const d = leerFecha(f.actualizado)
      if (d === 'invalida') { errores.push({ fila, mensaje: `${actual.nombre}: fecha "${f.actualizado}" no válida (usa AAAA-MM-DD o DD/MM/AAAA).` }); ok = false } else nuevo.actualizado = d
    }
    if (!ok) return
    const campos: CambioCampo[] = []
    if (Number(actual.tarifa_categoria_i) !== nuevo.tarifa_categoria_i) campos.push({ campo: 'Tarifa cat. I', antes: fmt(actual.tarifa_categoria_i), despues: fmt(nuevo.tarifa_categoria_i) })
    if ((actual.actualizado ?? null) !== nuevo.actualizado) campos.push({ campo: 'Actualizado', antes: fmt(actual.actualizado), despues: fmt(nuevo.actualizado) })
    if (!campos.length) { sinCambio++; return }
    cambios.push({ clave: actual.nombre, campos })
    upserts.push(nuevo)
  })

  return {
    cambios, sinCambio, errores,
    camposIgnorados: ['tarifa_categoria_i', 'actualizado'].filter(c => !presentes.includes(c)),
    aplicar: async () => {
      if (!upserts.length) return null
      const ahora = new Date().toISOString()
      const { error } = await supabase.from('mant_in_situ_peajes').upsert(upserts.map(u => ({ ...u, updated_at: ahora })), { onConflict: 'id' })
      return error?.message ?? null
    },
  }
}
