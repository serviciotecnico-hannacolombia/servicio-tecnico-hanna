export type Segmento='otst'|'in-situ'|'calibracion'|'pendiente'
export const SEGMENTOS:Record<Segmento,string>={otst:'OTST','in-situ':'In situ',calibracion:'Calibración',pendiente:'Sin clasificar'}
export const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()
export const claveRef=(s:string)=>normal(s).replace(/[\s.-]/g,'')
export const serieValida=(s:string)=>!!s.trim()&&!['NA','SIN SERIE','SIN SERIAL','NO APLICA','0','-'].includes(normal(s).replace(/[/.]/g,'').replace(/^N-A$/,'NA'))
export const nitClave=(s:string)=>s.replace(/[^0-9]/g,'')
export function fechaReporte(s:string){
 if(!s.trim())return ''
 const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)$/)
 const v=m?`${m[3]}-${m[2]}-${m[1]}${m[4]}`:s
 if(!/^\d{4}-\d{2}-\d{2}/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Fecha no válida en el reporte: '+s)
 return v
}
export interface FilaOTST {id:string;otst:string;anulada:boolean;cliente:string;nit:string;moroso:string;referencia:string;serial:string;descripcion:string;categoria:string;diagnostico:string;garantia:string;cotizacion:string;tecnico:string;fecha:string;regularizacion:string;fechaDiagnostico:string;aprobacion:string;revision:string;recepcion:string;despacho:string;anulacion:string;original:string[]}
export interface FacturaLinea {id:string;tipo:string;documento:string;fecha:string;nit:string;cliente:string;codigo:string;descripcion:string;cantidad:number;unitario:number;total:number;segmento:Segmento;servicio:string;zona:string;departamento:string;ciudad:string;original:string[]}
export function clasificarCodigo(codigo:string){
 const c=normal(codigo).replace(/\s/g,'')
 if(c.startsWith('RVCALIBR.'))return {segmento:'calibracion' as Segmento,servicio:'Calibración'}
 if(c==='70001.01')return {segmento:'otst' as Segmento,servicio:'Correctivo'}
 if(c==='70001.03')return {segmento:'otst' as Segmento,servicio:'Preventivo'}
 if(['70001.02','MANTIT.03','MANSAMPLER.03'].includes(c))return {segmento:'in-situ' as Segmento,servicio:'Preventivo'}
 const familias=['MANASAMPLER','MANFT','MANMINTI','MANMUL','MANPOI','MANTBL','MANTBL12X','MANTCHECKER','MANTCONTROL','MANTCT','MANTIRIS','MANTIT','MANTMC','MANTOD','MANTPCA','MANTR']
 const [base,sufijo]=c.split('.')
 if(familias.includes(base)&&['01','02'].includes(sufijo))return {segmento:(sufijo==='01'?'otst':'in-situ') as Segmento,servicio:'Preventivo'}
 return {segmento:'pendiente' as Segmento,servicio:'Pendiente de clasificar'}
}
export function dineroReporte(s:string){
 const limpio=s.replace(/[$\s]/g,'')
 if(!/^-?\d+(?:\.\d{3})*(?:,\d{1,2})?$/.test(limpio))throw Error('Importe no reconocido: '+s)
 const n=Number(limpio.replace(/\./g,'').replace(',','.'))
 if(!Number.isFinite(n))throw Error('Importe inválido')
 return n
}
export function leerOTST(rows:string[][]):FilaOTST[]{
 if(rows[0]?.[0]!=='OTST'||rows[0]?.length!==25)throw Error('Usa el Reporte General de Servicio Técnico de 25 columnas.')
 return rows.slice(1).filter(r=>r.some(Boolean)).map(r=>{
 if(r.length!==25||!/^\d+$/.test(r[0])||!['0','1'].includes(r[1]))throw Error('Fila OTST no válida.')
 return {id:JSON.stringify([r[0],claveRef(r[5]),normal(r[6]),nitClave(r[3])]),otst:r[0],anulada:r[1]==='1',cliente:r[2],nit:r[3],moroso:r[4],referencia:r[5],serial:r[6],descripcion:r[7],categoria:r[8],diagnostico:r[9],garantia:r[10],cotizacion:r[11],tecnico:r[14],fecha:fechaReporte(r[15]),regularizacion:fechaReporte(r[16]),fechaDiagnostico:fechaReporte(r[17]),aprobacion:fechaReporte(r[18]),revision:fechaReporte(r[19]),recepcion:fechaReporte(r[20]),despacho:fechaReporte(r[21]),anulacion:fechaReporte(r[22]),original:r}
 })
}
export function leerFacturacion(rows:string[][]):FacturaLinea[]{
 if(rows[0]?.length!==15||rows[0]?.[3]!=='Documento Tipo')throw Error('Usa el reporte de facturación de 15 columnas.')
 const ocurrencias=new Map<string,number>()
 return rows.slice(1).filter(r=>r.some(Boolean)).map(r=>{
 if(r.length!==15||!r[4])throw Error('Línea de facturación sin documento.')
 const identidad=JSON.stringify(r),n=(ocurrencias.get(identidad)??0)+1;ocurrencias.set(identidad,n)
 const cantidad=Number(r[12].replace(',','.'));if(!Number.isFinite(cantidad))throw Error('Cantidad inválida.')
 return {id:identidad+':'+n,tipo:r[3],documento:r[4],fecha:fechaReporte(r[5]),nit:r[6],cliente:r[7],codigo:r[10],descripcion:r[11],cantidad,unitario:dineroReporte(r[13]),total:dineroReporte(r[14]),...clasificarCodigo(r[10]),zona:r[0],departamento:r[1],ciudad:r[2],original:r}
 })
}
export function resumenFacturacion(filas:FacturaLinea[]){
 const validas=filas.filter(r=>(r.tipo==='FAV'&&r.total>=0)||(r.tipo==='NCRV'&&r.total<=0))
 const bruto=validas.filter(r=>r.tipo==='FAV').reduce((s,r)=>s+r.total,0)
 const creditos=validas.filter(r=>r.tipo==='NCRV').reduce((s,r)=>s+r.total,0)
 return {bruto,creditos,neto:bruto+creditos,excluidas:filas.length-validas.length,documentos:new Set(validas.map(r=>r.tipo+':'+r.documento)).size}
}
export function unicosOTST(filas:FilaOTST[]){return [...new Map(filas.map(r=>[JSON.stringify(r.original),r])).values()]}
export function combinarReportes<T>(anteriores:T[],nuevos:T[],grupo:(r:T)=>string){const grupos=new Set(nuevos.map(grupo));return [...anteriores.filter(r=>!grupos.has(grupo(r))),...nuevos]}
export interface RevisionOTST {papel?:string;servicios:string[];resultado:string;observacion:string;reingreso:string;historial:{fecha:string;usuario:string;detalle:string}[]}
export interface BaseOTST {otst:FilaOTST[];facturacion:FacturaLinea[];revisiones:Record<string,RevisionOTST>;fuentes:{nombre:string;fecha:string;filas:number;tipo?:'otst'|'facturacion'|'insitu';corte?:string}[]}
export const BASE_VACIA:BaseOTST={otst:[],facturacion:[],revisiones:{},fuentes:[]}

