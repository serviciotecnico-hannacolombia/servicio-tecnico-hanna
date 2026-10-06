// Motor del cotizador de Mant. In Situ — misma fórmula que el HTML original
// (función calculate), como función pura para poder probarla:
//   horas_viaje = (ida_min + regreso_min) / 60 × (1 + margen%)
//   km_visita   = (ida_km + regreso_km) × (1 + margen%)
//   días        = ⌈horas_mantenimiento / (jornada − horas_viaje)⌉
//   vehículo    = km_visita × días × costo_km
//   combustible = km_visita × días ÷ rendimiento × precio_galon
//   peajes      = (peaje manual ó peajes de ida + regreso) × días
// Bogotá solo cobra el servicio. Los extras (vehículo + combustible +
// peajes) se reparten entre los equipos en proporción a su precio base,
// con redondeo que conserva el total exacto.
import type { EquipoInSitu } from './hooks/useMantInSitu'
import type { MantInSituConfig, MantInSituDestino, MantInSituDestinoPeaje, MantInSituPeaje } from '../../types'

export const CODIGO_BOGOTA_CALCULO = '11001'

export interface PeajeVisita { nombre: string, sentido: 'ida' | 'regreso', precio: number }

export interface PeajesVisita {
  conocido: boolean          // false = falta validar los peajes del destino
  total: number              // por visita (ida + regreso)
  detalle: PeajeVisita[]
  manual: boolean
  motivo?: string | null
}

export function peajesPorVisita(destino: MantInSituDestino | undefined, pasos: MantInSituDestinoPeaje[], peajes: MantInSituPeaje[]): PeajesVisita {
  if (!destino) return { conocido: false, total: 0, detalle: [], manual: false }
  if (destino.codigo === CODIGO_BOGOTA_CALCULO) return { conocido: true, total: 0, detalle: [], manual: false }
  if (destino.peaje_manual_valor != null) {
    return { conocido: true, total: Math.round(Number(destino.peaje_manual_valor)), detalle: [], manual: true, motivo: destino.peaje_manual_motivo }
  }
  // Sin ruta registrada no se puede saber qué peajes pasa: no se asume gratis.
  if (destino.ida_km == null || destino.regreso_km == null) return { conocido: false, total: 0, detalle: [], manual: false }
  const porId = new Map(peajes.map(p => [p.id, p]))
  let conocido = true
  const detalle: PeajeVisita[] = []
  for (const paso of pasos.filter(p => p.destino_codigo === destino.codigo)) {
    const p = porId.get(paso.peaje_id)
    if (!p) { conocido = false; continue }
    detalle.push({ nombre: p.nombre, sentido: paso.sentido, precio: Math.round(Number(p.tarifa_categoria_i)) })
  }
  return { conocido, total: detalle.reduce((s, d) => s + d.precio, 0), detalle, manual: false }
}

// Reparte `total` en proporción a `pesos` con enteros que suman exactamente
// `total` (método del mayor residuo, desempate por orden).
export function repartir(total: number, pesos: number[]): number[] {
  const suma = pesos.reduce((s, p) => s + p, 0)
  if (!suma) return pesos.map(() => 0)
  const exactos = pesos.map(p => total * p / suma)
  const valores = exactos.map(Math.floor)
  const resto = total - valores.reduce((s, v) => s + v, 0)
  const orden = exactos.map((v, i) => ({ i, f: v - valores[i] })).sort((a, b) => b.f - a.f || a.i - b.i)
  for (let k = 0; k < resto; k++) valores[orden[k % orden.length].i]++
  return valores
}

export interface ItemCalculo { referencia: string, cantidad: number }

export interface FilaCalculo {
  referencia: string
  cantidad: number
  equipo: EquipoInSitu | undefined
  base: number            // precio × cantidad
  horas: number           // horas × cantidad
  transporte: number      // parte del desplazamiento
  total: number
  valido: boolean
}

export interface ResultadoCalculo {
  destino: MantInSituDestino | undefined
  filas: FilaCalculo[]
  base: number
  horas: number
  dias: number
  horasViaje: number          // por visita
  horasViajeTotal: number
  horasDisponibles: number    // por día, después del viaje
  kmVisita: number
  km: number
  vehiculo: number
  combustible: number
  peajes: number
  peaje: PeajesVisita
  extras: number
  total: number
  listo: boolean
  errores: string[]
  esBogota: boolean
}

