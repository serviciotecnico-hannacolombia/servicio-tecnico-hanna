import { isHoliday } from '../../lib/colombiaCalendar'
import type { Tarea } from '../../types'

// Bogotá UTC-5. Las ventanas se construyen en UTC para que el horario del
// equipo del usuario no cambie las horas contabilizadas.
export function horasLaborales(inicio: string, fin: string): number | null {
  const desde=Date.parse(inicio),hasta=Date.parse(fin)
  if(!Number.isFinite(desde)||!Number.isFinite(hasta)||hasta<desde)return null
  const local=new Date(desde-5*3600000)
  let dia=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())
  let total=0
  while(dia+5*3600000<hasta){
    const d=new Date(dia),semana=d.getUTCDay()
    if(semana>=1&&semana<=5&&!isHoliday(new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()))){
      const apertura=dia+12.5*3600000,cierre=dia+(semana===5?21:22)*3600000
      total+=Math.max(0,Math.min(hasta,cierre)-Math.max(desde,apertura))
    }
    dia+=86400000
  }
  return total/3600000
}
export function tiempoTarea(t:Pick<Tarea,'created_at'|'estado'|'completado_at'>,ahora=new Date()):number|null {
  if(t.estado==='completada'&&!t.completado_at)return null
  return horasLaborales(t.created_at,t.estado==='completada'?t.completado_at!:ahora.toISOString())
}
