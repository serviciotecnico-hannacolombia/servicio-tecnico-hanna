export function esRolServicioTecnico(nombre: string | null | undefined) {
  return nombre?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase() === 'servicio tecnico'
}
export interface ItemPersonalizado {
  referencia: string
  nombre: string
  codigo: string
  precio: string
  cantidad: string
}
export function resumirPersonalizado(items: ItemPersonalizado[]) {
  const valido = items.length > 0 && items.every(i => i.precio.trim() !== '' && Number.isFinite(Number(i.precio)) && Number(i.precio) > 0 && Number.isSafeInteger(Number(i.cantidad)) && Number(i.cantidad) > 0)
  const total = valido ? items.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0) : null
  return {valido: valido && total != null && Number.isFinite(total), total: total != null && Number.isFinite(total) ? total : null}
}

export interface TransportePersonalizado {
  viaje: 'terrestre' | 'aereo' | ''
  tiqueteIda: string
  tiqueteRegreso: string
  carroHanna: 'si' | 'no' | ''
  kilometros: string
  peajes: string
  gastosTerrestres: string
}
interface TarifasVehiculo { costo_km: number, rendimiento_km_galon: number, precio_galon: number }
export function calcularTransportePersonalizado(t: TransportePersonalizado, config: TarifasVehiculo) {
  const importe = (v: string, positivo = false) => v.trim() !== '' && Number.isFinite(Number(v)) && (positivo ? Number(v) > 0 : Number(v) >= 0)
  const pendientes: string[] = []
  if (!t.viaje) pendientes.push('Selecciona el transporte principal.')
  const aereo = t.viaje === 'aereo'
  if (aereo && (!importe(t.tiqueteIda, true) || !importe(t.tiqueteRegreso, true))) pendientes.push('Ingresa el precio de los tiquetes de ida y vuelta.')
  const terrestre = t.viaje === 'terrestre'
  if (aereo && !t.carroHanna) pendientes.push('Indica si usarás carro de HANNA.')
  const carro = terrestre || (aereo && t.carroHanna === 'si')
  if (aereo && t.carroHanna === 'no' && !importe(t.gastosTerrestres)) pendientes.push('Ingresa los gastos de desplazamiento terrestre; escribe 0 si no aplican.')
  if (carro && (!importe(t.kilometros) || !importe(t.peajes))) pendientes.push(terrestre ? 'Ingresa los kilómetros de ida y el valor total de peajes; solo los kilómetros se multiplican por 2.' : 'Ingresa los kilómetros totales y los peajes; escribe 0 si no aplican.')
  const tarifasValidas = Number.isFinite(Number(config.costo_km)) && Number(config.costo_km) >= 0 && Number.isFinite(Number(config.rendimiento_km_galon)) && Number(config.rendimiento_km_galon) > 0 && Number.isFinite(Number(config.precio_galon)) && Number(config.precio_galon) >= 0
  if (carro && !tarifasValidas) pendientes.push('Revisa las tarifas del vehículo y combustible en Configuración.')
  const tiquetes = aereo && importe(t.tiqueteIda, true) && importe(t.tiqueteRegreso, true) ? Math.round(Number(t.tiqueteIda) + Number(t.tiqueteRegreso)) : 0
  const factorRecorrido = terrestre ? 2 : 1
  const km = carro && importe(t.kilometros) ? Number(t.kilometros) * factorRecorrido : 0
  const devaluacion = carro && tarifasValidas ? Math.round(km * Number(config.costo_km)) : 0
  const gasolina = carro && tarifasValidas ? Math.round(km / Number(config.rendimiento_km_galon) * Number(config.precio_galon)) : 0
  const peajes = carro && importe(t.peajes) ? Math.round(Number(t.peajes)) : 0
  const gastosTerrestres = aereo && t.carroHanna === 'no' && importe(t.gastosTerrestres) ? Math.round(Number(t.gastosTerrestres)) : 0
  const total = tiquetes + devaluacion + gasolina + peajes + gastosTerrestres
  if (!Number.isFinite(total)) pendientes.push('Los valores ingresados exceden el rango de cálculo.')
  return {listo: pendientes.length === 0, pendientes, factorRecorrido, km, tiquetes, devaluacion, gasolina, peajes, gastosTerrestres, total: pendientes.length ? null : total}
}

export interface EstadiaPersonalizada {
  hospedaje: 'si' | 'no' | ''
  noches: string
  valorNoche: string
  dias: string
}
export const ALIMENTACION_DIARIA = 60000
export function diasSugeridosPersonalizado(hospedaje: string, noches: string) {
  const n = Number(noches)
  return hospedaje === 'si' && noches.trim() !== '' && Number.isSafeInteger(n) && n > 0 && n < Number.MAX_SAFE_INTEGER ? n + 1 : 1
}
export function calcularEstadiaPersonalizada(e: EstadiaPersonalizada) {
  const pendientes: string[] = []
  if (!e.hospedaje) pendientes.push('Indica si se requiere hospedaje.')
  const nochesValidas = e.noches.trim() !== '' && Number.isSafeInteger(Number(e.noches)) && Number(e.noches) > 0
  const tarifaValida = e.valorNoche.trim() !== '' && Number.isFinite(Number(e.valorNoche)) && Number(e.valorNoche) > 0
  if (e.hospedaje === 'si' && (!nochesValidas || !tarifaValida)) pendientes.push('Ingresa las noches y un valor por noche mayor que cero.')
  const diasValidos = e.dias.trim() !== '' && Number.isSafeInteger(Number(e.dias)) && Number(e.dias) > 0
  if (!diasValidos) pendientes.push('Ingresa un número entero de días mayor que cero para la alimentación.')
  const hospedaje = e.hospedaje === 'si' && nochesValidas && tarifaValida ? Math.round(Number(e.noches) * Number(e.valorNoche)) : 0
  const alimentacion = diasValidos ? Number(e.dias) * ALIMENTACION_DIARIA : 0
  const total = hospedaje + alimentacion
  if (!Number.isSafeInteger(total)) pendientes.push('Los valores ingresados exceden el rango de cálculo.')
  return {listo: pendientes.length === 0, pendientes, hospedaje, alimentacion, total: pendientes.length ? null : total}
}

export const HORAS_HOMBRE_DIARIAS = 300000
export function calcularOtrosPersonalizado(dias: string) {
  const n = Number(dias)
  const total = n * HORAS_HOMBRE_DIARIAS
  return dias.trim() !== '' && Number.isSafeInteger(n) && n > 0 && Number.isSafeInteger(total) ? total : null
}

export const MARGEN_ERROR_PCT = 5
export function calcularMargenPersonalizado(valor: number | null) {
  if (valor == null || !Number.isFinite(valor) || valor <= 0 || !Number.isSafeInteger(Math.round(valor))) return {subtotal:null,margen:null,total:null}
  const subtotal = Math.round(valor)
  const margen = Math.round(subtotal * MARGEN_ERROR_PCT / 100)
  const total = subtotal + margen
  return Number.isSafeInteger(total) ? {subtotal,margen,total} : {subtotal:null,margen:null,total:null}
}
