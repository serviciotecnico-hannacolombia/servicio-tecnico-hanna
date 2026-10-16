import ruta from '../../../supabase/data/ruta-barranquilla-cartagena.json'
import type { DestinoRegional, PeajeRegional } from './datos'
import type { MantInSituDestinoPeaje } from '../../types'

interface RutasConsulta {
  destinos: DestinoRegional[]
  peajes: PeajeRegional[]
  pasos: MantInSituDestinoPeaje[]
}

// Solo se usa en la consulta: Configuración sigue mostrando los registros persistidos.
// Si la BD ya tiene Cartagena, conserva su estado y sus ajustes administrativos.
export function completarCartagena(sedeId: string, datos: RutasConsulta): RutasConsulta {
  if (sedeId !== ruta.sede_id || datos.destinos.some(d => d.codigo === ruta.codigo)) return datos
  const destino: DestinoRegional = {
    sede_id: ruta.sede_id, codigo: ruta.codigo, departamento: ruta.departamento, municipio: ruta.municipio,
    lat: ruta.lat, lng: ruta.lng, ida_km: ruta.ida.km, ida_min: ruta.ida.min,
    regreso_km: ruta.regreso.km, regreso_min: ruta.regreso.min, consultado_at: ruta.consultado_at,
    peaje_manual_valor: null, peaje_manual_motivo: null, revision_peajes: null,
    activo: true, peajes_confirmados: false, peajes_ruta_verificados: true, revision_ruta: {pendientes: []},
  }
  // IDs exclusivos para no cambiar tarifas de otras rutas ni duplicar cobros.
  const idPeaje = (nombre: string) => 'cartagena-respaldo:' + nombre
  const peajes: PeajeRegional[] = ruta.peajes.map(p => ({
    ...p, id: idPeaje(p.nombre), fuente: ruta.fuente_tarifas,
    fuente_revision: p.nombre === 'PAPIROS' ? ruta.fuente_papiros : ruta.fuente_tarifas,
    lat: null, lng: null, sector: 'Barranquilla–Cartagena', sentido: 'Ambos sentidos',
    actualizado: ruta.consultado_at.slice(0, 10),
  }))
  const pasos = (['ida', 'regreso'] as const).flatMap(sentido => ruta[sentido].pasos.map(nombre => ({
    destino_codigo: ruta.codigo, peaje_id: idPeaje(nombre), sentido, revision_requerida: false,
  })))
  return {destinos: [...datos.destinos, destino], peajes: [...datos.peajes, ...peajes], pasos: [...datos.pasos, ...pasos]}
}
