import type {Intervencion} from './intervenciones'

const enlaces = import.meta.env.DEV
  ? Object.values(import.meta.glob<Record<string, string>>('./enlacesInformes2025.json', { eager: true, import: 'default' }))[0] ?? {}
  : {}
export function EnlaceInforme({registro:r,prefijo=false}:{registro:Intervencion;prefijo?:boolean}) {
 const clave=[r.fecha.slice(0,4),r.referencia,r.serial,r.informe].map(v=>v.trim().toLowerCase()).join('|')
 const url=(enlaces as Record<string,string>)[clave]
 const texto=(prefijo?'Informe ':'')+(r.informe||'—')
 return url&&/^https?:\/\//i.test(url)?<a className="gm-enlace-informe" href={url} target="_blank" rel="noopener noreferrer" title="Abrir informe original en una pestaña nueva">{texto}</a>:<>{texto}</>
}
