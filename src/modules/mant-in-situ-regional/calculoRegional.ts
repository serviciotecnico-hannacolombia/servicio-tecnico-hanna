import { calcular, repartir, redondearMiles, type ItemCalculo } from '../mant-in-situ/calculo'
import type { EquipoInSitu } from '../mant-in-situ/hooks/useMantInSitu'
import type { MantInSituConfig, MantInSituDestino, MantInSituDestinoPeaje, MantInSituPeaje } from '../../types'

export interface ConfigRegional extends MantInSituConfig {
  recargo_km_adicional: number
  recargo_solo_ida: boolean
}
export function calcularRegional(items: ItemCalculo[], equipos: Map<string, EquipoInSitu>, destino: MantInSituDestino | undefined,
  config: ConfigRegional, pasos: MantInSituDestinoPeaje[], peajes: MantInSituPeaje[], ciudadBase: string) {
  const r = calcular(items,equipos,destino,config,pasos,peajes,ciudadBase)
  const kmAdicionalesVisita = !destino || destino.codigo === ciudadBase ? 0
    : Math.max(0,Number(destino.ida_km)-60) + (config.recargo_solo_ida ? 0 : Math.max(0,Number(destino.regreso_km)-60))
  const kmAdicionales = kmAdicionalesVisita*r.dias
  const recargo = Math.round(kmAdicionales*Number(config.recargo_km_adicional))
  const partes = repartir(recargo,r.filas.map(f=>f.base))
  r.filas.forEach((f,i)=>{
    f.transporte+=partes[i]
    f.total+=partes[i]
    f.unitarioRedondeado=redondearMiles(f.total/f.cantidad)
    f.totalRedondeado=f.unitarioRedondeado*f.cantidad
  })
  return {...r,extras:r.extras+recargo,total:r.total+recargo,
    totalRedondeado:r.filas.reduce((s,f)=>s+f.totalRedondeado,0),recargo,kmAdicionales,kmAdicionalesVisita}
}
