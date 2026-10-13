import { SelectorBuscable } from './SelectorBuscable'
import { useState } from 'react'
import { Plus, Trash2, Copy, MapPinned, Search, CalendarDays, Settings, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { useUser } from '../../hooks/useUser'
import { type ItemCalculo } from '../mant-in-situ/calculo'
import { calcularRegional } from './calculoRegional'
import { fmtCOP, fmtHoras, fmtMinutos } from '../mant-in-situ/hooks/useMantInSitu'
import { FG, INP } from '../mant-in-situ/ui'
import { useSedesRegionales, useRegional, type SedeRegional } from './datos'
import { ConfiguracionRegional } from './ConfiguracionRegional'
import './regional.css'
import { Link } from 'react-router-dom'

export function RegionalPage() {
  const { data: sedes = [], isLoading, error } = useSedesRegionales()
  const [sedeId, setSedeId] = useState('')
  const sede = sedes.find(s => s.id === sedeId) ?? sedes[0]
  const { hasCapability } = useUser()
  const [configurar, setConfigurar] = useState(false)
  return <div className="regional-page">
    <Header title={`Mant. In Situ — ${sede?.nombre ?? 'Regional'}`} subtitle="Servicio desde la oficina regional — hasta 110 km por carretera, sin vuelos"
      actions={<div className="regional-header-actions"><Link className="regional-link" to="/mant-in-situ">Mant. In Situ Bogotá</Link><nav className="regional-tabs" aria-label="Vista regional"><button aria-pressed={!configurar} onClick={()=>setConfigurar(false)}>Consulta</button>{hasCapability('mant_in_situ_regional_editar') && <button aria-pressed={configurar} onClick={()=>setConfigurar(true)}><Settings size={14} /> Configuración</button>}</nav></div>} />
    {isLoading ? <Spinner /> : error ? <Card style={{overflow: 'visible'}}>No se pudo cargar la información regional. Verifica las migraciones y vuelve a intentar.</Card>
      : !sede ? <Card style={{overflow: 'visible'}}>No hay sedes regionales configuradas.</Card> : <>
        <Card style={{overflow: 'visible'}}><FG label="Oficina de origen"><SelectorBuscable style={INP} value={sede.id} onChange={e => setSedeId(e.target.value)}>
          {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </SelectorBuscable></FG>
      <p style={{ marginTop: 10, color: 'var(--muted)', fontSize: 13 }}><MapPinned size={14} /> {sede.direccion}</p>
        </Card>
        <div style={{ marginTop: 16 }}>
          {configurar && hasCapability('mant_in_situ_regional_editar')
            ? <ConfiguracionRegional key={sede.id} sede={sede} />
            : <ConsultaRegional key={sede.id} sede={sede} />}
        </div>
      </>}
  </div>
}

function ConsultaRegional({ sede }: { sede: SedeRegional }) {
  const { data, isLoading, error } = useRegional(sede)
  const [departamento, setDepartamento] = useState('')
  const [codigoDestino, setCodigoDestino] = useState(sede.codigo)
  const [buscar, setBuscar] = useState('')
  const [items, setItems] = useState<ItemCalculo[]>([])
  if (isLoading) return <Spinner />
  if (error || !data) return <Card style={{overflow: 'visible'}}>No se pudo cargar la configuración de {sede.nombre}.</Card>
  const destinos = data.destinos.filter(d => d.activo)
  const departamentos = [...new Set(destinos.map(d => d.departamento))].sort()
  const destino = destinos.find(d => d.codigo === codigoDestino)
  const porReferencia = new Map(data.equipos.map(e => [e.referencia, e]))
  const resultado = calcularRegional(items, porReferencia, destino ? {...destino,peaje_manual_valor:destino.peajes_confirmados?destino.peaje_manual_valor:null}:undefined,
    data.config, data.pasos, data.peajes, sede.codigo)
  const hoy = new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'})
  const peajesCaducados = data.peajes.filter(p=>p.vigencia_hasta && p.vigencia_hasta<hoy &&
    data.pasos.some(s=>s.destino_codigo===codigoDestino && s.peaje_id===p.nombre))
  const pendientePeajes = destino && destino.codigo !== sede.codigo && !destino.peajes_confirmados &&
    (!destino.peajes_ruta_verificados || peajesCaducados.length>0)
  const valido = resultado.listo && !pendientePeajes
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const sugerencias = buscar.trim().length >= 2 ? data.equipos.filter(e => norm(`${e.referencia} ${e.nombre}`).includes(norm(buscar))).slice(0, 8) : []

  function agregar(referencia: string) {
    setItems(prev => prev.some(i => i.referencia === referencia)
      ? prev.map(i => i.referencia === referencia ? { ...i, cantidad: i.cantidad + 1 } : i)
      : [...prev, { referencia, cantidad: 1 }])
    setBuscar('')
  }
  async function copiar() {
    if (!valido || !destino) return
    try {
      await navigator.clipboard.writeText([
        `Mantenimiento in situ regional — HANNA ${sede.nombre}`,
        `Destino: ${destino.municipio}, ${destino.departamento}`,
        ...resultado.filas.map(f => `${f.referencia} × ${f.cantidad}: ${fmtCOP(f.unitarioRedondeado)} c/u — ${fmtCOP(f.totalRedondeado)}`),
        `Total antes de IVA: ${fmtCOP(resultado.totalRedondeado)}`,
        `Duración estimada: ${resultado.dias} jornada(s)`,
      ].join('\n'))
      toast.success('Resumen copiado')
    } catch { toast.error('No fue posible copiar el resumen') }
  }
  async function copiarValor() {
    if (!valido) return
    try { await navigator.clipboard.writeText(String(resultado.totalRedondeado)); toast.success('Valor copiado') }
    catch { toast.error('No fue posible copiar el valor') }
  }
  async function copiarWhatsApp() {
    if (!valido || !destino) return
    const iva=Math.round(resultado.totalRedondeado*0.19)
    const lineas=['*Mantenimiento in situ regional — HANNA Servicio Técnico*',
      '📍 Sede: '+sede.nombre+' · Destino: '+destino.municipio,'','*Equipos*',
      ...resultado.filas.map(f=>'• '+f.referencia+(f.equipo?.nombre?' — '+f.equipo.nombre:'')+' (x'+f.cantidad+'): '+fmtCOP(f.unitarioRedondeado)+' c/u → '+fmtCOP(f.totalRedondeado)),
      '', 'Subtotal (antes de IVA): '+fmtCOP(resultado.totalRedondeado), 'IVA (19 %): '+fmtCOP(iva),
      '*Total con IVA: '+fmtCOP(resultado.totalRedondeado+iva)+'*',
      '🗓️ Duración estimada: '+resultado.dias+' día(s)', '',
      '*Programación del servicio regional*',
      'Este valor corresponde a un servicio regional de mantenimiento compartido. Para ofrecerte esta tarifa, agrupamos las solicitudes de la zona; por eso, la programación de la visita depende del número de solicitudes recibidas. Nuestro equipo coordinará contigo la fecha de atención.', '',
      'Si prefieres una visita de mantenimiento exclusiva, puedes solicitarla a nuestro equipo. Prepararemos una cotización personalizada que incluya el desplazamiento, los viáticos y los demás gastos necesarios. Esta modalidad tendrá un precio mayor al del servicio compartido.', '',
      '_Valores estimados, sujetos a la cotización formal._']
    try { await navigator.clipboard.writeText(lineas.join('\n')); toast.success('Resumen copiado — pégalo en WhatsApp') }
    catch { toast.error('No fue posible copiar el resumen') }
  }
  return <div className="regional-consulta">
    <section className="regional-main">
    <Card style={{overflow: 'visible'}}>
      <h3 className="regional-step"><span>1</span> ¿Dónde se realizará el servicio?</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Precio base común para las cinco sedes regionales. El desplazamiento depende de la oficina y el destino; Bogotá conserva su propio catálogo.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}><FG label="Departamento"><SelectorBuscable style={INP} value={departamento} onChange={e => { setDepartamento(e.target.value); setCodigoDestino('') }}>
          <option value="">Todos los departamentos disponibles</option>
          {departamentos.map(d => <option key={d}>{d}</option>)}
        </SelectorBuscable></FG></div>
        <div style={{ flex: 1, minWidth: 180 }}><FG label="Ciudad o municipio"><SelectorBuscable style={INP} value={codigoDestino} onChange={e => setCodigoDestino(e.target.value)}>
          <option value="">Selecciona el destino</option>
          {destinos.filter(d => !departamento || d.departamento === departamento).map(d => <option key={d.codigo} value={d.codigo}>{d.municipio} — {Number(d.ida_km).toFixed(1)} km desde oficina</option>)}
        </SelectorBuscable></FG></div>
      </div>
      {destino && <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
        {destino.codigo === sede.codigo ? 'Ciudad de la sede: solo precio base del servicio.'
          : `Ida: ${Number(destino.ida_km).toFixed(1)} km / ${fmtMinutos(Number(destino.ida_min))}. Regreso: ${Number(destino.regreso_km).toFixed(1)} km / ${fmtMinutos(Number(destino.regreso_min))}.`}
        {' '}Ruta precalculada oficina → cabecera municipal; no representa la dirección específica del cliente.
      </p>}
    </Card>
    <Card style={{overflow: 'visible'}}>
      <h3 className="regional-step"><span>2</span> Equipos a atender</h3>
      <div className="regional-search"><Search size={17} /><FG label="Buscar equipo"><input style={INP} value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por referencia o nombre — ej. HI 5522" /></FG></div>
      {sugerencias.map(e => <button key={e.referencia} onClick={() => agregar(e.referencia)} style={{ ...INP, textAlign: 'left', marginTop: 5, cursor: 'pointer' }}>
        <Plus size={14} /> {e.referencia} — {e.nombre} · {e.codigo} · {fmtCOP(e.precio)}
      </button>)}
      {buscar.length >= 2 && !sugerencias.length && <p style={{ marginTop: 10 }}>No hay equipos regionales con ese criterio. Revisa la asignación del servicio en Configuración.</p>}
      <div className="regional-list-heading"><strong>Equipos de la consulta</strong><span>{items.reduce((n,i)=>n+i.cantidad,0)} equipos · {items.length} referencias</span></div>
      {!items.length && <p className="regional-empty">Busca un equipo y selecciónalo de la lista para comenzar la consulta.</p>}
      {items.map(i => <div className="regional-equipo" key={i.referencia} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <div className="regional-equipo-info"><strong>{i.referencia}</strong><span>{porReferencia.get(i.referencia)?.nombre}</span><small>{porReferencia.get(i.referencia)?.codigo} · {fmtHoras(porReferencia.get(i.referencia)?.horas ?? 0)} · {fmtCOP(porReferencia.get(i.referencia)?.precio ?? 0)} c/u</small></div>
        <input type="number" min={1} max={9999} aria-label={`Cantidad de ${i.referencia}`} value={i.cantidad} style={{ ...INP, width: 90 }}
          onChange={e => setItems(prev => prev.map(p => p.referencia === i.referencia ? { ...p, cantidad: Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1)) } : p))} />
        <Button variant="ghost" aria-label={`Quitar ${i.referencia}`} onClick={() => setItems(prev => prev.filter(p => p.referencia !== i.referencia))}><Trash2 size={14} /></Button>
      </div>)}
      {!!items.length && <div className="regional-reset"><Button variant="ghost" onClick={()=>{setItems([]);setBuscar('')}}>+ Nueva consulta</Button></div>}
    </Card>
    </section>
    <aside className="regional-summary">
    <Card style={{overflow: 'visible'}}>
      <div className="regional-summary-heading"><h3>Resumen de precios</h3><span className={valido?'regional-status ready':'regional-status'}>{valido?'Precio disponible':pendientePeajes?'Revisar peajes':'Completa la consulta'}</span></div>
      <p className="regional-destino">{destino?.municipio ?? 'Selecciona un destino'}</p>
      {[['Servicio base', resultado.base], ['Vehículo / depreciación', resultado.vehiculo], ['Combustible', resultado.combustible],
        ['Peajes', resultado.peajes], ['Recargo por km adicionales a 60 km',resultado.recargo]].map(([label, valor]) => <div className="regional-price-row" key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
        <span>{label}</span><strong>{(label === 'Peajes' || label === 'Total antes de IVA') && pendientePeajes ? 'Pendiente de confirmar' : fmtCOP(Number(valor))}</strong>
      </div>)}
          <div className="regional-total"><span>Total estimado antes de IVA</span><strong>{pendientePeajes?'Pendiente de confirmar':items.length?fmtCOP(resultado.totalRedondeado):'—'}</strong><p>Los precios de cada equipo incluyen su parte del desplazamiento, redondeados a miles.</p></div>
      <div className="regional-duration"><CalendarDays size={15} /><span>Duración estimada</span><strong>{items.length?resultado.dias+' día(s) / visita':'—'}</strong></div>
      <p style={{ marginTop: 10, color: 'var(--muted)', fontSize: 12 }}>
        Servicio: {fmtHoras(resultado.horas)} · Recorrido total: {fmtHoras(resultado.horasViajeTotal)} ·
        {' '}Tiempo total: {fmtHoras(resultado.horas + resultado.horasViajeTotal)} · {resultado.dias} jornada(s).
        Sin vuelos, hotel ni alimentación.
      </p>
      {!!resultado.kmAdicionales && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
        {resultado.kmAdicionales.toFixed(1)} km adicionales en {resultado.dias} visita(s) × {fmtCOP(data.config.recargo_km_adicional)}/km.
      </p>}
      {!!resultado.peaje.detalle.length && <details className="regional-details"><summary>Ver peajes de ida y regreso</summary><div style={{ marginTop: 10, fontSize: 12 }}>
        <strong>Peajes por visita — cada estación una vez por sentido</strong>
        {resultado.peaje.detalle.map(p=><p key={`${p.sentido}-${p.nombre}`}>{p.sentido==='ida'?'Ida':'Regreso'}: {p.nombre} · {fmtCOP(p.precio)}</p>)}
      </div></details>}
      {valido && resultado.filas.map(f => <p className="regional-item-total" key={f.referencia} style={{ marginTop: 8 }}>{f.referencia}: {fmtCOP(f.unitarioRedondeado)} c/u · total {fmtCOP(f.totalRedondeado)}</p>)}
      {pendientePeajes && <p role="alert" style={{ marginTop: 12, color: 'var(--red)' }}>Esta ruta requiere revisar: {[
        ...(destino?.revision_ruta?.pendientes?.map(p=>`${p.nombre} (${p.sentido})`)??[]),
        ...peajesCaducados.map(p=>`${p.nombre}: venció la vigencia de su tarifa/exención`),
      ].join(', ') || 'asociación de casetas a la ruta'}. Revisa únicamente estas excepciones en Configuración regional.</p>}
      {!!resultado.errores.length && <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 12 }}>{resultado.errores.join(' ')}</p>}
      <div className="regional-copy-actions"><Button variant="ghost" disabled={!valido} onClick={copiarValor}><Copy size={14} /> Copiar valor</Button><Button className="regional-whatsapp" disabled={!valido} onClick={copiarWhatsApp}><MessageCircle size={14} /> Resumen para WhatsApp</Button></div>
      <details className="regional-details"><summary>Más opciones</summary><Button disabled={!valido} variant="ghost" onClick={copiar}>Copiar cotización sin IVA</Button></details>
      <p className="regional-note">El resumen se actualiza automáticamente. La cotización formal se realiza en el ERP.</p>
    </Card>
    </aside>
  </div>
}