export function cumpleFiltrosOTST(r:Pick<FilaOTST,'anulada'|'garantia'>,estado:string,garantia:string){
 const estadoCoincide=estado==='anuladas'?r.anulada:estado==='no-anuladas'?!r.anulada:true
 const garantiaCoincide=garantia==='si'?r.garantia==='1':garantia==='no'?r.garantia==='0':garantia==='sin-dato'?!['0','1'].includes(r.garantia):true
 return estadoCoincide&&garantiaCoincide
}

export type PapelElemento='principal'|'componente'|'pendiente'
export function organizarElementos(filas:FilaOTST[],revisiones:Record<string,RevisionOTST>,codigos:ReadonlySet<string>){
 const grupos=new Map<string,FilaOTST[]>(),papeles=new Map<string,PapelElemento>()
 const grupo=(r:FilaOTST)=>JSON.stringify([r.otst,nitClave(r.nit)||normal(r.cliente)])
 for(const r of filas){
  const manual=revisiones[r.id]?.papel
  const papel:PapelElemento=manual==='Equipo principal'?'principal':['Componente recibido solo','Accesorio asociado'].includes(manual??'')?'componente':codigos.has(claveRef(r.referencia))?'principal':/\b(SONDA|ELECTRODO|SENSOR|ACCESORIO)S?\b/.test(normal(r.descripcion+' '+r.categoria))?'componente':'pendiente'
  papeles.set(r.id,papel)
  const k=grupo(r);grupos.set(k,[...(grupos.get(k)??[]),r])
 }
 const principales=new Set([...grupos].filter(([,v])=>v.some(r=>papeles.get(r.id)==='principal')).map(([k])=>k))
 return {papeles,relacionados:(r:FilaOTST)=>(grupos.get(grupo(r))??[]).filter(x=>x.id!==r.id),visible:(r:FilaOTST,vista:string)=>vista==='todos'?true:vista==='componentes'?papeles.get(r.id)==='componente':papeles.get(r.id)==='principal'||!principales.has(grupo(r))}
}

export function planificarReporte<T extends {original:string[]}>(anteriores:T[],entrantes:T[],grupo:(r:T)=>string){
 const agrupar=(filas:T[])=>{const m=new Map<string,T[]>();for(const r of filas){const k=grupo(r);const lista=m.get(k);if(lista)lista.push(r);else m.set(k,[r])}return m}
 const antes=agrupar(anteriores),despues=agrupar(entrantes),firma=(filas:T[])=>JSON.stringify(filas.map(r=>JSON.stringify(r.original)).sort())
 let nuevos=0,modificados=0,identicos=0
 const cambios:T[]=[]
 for(const [k,filas] of despues){const prev=antes.get(k);if(!prev){nuevos++;cambios.push(...filas)}else if(firma(prev)!==firma(filas)){modificados++;cambios.push(...filas)}else identicos++}
 return {nuevos,modificados,identicos,cambios}
}
