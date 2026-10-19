import { GuardarSolicitud } from '../gestion-mantenimientos/GuardarSolicitud'
import type { CalculoGuardado } from '../gestion-mantenimientos/modelo'
import '../gestion-mantenimientos/gestion.css'
import { IconoColombia } from './IconoColombia'
import { cloneElement, useId, useState, type ReactElement } from 'react'
import { Car, Plane, Plus, Trash2, CircleHelp } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { INP } from '../mant-in-situ/ui'
import { fmtCOP, useEquiposInSitu } from '../mant-in-situ/hooks/useMantInSitu'
import { useRegional, type SedeRegional } from './datos'
import { useAccesoPersonalizado } from './useAccesoPersonalizado'
import { resumirPersonalizado, calcularTransportePersonalizado, calcularEstadiaPersonalizada, diasSugeridosPersonalizado, ALIMENTACION_DIARIA, calcularOtrosPersonalizado, calcularMargenPersonalizado, type ItemPersonalizado, type TransportePersonalizado } from './personalizado'
import { SelectorBuscable } from './SelectorBuscable'

function Obligatorio() { return <span className="regional-required" aria-hidden="true"> *</span> }
function CampoPersonalizado({label, obligatorio = true, children}: {label: string, obligatorio?: boolean, children: ReactElement}) {
  const id = useId()
  return <div className="regional-custom-field"><label htmlFor={children.type === 'input' ? id : undefined}>{label}{obligatorio && <Obligatorio/>}</label>{children.type === 'input' ? cloneElement(children as ReactElement<Record<string, unknown>>, {id, required:obligatorio, 'aria-required':obligatorio, 'aria-describedby':'personalizado-obligatorios'}) : children}</div>
}