export function calcular(
  items: ItemCalculo[],
  equipos: Map<string, EquipoInSitu>,
  destino: MantInSituDestino | undefined,
  config: MantInSituConfig,
  pasos: MantInSituDestinoPeaje[],
  peajes: MantInSituPeaje[],
): ResultadoCalculo {
  const margen = 1 + Number(config.margen_recorrido_pct) / 100
  const jornada = Number(config.jornada_horas)
  const esBogota = destino?.codigo === CODIGO_BOGOTA_CALCULO

  const filas: FilaCalculo[] = items.map(i => {
    const e = equipos.get(i.referencia)
    const precio = e?.precio ?? null
    return {
      referencia: i.referencia,
      cantidad: i.cantidad,
      equipo: e,
      base: precio != null && precio > 0 ? Math.round(precio * i.cantidad) : 0,
      horas: e?.horas ? e.horas * i.cantidad : 0,
      transporte: 0,
      total: 0,
      valido: !!e?.completo,
    }
  })

  const horas = filas.reduce((s, f) => s + f.horas, 0)
  const base = filas.reduce((s, f) => s + f.base, 0)
  const rutaConocida = esBogota || (!!destino && destino.ida_km != null && destino.ida_min != null && destino.regreso_km != null && destino.regreso_min != null)
  const horasViaje = esBogota || !rutaConocida || !destino ? 0 : (Number(destino.ida_min) + Number(destino.regreso_min)) / 60 * margen
  const kmVisita = esBogota || !rutaConocida || !destino ? 0 : (Number(destino.ida_km) + Number(destino.regreso_km)) * margen
  const horasDisponibles = jornada - horasViaje
  const dias = filas.length && horas > 0 && horasDisponibles > 0 ? Math.ceil(Math.max(0, horas - 1e-9) / horasDisponibles) : 0

  const peaje = peajesPorVisita(destino, pasos, peajes)
  const km = kmVisita * dias
  const vehiculo = Math.round(km * Number(config.costo_km))
  const combustible = Math.round(km / Number(config.rendimiento_km_galon) * Number(config.precio_galon))
  const totalPeajes = Math.round(peaje.total * dias)

  const errores: string[] = []
  if (!destino) errores.push('Selecciona la ciudad o municipio del servicio.')
  if (!filas.length) errores.push('Agrega al menos un equipo para calcular.')
  if (filas.some(f => !f.valido)) errores.push('Una referencia necesita código in situ, precio o tiempo válido. Solicita su revisión en Configuración.')
  if (destino && !rutaConocida) errores.push('La distancia de ida y regreso de este destino requiere revisión en Configuración.')
  if (destino && filas.length && horasDisponibles <= 0) errores.push('El desplazamiento ocupa toda la jornada configurada. Solicita revisión antes de usar el precio.')
  if (destino && filas.length && !peaje.conocido) errores.push('Falta validar los peajes de este destino en Configuración → Peajes por destino.')

  const extras = vehiculo + combustible + totalPeajes
  const partes = repartir(extras, filas.map(f => f.base))
  filas.forEach((f, i) => { f.transporte = partes[i]; f.total = f.base + partes[i] })

  return {
    destino, filas, base, horas, dias, horasViaje, horasViajeTotal: horasViaje * dias, horasDisponibles,
    kmVisita, km, vehiculo, combustible, peajes: totalPeajes, peaje, extras, total: base + extras,
    listo: errores.length === 0, errores, esBogota,
  }
}

// Reparto de las horas de mantenimiento por día (la última jornada lleva el resto).
export function organizacionPorDia(r: ResultadoCalculo, maxDias = 30): { dia: number, servicio: number, recorrido: number }[] {
  let restante = r.horas
  return Array.from({ length: Math.min(maxDias, r.dias) }, (_, i) => {
    const servicio = Math.min(restante, r.horasDisponibles)
    restante -= servicio
    return { dia: i + 1, servicio, recorrido: r.horasViaje }
  })
}
