import type {SolicitudMantenimiento} from './modelo'
const PREFIJO='[POZO-5-V1] '
export function notaImprevisto(valor:number,fecha:string,motivo:string) {
 if(!Number.isSafeInteger(valor)||valor<=0)throw Error('Ingresa un valor positivo en pesos enteros.')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)||!Number.isFinite(Date.parse(fecha))||new Date(fecha).toISOString().slice(0,10)!==fecha)throw Error('Fecha no válida.')
 if(!motivo.trim()||motivo.trim().length>500)throw Error('Escribe el motivo del imprevisto (máximo 500 caracteres).')
 return PREFIJO+JSON.stringify({valor,fecha,motivo:motivo.trim()})
}
export function leerImprevisto(nota:string) {
 if(!nota.startsWith(PREFIJO))return null
 try{const v=JSON.parse(nota.slice(PREFIJO.length));notaImprevisto(v.valor,v.fecha,v.motivo);return v as {valor:number;fecha:string;motivo:string}}catch{throw Error('Hay un movimiento del pozo inválido. Revisa el historial antes de consultar el saldo.')}
}
export function resumirPozo(registros:SolicitudMantenimiento[],ano?:string) {
 const reales=[...new Map(registros.filter(r=>!r.es_prueba).map(r=>[r.id,r])).values()]
 const aportantes=reales.filter(r=>(!ano||r.created_at.startsWith(ano))&&['aprobada','programada','realizada'].includes(r.estado))
 const aportes=aportantes.reduce((s,r)=>s+r.calculo.margen,0)
 const movimientos=reales.flatMap(r=>r.historial.flatMap((h,i)=>{const gasto=leerImprevisto(h.nota);return gasto?[{...gasto,id:r.id+':'+i,solicitud:r.id,cliente:r.cliente,cotizacion:r.cotizacion,usuario:h.usuario,registrado:h.fecha}]:[]})).filter(m=>!ano||m.fecha.startsWith(ano)).sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.registrado.localeCompare(a.registrado))
 const gastos=movimientos.reduce((s,m)=>s+m.valor,0)
 return {aportes,gastos,saldo:aportes-gastos,movimientos,aportantes}
}

export function textoSeguimientoPozo(nota:string) {
 try{const m=leerImprevisto(nota);return m?`Imprevisto del pozo 5 %: $ ${m.valor.toLocaleString('es-CO')} COP · ${m.fecha} · ${m.motivo}`:nota}catch{return nota}
}
