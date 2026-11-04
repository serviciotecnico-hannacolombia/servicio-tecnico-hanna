import * as XLSX from 'xlsx'
import {validarIntervencion,type Intervencion} from './intervenciones'
export function leerFechaExcel(v:unknown,date1904=false):string {
 if(typeof v==='number') {const d=XLSX.SSF.parse_date_code(v,{date1904});return d?`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`:''}
 const s=String(v??'').trim()
 if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10)
 const m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
 return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:''
}
export async function leerIntervenciones(file:File) {
 if(file.size>15*1024*1024)throw Error('El archivo supera 15 MB. Divide la carga por años.')
 const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false})
 const registros:Intervencion[]=[],errores:string[]=[]
 let vacias=0
 for(const hoja of wb.SheetNames) {
  const rows=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[hoja],{header:1,defval:'',raw:true})
  const headers=(rows[0]??[]).map(v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase())
  if(!headers.includes('REFERENCIA')) {errores.push(`${hoja}: falta la columna REFERENCIA.`);continue}
  for(let i=1;i<rows.length;i++) {
   const row=rows[i],get=(h:string)=>String(row[headers.indexOf(h)]??'').trim()
   if(!get('REFERENCIA')) {vacias++;continue}
   const periodo=Number(get('DIAS'))
   const r:Intervencion={id:crypto.randomUUID(),referencia:get('REFERENCIA'),serial:get('SN'),cliente:get('RAZON SOCIAL'),nit:get('NIT'),asesor:get('ASESOR'),contacto:get('CONTACTO'),telefono:get('TELEFONO'),fecha:leerFechaExcel(row[headers.indexOf('FECHA')],!!wb.Workbook?.WBProps?.date1904),departamento:get('DEPARTAMENTO'),ciudad:get('CIUDAD'),ubicacion:get('UBICACION'),documento:get('FV O RMV'),periodicidad:Number.isInteger(periodo)&&periodo>0&&periodo<=3650?periodo:null,informe:get('INFORME'),observaciones:get('OBSERVACIONES'),zona:hoja,tipo:'preventivo',historial:[],revision:1}
   if(!r.periodicidad&&get('DIAS'))r.observaciones=[r.observaciones,`Periodicidad original: ${get('DIAS')}`].filter(Boolean).join(' · ')
   try {validarIntervencion(r);registros.push(r)}catch(e){errores.push(`${hoja}, fila ${i+1}: ${(e as Error).message}`)}
  }
 }
 if(registros.length>10000)throw Error('El archivo contiene más de 10000 registros. Divide la carga por años.')
 const hojas=wb.SheetNames.map(nombre=>({nombre,registros:registros.filter(r=>r.zona===nombre).length,errores:errores.filter(e=>e.startsWith(nombre+':')||e.startsWith(nombre+', fila ')).length}))
 return {registros,errores,vacias,archivo:file.name,hojas}
}
