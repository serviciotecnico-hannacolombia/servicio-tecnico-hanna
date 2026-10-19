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
  const [cliente,setCliente]=useState(''),[origen,setOrigen]=useState(''),[destino,setDestino]=useState(''),[cotizacion,setCotizacion]=useState(''),[nota,setNota]=useState('')
  const [saving,setSaving]=useState(false),[guardada,setGuardada]=useState('')
  async function enviar(e:React.FormEvent) {
    e.preventDefault();if(!snapshot||saving)return
    setSaving(true)
    try {
      const r=await guardar({cliente,origen,destino,cotizacion,nota,calculo:snapshot})
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
        <label>Inicio / origen del viaje <span className="regional-required">*</span><input style={INP} required maxLength={300} placeholder="Ciudad y punto de salida" value={origen} onChange={e=>setOrigen(e.target.value)}/></label>
        <label>Destino final <span className="regional-required">*</span><input style={INP} required maxLength={300} placeholder="Ciudad y dirección o sede del cliente" value={destino} onChange={e=>setDestino(e.target.value)}/></label>
        <label>Número de cotización (opcional al crear)<input style={INP} maxLength={100} value={cotizacion} onChange={e=>setCotizacion(e.target.value)}/></label>
        <p className="regional-note">Sin número queda pendiente de cotizar. Puedes asociarlo después desde Gestión de mantenimientos.</p>
        <label>Observaciones<textarea style={INP} maxLength={2000} rows={3} value={nota} onChange={e=>setNota(e.target.value)}/></label>
        <Button type="submit" disabled={saving}>{saving?'Guardando…':'Guardar y crear seguimiento'}</Button>
      </form>
    </Modal>
  </div>
}
