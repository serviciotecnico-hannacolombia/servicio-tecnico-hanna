const PASTELES=['#9cbadd','#d4ade0','#9ccfba','#eab69f','#dccb96','#a6cfdf','#e2adc0','#b9c99a','#b7ade0','#e3c08f','#9bc9cb','#cdafc1','#c1d5a6','#e7ada3','#a9bde0','#d7c4e5']
const rotar=(n:number)=>[...PASTELES.slice(n),...PASTELES.slice(0,n)]
export const TEMAS_GRAFICOS={
 preventivo:{nombre:'Preventivos',color:'#4e6b93',paleta:rotar(0)},
 correctivo:{nombre:'Correctivos',color:'#9f6553',paleta:rotar(3)},
 atencion:{nombre:'Atención',color:'#457d78',paleta:rotar(2)},
 comercial:{nombre:'Comercial',color:'#7d639f',paleta:rotar(1)},
} as const
export type TemaGrafico=keyof typeof TEMAS_GRAFICOS
export function colorCategoria(nombre:string,tema:TemaGrafico) {
 const clave=nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
 const estados:Record<string,string>={'pendiente de cotizacion':'#edca8b','cotizada':'#9cbadd','en seguimiento':'#c1afe0','ganada':'#9bc7a7','perdida':'#e6a1a1','pendiente de cotizar':'#c2cbd8','cotizada · esperando cliente':'#e3c08f','aprobada por el cliente':'#9ccfba','rechazada por el cliente':'#e7ada3','programada':'#9cbadd','realizada':'#9bc9cb','cancelada':'#c9bed3','cotizacion aprobada':'#9bc7a7','rechazada':'#e6a1a1'}
 if(tema==='comercial'&&estados[clave])return estados[clave]
 if(clave.startsWith('sin '))return '#d9c49a'
 let hash=0;for(const c of clave)hash=(hash*31+c.charCodeAt(0))>>>0
 const paleta=TEMAS_GRAFICOS[tema].paleta
 return paleta[hash%paleta.length]
}
export function datosGrafico(datos:{nombre:string;cantidad:number}[],limite:number) {
 const total=datos.reduce((n,d)=>n+d.cantidad,0)
 return {total,visibles:datos.slice(0,limite).map(d=>({...d,porcentaje:total?Math.round(d.cantidad/total*1000)/10:0}))}
}

function pastelExtra(indice:number) {
 const h=(indice*137.508)%360,s=(42+indice%3*6)/100,l=(73+indice%4*3)/100
 const a=s*Math.min(l,1-l),f=(n:number)=>{const k=(n+h/30)%12;return Math.round((l-a*Math.max(-1,Math.min(k-3,9-k,1)))*255).toString(16).padStart(2,'0')}
 return '#'+f(0)+f(8)+f(4)
}
export function coloresCategorias(nombres:string[],tema:TemaGrafico) {
 const normalizar=(n:string)=>n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
 const unicos=[...new Map(nombres.map(n=>[normalizar(n),n])).entries()].sort(([a],[b])=>a.localeCompare(b,'es'))
 const disponibles=[...new Set([...TEMAS_GRAFICOS[tema].paleta,...Array.from({length:Math.max(nombres.length*2,48)},(_,i)=>pastelExtra(i))])]
 const usados=new Set<string>(),asignados=new Map<string,string>()
 for(const [clave,nombre] of unicos){const preferido=colorCategoria(nombre,tema);const color=!usados.has(preferido)?preferido:disponibles.find(c=>!usados.has(c))!;usados.add(color);asignados.set(clave,color)}
 return new Map(nombres.map(n=>[n,asignados.get(normalizar(n))!]))
}
export function matizColor(hex:string,blanco:number) {
 return '#'+[1,3,5].map(i=>{const valor=parseInt(hex.slice(i,i+2),16);return Math.round(blanco>=0?valor+(255-valor)*blanco:valor*(1+blanco)).toString(16).padStart(2,'0')}).join('')
}

export function datosCirculares(datos:{nombre:string;cantidad:number}[]) {
 const positivos=datos.filter(d=>d.cantidad>0).map(d=>({...d,integrantes:[d.nombre]}))
 if(positivos.length<=7)return positivos
 const orden=[...positivos].sort((a,b)=>b.cantidad-a.cantidad||a.nombre.localeCompare(b.nombre,'es'))
 const resto=orden.slice(6)
 return [...orden.slice(0,6),{nombre:`Otras ${resto.length} categorías`,cantidad:resto.reduce((n,d)=>n+d.cantidad,0),integrantes:resto.map(d=>d.nombre)}]
}
