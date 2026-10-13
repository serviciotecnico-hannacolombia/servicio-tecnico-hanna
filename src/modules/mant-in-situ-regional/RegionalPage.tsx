import { useState } from 'react'
import { Plus, Trash2, Copy, MapPinned } from 'lucide-react'
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

export function RegionalPage() {
  const { data: sedes = [], isLoading, error } = useSedesRegionales()
  const [sedeId, setSedeId] = useState('')
  const sede = sedes.find(s => s.id === sedeId) ?? sedes[0]
  const { hasCapability } = useUser()
  const [configurar, setConfigurar] = useState(false)
  return <div>
    <Header title={`Mant. In Situ — ${sede?.nombre ?? 'Regional'}`} subtitle="Servicio desde la oficina regional — hasta 110 km por carretera, sin vuelos"
      actions={hasCapability('mant_in_situ_regional_editar') && <Button variant="ghost" onClick={() => setConfigurar(v => !v)}>
        {configurar ? 'Volver a consulta' : 'Configuración regional'}
      </Button>} />
    {isLoading ? <Spinner /> : error ? <Card>No se pudo cargar la información regional. Verifica las migraciones y vuelve a intentar.</Card>
      : !sede ? <Card>No hay sedes regionales configuradas.</Card> : <>
        <Card><FG label="Oficina de origen"><select style={INP} value={sede.id} onChange={e => setSedeId(e.target.value)}>
          {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select></FG>
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
  if (error || !data) return <Card>No se pudo cargar la configuración de {sede.nombre}.</Card>
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
  return <div style={{ display: 'grid', gap: 16 }}>
    <Card>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Precio base común para las cinco sedes regionales. El desplazamiento depende de la oficina y el destino; Bogotá conserva su propio catálogo.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}><FG label="Departamento"><select style={INP} value={departamento} onChange={e => { setDepartamento(e.target.value); setCodigoDestino('') }}>
          <option value="">Todos los departamentos disponibles</option>
          {departamentos.map(d => <option key={d}>{d}</option>)}
        </select></FG></div>
        <div style={{ flex: 1, minWidth: 180 }}><FG label="Ciudad o municipio"><select style={INP} value={codigoDestino} onChange={e => setCodigoDestino(e.target.value)}>
          <option value="">Selecciona el destino</option>
          {destinos.filter(d => !departamento || d.departamento === departamento).map(d => <option key={d.codigo} value={d.codigo}>{d.municipio} — {Number(d.ida_km).toFixed(1)} km desde oficina</option>)}
        </select></FG></div>
      </div>
      {destino && <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
        {destino.codigo === sede.codigo ? 'Ciudad de la sede: solo precio base del servicio.'
          : `Ida: ${Number(destino.ida_km).toFixed(1)} km / ${fmtMinutos(Number(destino.ida_min))}. Regreso: ${Number(destino.regreso_km).toFixed(1)} km / ${fmtMinutos(Number(destino.regreso_min))}.`}
        {' '}Ruta precalculada oficina → cabecera municipal; no representa la dirección específica del cliente.
      </p>}
    </Card>
    <Card>
      <FG label="Agregar equipo"><input style={INP} value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar referencia o nombre, ej. HI 5522" /></FG>
      {sugerencias.map(e => <button key={e.referencia} onClick={() => agregar(e.referencia)} style={{ ...INP, textAlign: 'left', marginTop: 5, cursor: 'pointer' }}>
        <Plus size={14} /> {e.referencia} — {e.nombre} · {e.codigo} · {fmtCOP(e.precio)}
      </button>)}
      {buscar.length >= 2 && !sugerencias.length && <p style={{ marginTop: 10 }}>No hay equipos regionales con ese criterio. Revisa la asignación del servicio en Configuración.</p>}
      {items.map(i => <div key={i.referencia} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <span style={{ flex: 1 }}>{i.referencia} · {porReferencia.get(i.referencia)?.codigo}</span>
        <input type="number" min={1} max={9999} aria-label={`Cantidad de ${i.referencia}`} value={i.cantidad} style={{ ...INP, width: 90 }}
          onChange={e => setItems(prev => prev.map(p => p.referencia === i.referencia ? { ...p, cantidad: Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1)) } : p))} />
        <Button variant="ghost" aria-label={`Quitar ${i.referencia}`} onClick={() => setItems(prev => prev.filter(p => p.referencia !== i.referencia))}><Trash2 size={14} /></Button>
      </div>)}
    </Card>
    <Card>
      <h3 style={{ marginBottom: 12 }}>Resumen del servicio</h3>
      {[['Servicio base', resultado.base], ['Vehículo / depreciación', resultado.vehiculo], ['Combustible', resultado.combustible],
        ['Peajes', resultado.peajes], ['Recargo por km adicionales a 60 km',resultado.recargo], ['Total antes de IVA', resultado.totalRedondeado]].map(([label, valor]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
        <span>{label}</span><strong>{(label === 'Peajes' || label === 'Total antes de IVA') && pendientePeajes ? 'Pendiente de confirmar' : fmtCOP(Number(valor))}</strong>
      </div>)}
      <p style={{ marginTop: 10, color: 'var(--muted)', fontSize: 12 }}>
        Servicio: {fmtHoras(resultado.horas)} · Recorrido total: {fmtHoras(resultado.horasViajeTotal)} ·
        {' '}Tiempo total: {fmtHoras(resultado.horas + resultado.horasViajeTotal)} · {resultado.dias} jornada(s).
        Sin vuelos, hotel ni alimentación.
      </p>
      {!!resultado.kmAdicionales && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
        {resultado.kmAdicionales.toFixed(1)} km adicionales en {resultado.dias} visita(s) × {fmtCOP(data.config.recargo_km_adicional)}/km.
      </p>}
      {!!resultado.peaje.detalle.length && <div style={{ marginTop: 10, fontSize: 12 }}>
        <strong>Peajes por visita — cada estación una vez por sentido</strong>
        {resultado.peaje.detalle.map(p=><p key={`${p.sentido}-${p.nombre}`}>{p.sentido==='ida'?'Ida':'Regreso'}: {p.nombre} · {fmtCOP(p.precio)}</p>)}
      </div>}
      {valido && resultado.filas.map(f => <p key={f.referencia} style={{ marginTop: 8 }}>{f.referencia}: {fmtCOP(f.unitarioRedondeado)} c/u · total {fmtCOP(f.totalRedondeado)}</p>)}
      {pendientePeajes && <p role="alert" style={{ marginTop: 12, color: 'var(--red)' }}>Esta ruta requiere revisar: {[
        ...(destino?.revision_ruta?.pendientes?.map(p=>`${p.nombre} (${p.sentido})`)??[]),
        ...peajesCaducados.map(p=>`${p.nombre}: venció la vigencia de su tarifa/exención`),
      ].join(', ') || 'asociación de casetas a la ruta'}. Revisa únicamente estas excepciones en Configuración regional.</p>}
      {!!resultado.errores.length && <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 12 }}>{resultado.errores.join(' ')}</p>}
      <Button disabled={!valido} onClick={copiar} style={{ marginTop: 14 }}><Copy size={14} /> Copiar cotización</Button>
    </Card>
  </div>
}
