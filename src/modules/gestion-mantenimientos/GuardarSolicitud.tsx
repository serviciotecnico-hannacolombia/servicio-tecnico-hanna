import {SelectorCiudad} from './SelectorCiudad'
import {useCiudadesGuardadas} from './useCiudadesGuardadas'
import {textoUbicacion} from './ciudades'
import {useState} from 'react'
import {Link} from 'react-router-dom'
import {Save} from 'lucide-react'
import {toast} from 'sonner'
import {Modal} from '../../components/ui/Modal'
import {Button} from '../../components/ui/Button'
import {INP} from '../mant-in-situ/ui'
import {fmtCOP} from '../mant-in-situ/hooks/useMantInSitu'
import {useGestionMantenimientos} from './useGestionMantenimientos'
import {VISTA_PREVIA_LOCAL,AVISO_GESTION_LOCAL} from './almacenamiento'
import type {CalculoGuardado} from './modelo'
export function GuardarSolicitud({calculo}:{calculo:CalculoGuardado|null}) {
  const {autorizado,guardar}=useGestionMantenimientos()
  const [snapshot,setSnapshot]=useState<CalculoGuardado|null>(null)
  const [cliente,setCliente]=useState(''),[codigoOrigen,setCodigoOrigen]=useState(''),[codigoDestino,setCodigoDestino]=useState(''),[cotizacion,setCotizacion]=useState(''),[nota,setNota]=useState('')
  const [detalleOrigen,setDetalleOrigen]=useState(''),[detalleDestino,setDetalleDestino]=useState('')
  const catalogo=useCiudadesGuardadas(autorizado&&!!snapshot)
  const ciudades=catalogo.data?.ciudades??[]
  const ciudadOrigen=ciudades.find(c=>c.codigo===codigoOrigen),ciudadDestino=ciudades.find(c=>c.codigo===codigoDestino)
  const [saving,setSaving]=useState(false),[guardada,setGuardada]=useState('')
  async function enviar(e:React.FormEvent) {
    e.preventDefault();if(!snapshot||saving)return
    if(!ciudadOrigen||!ciudadDestino){toast.error('Selecciona la ciudad de origen y la ciudad de destino.');return}
    setSaving(true)
    try {
      const origen=textoUbicacion(ciudadOrigen,detalleOrigen),destino=textoUbicacion(ciudadDestino,detalleDestino)
      const r=await guardar({cliente,origen,destino,cotizacion,nota,calculo:{...snapshot,ubicaciones:{origen:{...ciudadOrigen,detalle:detalleOrigen.trim()},destino:{...ciudadDestino,detalle:detalleDestino.trim()}}}})
      setGuardada(r.id);setSnapshot(null);toast.success(VISTA_PREVIA_LOCAL?'Solicitud guardada en la vista previa local':'Solicitud guardada')
    } catch(e) {toast.error(e instanceof Error?e.message:'No se pudo guardar')} finally {setSaving(false)}
  }
  if(!autorizado)return null
  return <div className="gestion-save">
    <Button disabled={!calculo||saving} onClick={()=>{if(calculo)setSnapshot(structuredClone(calculo))}}><Save size={16}/> Guardar solicitud</Button>
    <Link to="/gestion-mantenimientos">Gestión de mantenimientos →</Link>
    {guardada&&<p role="status">Solicitud guardada. <Link to={'/gestion-mantenimientos?solicitud='+guardada}>Ver seguimiento</Link></p>}
    <Modal open={!!snapshot} onClose={()=>{if(!saving)setSnapshot(null)}} title="Guardar solicitud de mantenimiento" width={620}>
      <form onSubmit={enviar} className="gestion-form">
        {VISTA_PREVIA_LOCAL&&<p className="gestion-preview">{AVISO_GESTION_LOCAL}</p>}
        <p>Total con margen del 5 %: <strong>{fmtCOP(snapshot?.total)}</strong></p>
        <label>Cliente <span className="regional-required">*</span><input style={INP} required maxLength={200} value={cliente} onChange={e=>setCliente(e.target.value)}/></label>
        {catalogo.isFetching&&<p role="status" className="regional-note">Actualizando el catálogo de ciudades guardadas…</p>}
        {catalogo.data?.aviso&&<p role="status" className="regional-note">{catalogo.data.aviso}</p>}
        <SelectorCiudad titulo="Origen del viaje" ciudades={ciudades} codigo={codigoOrigen} onChange={setCodigoOrigen} detalle={detalleOrigen} onDetalle={setDetalleOrigen}/>
        <SelectorCiudad titulo="Destino final" ciudades={ciudades} codigo={codigoDestino} onChange={setCodigoDestino} detalle={detalleDestino} onDetalle={setDetalleDestino}/>
        <label>Número de cotización (opcional al crear)<input style={INP} maxLength={100} value={cotizacion} onChange={e=>setCotizacion(e.target.value)}/></label>
        <p className="regional-note">Sin número queda pendiente de cotizar. Puedes asociarlo después desde Gestión de mantenimientos.</p>
        <label>Observaciones<textarea style={INP} maxLength={2000} rows={3} value={nota} onChange={e=>setNota(e.target.value)}/></label>
        <Button type="submit" disabled={saving||!ciudadOrigen||!ciudadDestino}>{saving?'Guardando…':'Guardar y crear seguimiento'}</Button>
      </form>
    </Modal>
  </div>
}
