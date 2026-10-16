// Cartagena es una excepción comercial exclusiva de la oficina Barranquilla.
export function destinoRegionalHabilitado(sedeId: string, destino: { codigo: string, ida_km: number | null }) {
  return (destino.ida_km != null && Number(destino.ida_km) <= 110) || (sedeId === 'barranquilla' && destino.codigo === '13001')
}