export function PersonalizadoRegional({ sede, onVolver }: { sede: SedeRegional, onVolver: () => void }) {
  const autorizado = useAccesoPersonalizado()
  const catalogoBogota = useEquiposInSitu()
  const { data, isLoading, error } = useRegional(autorizado ? sede : undefined)
  const [referencia, setReferencia] = useState('')
  const [items, setItems] = useState<ItemPersonalizado[]>([])
  const [transporte, setTransporte] = useState<TransportePersonalizado>({viaje:'',tiqueteIda:'',tiqueteRegreso:'',carroHanna:'',kilometros:'',peajes:'',gastosTerrestres:''})
  const [hospedaje, setHospedaje] = useState<'si' | 'no' | ''>('')
  const [noches, setNoches] = useState('1')
  const [valorNoche, setValorNoche] = useState('300000')
  const [diasManual, setDiasManual] = useState<string | null>(null)
  const dias = diasManual ?? String(diasSugeridosPersonalizado(hospedaje, noches))
  const {viaje} = transporte
  const terrestre = viaje === 'terrestre'
  const usaCarroHanna = terrestre || (viaje === 'aereo' && transporte.carroHanna === 'si')
  function cambiarTransporte(campo: keyof TransportePersonalizado, valor: string) {
    setTransporte(prev=>({...prev,[campo]:valor}))
  }
  if (!autorizado) return null
  if (isLoading || catalogoBogota.isLoading) return <Spinner />
  if (error || catalogoBogota.error || !data) return <Card>No se pudo cargar el catálogo de equipos de Bogotá. Vuelve a intentar.</Card>
  const resumen = resumirPersonalizado(items)
  const traslado = calcularTransportePersonalizado(transporte, data.config)
  const estadia = calcularEstadiaPersonalizada({hospedaje, noches, valorNoche, dias})
  const otros = calcularOtrosPersonalizado(dias)
  const subtotalCalculado = resumen.valido && resumen.total != null && traslado.total != null && estadia.total != null && otros != null ? resumen.total + traslado.total + estadia.total + otros : null
  const {subtotal,margen,total} = calcularMargenPersonalizado(subtotalCalculado)
  const calculoGuardado:CalculoGuardado|null = total != null && subtotal != null && margen != null ? {
    version:1,items,transporte,estadia:{hospedaje,noches,valorNoche,dias},dias:Number(dias),
    tarifas:{costo_km:Number(data.config.costo_km),rendimiento_km_galon:Number(data.config.rendimiento_km_galon),precio_galon:Number(data.config.precio_galon),sede:sede.nombre},
    desglose:{base:resumen.total!,tiquetes:traslado.tiquetes,depreciacion:traslado.devaluacion,gasolina:traslado.gasolina,peajes:traslado.peajes,desplazamiento:traslado.gastosTerrestres,hospedaje:estadia.hospedaje,alimentacion:estadia.alimentacion,otros:otros!},
    subtotal,margen_pct:5,margen,total,
  } : null
  const seleccionado = catalogoBogota.equipos.find(e => e.referencia === referencia)
  function agregar() {
    if (!seleccionado) return
    const equipo = seleccionado
    setItems(prev => prev.some(i => i.referencia === equipo.referencia)
      ? prev.map(i => i.referencia === equipo.referencia ? {...i, cantidad: String((Number(i.cantidad) || 0) + 1)} : i)
      : [...prev, {referencia:equipo.referencia, nombre:equipo.nombre, codigo:equipo.codigo ?? '', precio:equipo.precio != null && equipo.precio > 0 ? String(equipo.precio) : '', cantidad:'1'}])
    setReferencia('')
  }
  function editar(ref: string, campo: 'precio' | 'cantidad', valor: string) {
    setItems(prev => prev.map(i => i.referencia === ref ? {...i, [campo]:valor} : i))
  }
  return <>
    <Card><div className="regional-office-heading"><div><h2 className="regional-custom-title"><IconoColombia/> Personalizado</h2><p className="regional-note">Cálculo manual exclusivo de Servicio Técnico.</p></div><Button variant="ghost" onClick={onVolver}>Volver a oficinas</Button></div>
      <p id="personalizado-obligatorios" className="regional-note"><Obligatorio/> Datos obligatorios para obtener el valor total.</p>
      <details className="regional-required-help"><summary><CircleHelp size={16}/> Ayuda sobre los datos obligatorios</summary><p>Completa los campos con asterisco naranja que correspondan a tus respuestas y agrega al menos un equipo. El total aparecerá cuando todos sean válidos. Si no hay peajes o gastos de desplazamiento, escribe 0.</p></details>
    </Card>
    <div className="regional-consulta" style={{marginTop:18}}>
      <section className="regional-main">
        <Card>
          <h3 className="regional-step"><span>1</span> ¿El transporte principal es aéreo o terrestre?</h3>
          <fieldset className="regional-custom-travel"><legend>Transporte principal<Obligatorio/></legend>
            <label className={viaje==='aereo'?'selected':''}><input type="radio" required aria-required="true" aria-describedby="personalizado-obligatorios" name="viaje-personalizado" value="aereo" checked={viaje==='aereo'} onChange={()=>cambiarTransporte('viaje','aereo')}/><Plane size={22}/><span><strong>Aéreo</strong><small>Traslado en avión</small></span></label>
            <label className={viaje==='terrestre'?'selected':''}><input type="radio" name="viaje-personalizado" value="terrestre" checked={viaje==='terrestre'} onChange={()=>cambiarTransporte('viaje','terrestre')}/><Car size={22}/><span><strong>Terrestre</strong><small>Traslado por carretera</small></span></label>
          </fieldset>
          {viaje==='aereo' && <div className="regional-custom-costs">
            <CampoPersonalizado label="Precio del tiquete de ida (COP)"><input style={INP} type="number" min="1" step="1" placeholder="Valor de ida" value={transporte.tiqueteIda} onChange={e=>cambiarTransporte('tiqueteIda',e.target.value)}/></CampoPersonalizado>
            <CampoPersonalizado label="Precio del tiquete de vuelta (COP)"><input style={INP} type="number" min="1" step="1" placeholder="Valor de vuelta" value={transporte.tiqueteRegreso} onChange={e=>cambiarTransporte('tiqueteRegreso',e.target.value)}/></CampoPersonalizado>
          </div>}
        </Card>
        {viaje && <Card>
          <h3 className="regional-step"><span>2</span> {terrestre ? 'Desplazamiento terrestre en carro de HANNA' : '¿Te desplazarás en carro de HANNA en el destino?'}</h3>
          {!terrestre && <fieldset className="regional-custom-travel"><legend>Uso de carro de HANNA<Obligatorio/></legend>
            <label className={transporte.carroHanna==='si'?'selected':''}><input type="radio" name="carro-hanna" value="si" checked={transporte.carroHanna==='si'} onChange={()=>cambiarTransporte('carroHanna','si')}/><span><strong>Sí, carro de HANNA</strong><small>Calcular devaluación, gasolina y peajes</small></span></label>
            <label className={transporte.carroHanna==='no'?'selected':''}><input type="radio" name="carro-hanna" value="no" checked={transporte.carroHanna==='no'} onChange={()=>cambiarTransporte('carroHanna','no')}/><span><strong>No</strong><small>Sin cargos por vehículo de HANNA</small></span></label>
          </fieldset>}
          {usaCarroHanna && <>
            <div className="regional-custom-costs">
              <CampoPersonalizado label={terrestre ? 'Kilometraje de ida (km)' : 'Kilometraje total del trayecto (km)'}><input style={INP} type="number" min="0" step="0.1" placeholder={terrestre ? 'Kilómetros de una sola ida' : 'Total de kilómetros'} value={transporte.kilometros} onChange={e=>cambiarTransporte('kilometros',e.target.value)}/></CampoPersonalizado>
              <CampoPersonalizado label="Valor total de peajes del viaje (COP)"><input style={INP} type="number" min="0" step="1" placeholder="0 si no hay peajes" value={transporte.peajes} onChange={e=>cambiarTransporte('peajes',e.target.value)}/></CampoPersonalizado>
            </div>
            <p className="regional-note">{terrestre ? 'Siempre se utiliza carro de HANNA. Ingresa los kilómetros de una sola ida: se multiplican por 2 para calcular la depreciación y gasolina de ida y vuelta. Los peajes se ingresan por el valor total del viaje y se cobran una sola vez.' : 'Ingresa todos los kilómetros y peajes del desplazamiento en el destino, incluida la vuelta. Se cobran una sola vez en esta consulta.'}</p>
            <details className="regional-details"><summary>Tarifas para devaluación y gasolina</summary><p className="regional-note">Tarifas de {sede.nombre}: {fmtCOP(Number(data.config.costo_km))}/km de vehículo · {data.config.rendimiento_km_galon} km/galón · {fmtCOP(Number(data.config.precio_galon))}/galón. {terrestre ? 'Kilómetros de ida × 2. Devaluación = km totales × tarifa/km; gasolina = km totales ÷ rendimiento × precio/galón; peajes = valor total ingresado, sin multiplicarlo.' : 'Se aplica el kilometraje total ingresado, sin agregar margen ni duplicar el regreso.'}</p></details>
          </>}
          {viaje==='aereo' && transporte.carroHanna==='no' && <div className="regional-custom-costs">
            <CampoPersonalizado label="Gastos asociados a viáticos de desplazamiento terrestre (COP)"><input style={INP} type="number" min="0" step="1" placeholder="0 si no hay gastos" value={transporte.gastosTerrestres} onChange={e=>cambiarTransporte('gastosTerrestres',e.target.value)}/></CampoPersonalizado>
            <p className="regional-note">Ingresa el valor total para toda la visita: taxis, buses u otros traslados terrestres. No incluyas tiquetes aéreos, hotel ni alimentación aquí.</p>
          </div>}
        </Card>}

        {traslado.listo && <>
          <Card>
            <h3 className="regional-step"><span>3</span> ¿Se requiere hospedaje?</h3>
            <fieldset className="regional-custom-travel"><legend>Hospedaje durante la visita<Obligatorio/></legend>
              <label className={hospedaje==='si'?'selected':''}><input type="radio" name="hospedaje-personalizado" value="si" checked={hospedaje==='si'} onChange={()=>setHospedaje('si')}/><span><strong>Sí, se requiere hospedaje</strong><small>Especifica noches y valor por noche</small></span></label>
              <label className={hospedaje==='no'?'selected':''}><input type="radio" name="hospedaje-personalizado" value="no" checked={hospedaje==='no'} onChange={()=>setHospedaje('no')}/><span><strong>No se requiere</strong><small>Sin cargo de hospedaje</small></span></label>
            </fieldset>
            {hospedaje==='si' && <div className="regional-custom-costs">
              <CampoPersonalizado label="Cantidad de noches"><input style={INP} aria-label="Cantidad de noches" type="number" min="1" step="1" value={noches} onChange={e=>setNoches(e.target.value)}/></CampoPersonalizado>
              <CampoPersonalizado label="Valor por noche (COP)"><input style={INP} aria-label="Valor por noche" type="number" min="1" step="1" value={valorNoche} onChange={e=>setValorNoche(e.target.value)}/></CampoPersonalizado>
            </div>}
            {hospedaje==='si' && <p className="regional-note">Valor inicial: $300.000 por noche. Puedes modificarlo para esta visita.</p>}
          </Card>
          {hospedaje && <Card>
            <h3 className="regional-step"><span>4</span> Días y alimentación</h3>
            <div className="regional-custom-costs">
              <CampoPersonalizado label="Días de la visita"><input style={INP} aria-label="Días de la visita" type="number" min="1" step="1" value={dias} onChange={e=>setDiasManual(e.target.value)}/></CampoPersonalizado>
              <CampoPersonalizado obligatorio={false} label="Alimentación por día (COP)"><input style={INP} aria-label="Alimentación por día" readOnly value={ALIMENTACION_DIARIA}/></CampoPersonalizado>
            </div>
            <p className="regional-note">Se sugieren noches + 1 día, o 1 día sin hospedaje. Ajusta los días si la visita lo requiere. Alimentación: {fmtCOP(ALIMENTACION_DIARIA)} por día.</p>
            {diasManual !== null && <Button variant="ghost" onClick={()=>setDiasManual(null)}>Usar días sugeridos</Button>}
          </Card>}
        </>}

        <Card style={{overflow:'visible'}}>
          <h3 className="regional-step"><span>5</span> Equipos y valor base</h3>
          <p className="regional-note">Selecciona el equipo para cargar su valor base de mantenimiento in situ de Bogotá. Puedes ajustar el valor por unidad para esta consulta.</p>
          <div className="regional-custom-add"><CampoPersonalizado obligatorio={items.length===0} label="Equipo del catálogo"><SelectorBuscable style={INP} aria-label="Equipo del catálogo" value={referencia} onChange={e=>setReferencia(e.target.value)}><option value="">Buscar referencia o nombre</option>{catalogoBogota.equipos.map(e=><option key={e.referencia} value={e.referencia}>{e.referencia} · {e.nombre}</option>)}</SelectorBuscable></CampoPersonalizado><Button disabled={!seleccionado} onClick={agregar}><Plus size={16}/> Agregar equipo</Button></div>
          {!items.length && <p className="regional-empty">Agrega al menos un equipo para obtener el total.</p>}
          {items.map(i=><div className="regional-custom-item" key={i.referencia}>
            <div className="regional-equipo-info"><strong>{i.referencia}</strong><span>{i.nombre}</span><small>{i.codigo || 'Sin código de mantenimiento de Bogotá'}</small></div>
            <div className="regional-custom-fields">
              <CampoPersonalizado label="Cantidad"><input style={INP} aria-label={'Cantidad de '+i.referencia} type="number" min="1" step="1" value={i.cantidad} onChange={e=>editar(i.referencia,'cantidad',e.target.value)}/></CampoPersonalizado>
              <CampoPersonalizado label="Valor base Bogotá por unidad (COP, sin IVA)"><input style={INP} aria-label={'Valor base de '+i.referencia} type="number" min="0.01" step="0.01" value={i.precio} placeholder="Ingresa el valor base" onChange={e=>editar(i.referencia,'precio',e.target.value)}/></CampoPersonalizado>
              <Button variant="ghost" aria-label={'Quitar '+i.referencia} onClick={()=>setItems(prev=>prev.filter(p=>p.referencia!==i.referencia))}><Trash2 size={16}/></Button>
            </div>
          </div>)}
          {!!items.length && !resumen.valido && <p role="status" className="regional-note">Ingresa cantidades enteras y valores base mayores que cero para calcular el subtotal.</p>}
        </Card>

      </section>
      <aside className="regional-summary"><Card>
        <div className="regional-summary-heading"><h3>Resumen personalizado</h3><span className="regional-status">Manual</span></div>
        <p className="regional-destino">Valores antes de IVA</p>
        <div className="regional-price-row"><span>Referencias</span><strong>{items.length}</strong></div>
        <div className="regional-price-row"><span>Tipo de viaje</span><strong>{viaje==='aereo'?'Aéreo':viaje==='terrestre'?'Terrestre':'Por seleccionar'}</strong></div>
        <div className="regional-price-row"><span>Servicio base · Bogotá</span><strong>{resumen.total != null ? fmtCOP(resumen.total) : '—'}</strong></div>
        {viaje==='aereo' && <div className="regional-price-row"><span>Tiquetes de ida y vuelta</span><strong>{transporte.tiqueteIda.trim() && transporte.tiqueteRegreso.trim() && Number(transporte.tiqueteIda)>0 && Number(transporte.tiqueteRegreso)>0 ? fmtCOP(traslado.tiquetes) : '—'}</strong></div>}
        {terrestre && <p className="regional-note">Ida y vuelta: {transporte.kilometros.trim() && Number.isFinite(Number(transporte.kilometros)) && Number(transporte.kilometros)>=0 ? transporte.kilometros+' km × 2 = '+traslado.km+' km' : 'kilómetros de ida × 2'}. Gasolina y depreciación se calculan sobre esos kilómetros. Los peajes se suman una sola vez por el valor ingresado.</p>}
        {usaCarroHanna && <>
          <div className="regional-price-row"><span>{terrestre ? 'Devaluación HANNA · ida y vuelta' : 'Devaluación del vehículo HANNA'}</span><strong>{transporte.kilometros.trim() && Number(transporte.kilometros)>=0 ? fmtCOP(traslado.devaluacion) : '—'}</strong></div>
          <div className="regional-price-row"><span>{terrestre ? 'Gasolina · ida y vuelta' : 'Gasolina'}</span><strong>{transporte.kilometros.trim() && Number(transporte.kilometros)>=0 ? fmtCOP(traslado.gasolina) : '—'}</strong></div>
          <div className="regional-price-row"><span>{'Peajes · total ingresado'}</span><strong>{transporte.peajes.trim() && Number(transporte.peajes)>=0 ? fmtCOP(traslado.peajes) : '—'}</strong></div>
        </>}
        {viaje==='aereo' && transporte.carroHanna==='no' && <div className="regional-price-row"><span>Desplazamiento terrestre</span><strong>{transporte.gastosTerrestres.trim() && Number.isFinite(Number(transporte.gastosTerrestres)) && Number(transporte.gastosTerrestres)>=0 ? fmtCOP(traslado.gastosTerrestres) : '—'}</strong></div>}
        {hospedaje && <div className="regional-price-row"><span>Hospedaje{hospedaje==='si' ? ' · '+noches+' noche(s)' : ''}</span><strong>{hospedaje==='no' || estadia.listo ? fmtCOP(estadia.hospedaje) : '—'}</strong></div>}
        {hospedaje && <div className="regional-price-row"><span>Alimentación · {dias || '—'} día(s)</span><strong>{dias.trim() && Number.isSafeInteger(Number(dias)) && Number(dias)>0 ? fmtCOP(estadia.alimentacion) : '—'}</strong></div>}
        {hospedaje && <div className="regional-price-row"><span>Otros</span><strong>{otros != null ? fmtCOP(otros) : '—'}</strong></div>}
        <div className="regional-price-row"><span>Subtotal</span><strong>{fmtCOP(subtotal)}</strong></div>
        <div className="regional-price-row"><span>Margen de error · 5 %</span><strong>{fmtCOP(margen)}</strong></div>
        <div className="regional-total"><span>Total estimado antes de IVA</span><strong>{total != null && Number.isFinite(total) ? fmtCOP(total) : '—'}</strong><p>Servicio base Bogotá, transporte, hospedaje, alimentación, otros y margen de error del 5 %.</p></div>
        {!traslado.listo && <div role="status" className="regional-note">{traslado.pendientes.map(p=><p key={p}>{p}</p>)}</div>}
        {traslado.listo && !estadia.listo && <div role="status" className="regional-note">{estadia.pendientes.map(p=><p key={p}>{p}</p>)}</div>}
        <p className="regional-note">Los valores corresponden a la visita completa. No incluye otros gastos adicionales.</p>
        <GuardarSolicitud calculo={calculoGuardado}/>
      </Card></aside>
    </div>
  </>
}
