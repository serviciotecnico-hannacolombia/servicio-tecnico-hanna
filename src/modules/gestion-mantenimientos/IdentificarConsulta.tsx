import {VISTA_PREVIA_LOCAL} from './almacenamiento'
import {Button} from '../../components/ui/Button'
import {INP} from '../mant-in-situ/ui'
import type {useConsultaRegistrada} from './useConsultaRegistrada'
export function IdentificarConsulta({registro,mensaje}:{registro:ReturnType<typeof useConsultaRegistrada>,mensaje?:string}) {
 return <div className="gestion-identificar"><h3>Datos del cliente</h3><p>Para obtener el valor, ingresa únicamente la razón social. La ciudad y el departamento se toman del cotizador. La consulta quedará registrada con tu usuario.</p>
 {VISTA_PREVIA_LOCAL&&<p>Vista previa: el registro se guarda solo en este navegador.</p>}
 <label>Razón social <span className="regional-required">*</span><input style={INP} required maxLength={200} value={registro.razon} onChange={e=>registro.setRazon(e.target.value)}/></label>
 <Button disabled={!registro.disponible||registro.saving||registro.visible||registro.razon.trim().length<2} onClick={registro.consultar}>{registro.saving?'Registrando consulta…':registro.visible?'Consulta registrada':'Consultar valor'}</Button>
 {!registro.disponible&&<p role="status">{mensaje||'Completa destino y equipos para consultar.'}</p>}{registro.error&&<p role="alert">{registro.error}</p>}</div>
}
