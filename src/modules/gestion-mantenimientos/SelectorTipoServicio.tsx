import {Link} from 'react-router-dom'
import {rutaGestion,type TipoRuta} from './rutasGestion'
export function SelectorTipoServicio({tipo,reporte}:{tipo:TipoRuta;reporte:'visitas'|'estadisticas'}) {
 return <nav className="gestion-tipos-servicio" aria-label="Tipo de servicio">{([['preventivo','Preventivo'],['correctivo','Correctivo'],['atencion','Atención']] as const).map(([k,label])=><Link key={k} to={rutaGestion('reportes',reporte,k)} aria-current={tipo===k?'page':undefined}>{label}</Link>)}</nav>
}
