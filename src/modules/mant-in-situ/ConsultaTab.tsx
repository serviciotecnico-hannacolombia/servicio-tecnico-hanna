// Consulta: destino + equipos → resumen de precios con desplazamiento
// (peajes, combustible, vehículo), duración en días y organización por día.
// El cálculo vive en calculo.ts (misma fórmula que el HTML original).
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Search, Plus, Minus, Trash2, FileText, Copy, MapPinned, AlertTriangle, CalendarDays, MessageCircle } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { useConfigInSitu, useDestinosInSitu, useEquiposInSitu, fmtCOP, fmtHoras, fmtMinutos, CODIGO_BOGOTA, type EquipoInSitu } from './hooks/useMantInSitu'
import { calcular, organizacionPorDia } from './calculo'
import { FG, INP, PRI, GHOST, EMPTY, PASO, TITULO_CARD } from './ui'

export interface ItemConsulta { referencia: string, cantidad: number }

function norm(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase()
}

const fmtDecimal = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 })

// IVA de Colombia — solo se muestra en el resumen para WhatsApp; en la
// interfaz los valores son antes de IVA.
const IVA_PCT = 19

export function ConsultaTab({ destino, setDestino, items, setItems, avisoOmitido, setAvisoOmitido }: {
  destino: string
  setDestino: (v: string) => void
  items: ItemConsulta[]
  setItems: React.Dispatch<React.SetStateAction<ItemConsulta[]>>
  avisoOmitido: string
  setAvisoOmitido: (v: string) => void
}) {
  const { equipos, isLoading: cargandoEquipos } = useEquiposInSitu()
  const { data: rutas, isLoading: cargandoDestinos } = useDestinosInSitu()
  const { data: config, isLoading: cargandoConfig } = useConfigInSitu()
  const [busqueda, setBusqueda] = useState('')
  const [descripcion, setDescripcion] = useState<EquipoInSitu | null>(null)

  const porReferencia = useMemo(() => new Map(equipos.map(e => [e.referencia, e])), [equipos])
  const destinoSel = rutas?.destinos.find(d => d.codigo === destino)

  const sugerencias = useMemo(() => {
    const q = norm(busqueda)
    if (q.length < 2) return []
    return equipos.filter(e => norm(e.referencia).includes(q) || norm(e.nombre).includes(q)).slice(0, 8)
  }, [busqueda, equipos])

  const r = useMemo(
    () => config && rutas ? calcular(items, porReferencia, destinoSel, config, rutas.pasos, rutas.peajes) : null,
    [items, porReferencia, destinoSel, config, rutas],
  )

  function agregar(e: EquipoInSitu) {
    setItems(prev => prev.some(i => i.referencia === e.referencia)
      ? prev.map(i => i.referencia === e.referencia ? { ...i, cantidad: i.cantidad + 1 } : i)
      : [...prev, { referencia: e.referencia, cantidad: 1 }])
    setBusqueda('')
  }
  function fijarCantidad(ref: string, cantidad: number) {
    setItems(prev => prev.map(i => i.referencia === ref ? { ...i, cantidad: Math.min(9999, Math.max(1, Math.floor(cantidad) || 1)) } : i))
  }
  function quitar(ref: string) {
    setItems(prev => prev.filter(i => i.referencia !== ref))
  }

  // Resumen para enviar por WhatsApp: solo destino, valor por equipo
  // (redondeado, con desplazamiento incluido), total y duración — sin el
  // detalle de cómo se calcula. *negrita* y _cursiva_ son formato de WhatsApp.
  async function copiarWhatsApp() {
    if (!r?.listo || !r.destino) return
    const iva = Math.round(r.totalRedondeado * IVA_PCT / 100)
    const recortar = (t: string) => t.length > 60 ? t.slice(0, 57).trimEnd() + '…' : t
    const lineas = [
      '*Mantenimiento in situ — HANNA Servicio Técnico*',
      `📍 Destino: ${r.destino.municipio}`,
      '',
      '*Equipos*',
      ...r.filas.map(f => {
        const nombre = f.equipo?.nombre ? ` — ${recortar(f.equipo.nombre)}` : ''
        return f.cantidad > 1
          ? `• ${f.referencia}${nombre} (x${f.cantidad}): ${fmtCOP(f.unitarioRedondeado)} c/u → ${fmtCOP(f.totalRedondeado)}`
          : `• ${f.referencia}${nombre}: ${fmtCOP(f.totalRedondeado)}`
      }),
      '',
      `Subtotal (antes de IVA): ${fmtCOP(r.totalRedondeado)}`,
      `IVA (${IVA_PCT} %): ${fmtCOP(iva)}`,
      `*Total con IVA: ${fmtCOP(r.totalRedondeado + iva)}*`,
      `🗓️ Duración estimada: ${r.dias} ${r.dias === 1 ? 'día' : 'días'}`,
      '',
      '_Valores estimados, sujetos a la cotización formal._',
    ]
    try {
      await navigator.clipboard.writeText(lineas.join('\n'))
      toast.success('Resumen copiado — pégalo en WhatsApp')
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  // Copia solo el total estimado (antes de IVA) como número, listo para
  // pegar en el ERP.
  async function copiarValor() {
    if (!r?.listo) return
    try {
      await navigator.clipboard.writeText(String(r.totalRedondeado))
      toast.success(`${fmtCOP(r.totalRedondeado)} copiado`)
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  async function copiarDescripcion() {
    if (!descripcion) return
    try {
      await navigator.clipboard.writeText(descripcion.descripcionServicio)
      toast.success('Descripción copiada')
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  if (cargandoEquipos || cargandoDestinos || cargandoConfig) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
  }
  if (!config || !rutas || !r) {
    return <Card><p style={{ color: 'var(--muted)' }}>Falta la configuración del módulo — aplica las migraciones de Mant. In Situ.</p></Card>
  }

  const esBogota = destino === CODIGO_BOGOTA
  const totalEquipos = items.reduce((s, i) => s + i.cantidad, 0)
  const mostrarCostos = !!destinoSel && items.length > 0
  const errores = r.errores.filter(e => !e.startsWith('Selecciona') && !e.startsWith('Agrega'))
  // El aviso de varios días se puede omitir; vuelve a salir si cambia el destino o el número de días.
  const claveAviso = `${destino}|${r.dias}`
  const mostrarAviso = !!destinoSel && r.dias > 1 && r.filas.every(f => f.valido) && avisoOmitido !== claveAviso
  const dias = organizacionPorDia(r)
  const estado = r.listo ? { texto: 'Precio disponible', color: 'var(--green, #16a34a)', bg: 'var(--green-bg, #dcfce7)' }
    : !destinoSel || !items.length ? { texto: 'Completa destino y equipos', color: 'var(--muted)', bg: 'var(--surface2)' }
      : { texto: 'Revisión pendiente', color: 'var(--yellow)', bg: 'var(--yellow-bg)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {mostrarAviso && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 'var(--radius)', background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 240, fontSize: 13 }}>
            <strong>Ten en cuenta: este servicio requiere {r.dias} días estimados.</strong>{' '}
            El mantenimiento y los recorridos superan una jornada de {fmtDecimal(Number(config.jornada_horas))} h; se necesitan {r.dias} visitas.
            {r.listo ? ' Los costos correspondientes ya están incluidos.' : ' El precio estará disponible al completar los datos pendientes.'}
          </div>
          <button onClick={() => setAvisoOmitido(claveAviso)} style={{ ...GHOST, padding: '6px 12px', fontSize: 12 }}>Entendido · omitir aviso</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 style={TITULO_CARD}><span style={PASO}>1</span> ¿Dónde se realizará el servicio?</h3>
            <FG label="Ciudad o municipio">
              <select value={destino} onChange={e => setDestino(e.target.value)} style={INP}>
                <option value="">Selecciona el destino</option>
                {rutas.destinos.filter(d => d.activo).map(d => (
                  <option key={d.codigo} value={d.codigo}>{d.municipio}{d.codigo !== CODIGO_BOGOTA ? ` — ${d.departamento}` : ''}</option>
                ))}
              </select>
            </FG>
            {destinoSel && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPinned size={13} />
                {esBogota
                  ? 'Bogotá · servicio en la ciudad: se cobra únicamente el servicio.'
                  : <>{destinoSel.municipio} · {fmtDecimal(r.kmVisita)} km de ida y regreso por visita desde {config.origen_nombre} (ida {fmtMinutos(destinoSel.ida_min)} · regreso {fmtMinutos(destinoSel.regreso_min)}, con {fmtDecimal(Number(config.margen_recorrido_pct))} % de margen).</>}
              </p>
            )}
          </Card>

          <Card>
            <h3 style={TITULO_CARD}><span style={PASO}>2</span> Equipos a atender</h3>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && sugerencias[0]) agregar(sugerencias[0]) }}
                placeholder="Buscar por referencia o nombre — ej. HI 701" style={{ ...INP, paddingLeft: 34 }} autoComplete="off"
              />
              {sugerencias.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,.08)', overflow: 'hidden' }}>
                  {sugerencias.map(e => (
                    <button key={e.referencia} onClick={() => agregar(e)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: 12, padding: '9px 13px', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)', color: 'var(--text)' }}>
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{e.referencia}</strong>
                        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{e.nombre}</span>
                      </span>
                      <span style={{ fontSize: 12, color: e.completo ? 'var(--text)' : 'var(--red)', whiteSpace: 'nowrap' }}>{e.completo ? fmtCOP(e.precio) : 'Sin datos'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '16px 0 8px', fontSize: 12, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Equipos de la consulta</strong>
              <span>{totalEquipos} {totalEquipos === 1 ? 'equipo' : 'equipos'} · {items.length} {items.length === 1 ? 'referencia' : 'referencias'}</span>
            </div>
            {r.filas.length === 0 ? (
              <div style={{ ...EMPTY, padding: '30px 20px' }}><p>Busca un equipo y selecciónalo de la lista.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {r.filas.map(f => (
                  <div key={f.referencia} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto auto', gap: 12, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12.5 }}>{f.referencia}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.equipo?.nombre || 'Referencia no encontrada'}</div>
                      <div style={{ fontSize: 11, color: f.valido ? 'var(--muted)' : 'var(--red)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                        {f.valido
                          ? <>{f.equipo!.codigo} · {fmtHoras(f.equipo!.horas!)} · {fmtCOP(f.equipo!.precio)} c/u</>
                          : 'Falta código in situ, horas o precio — solicita revisión en Configuración'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => fijarCantidad(f.referencia, f.cantidad - 1)} disabled={f.cantidad <= 1} title="Restar" style={{ ...GHOST, padding: '5px 8px' }}><Minus size={12} /></button>
                      <input value={f.cantidad} onChange={e => fijarCantidad(f.referencia, Number(e.target.value))} inputMode="numeric" aria-label={`Cantidad de ${f.referencia}`} style={{ ...INP, width: 50, padding: '5px 4px', textAlign: 'center', fontWeight: 700 }} />
                      <button onClick={() => fijarCantidad(f.referencia, f.cantidad + 1)} title="Sumar" style={{ ...GHOST, padding: '5px 8px' }}><Plus size={12} /></button>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 110 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.listo ? fmtCOP(f.totalRedondeado) : '—'}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                        {!r.listo ? 'Se completa al calcular'
                          : <>{f.cantidad > 1 && <>{fmtCOP(f.unitarioRedondeado)} c/u · </>}servicio {fmtCOP(f.base)}{f.transporte > 0 && <> + desplaz. {fmtCOP(f.transporte)}</>}</>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {f.equipo && <button onClick={() => setDescripcion(f.equipo!)} title="Descripción del servicio" style={{ ...GHOST, padding: '5px 9px' }}><FileText size={13} /></button>}
                      <button onClick={() => quitar(f.referencia)} title="Quitar" style={{ ...GHOST, padding: '5px 9px', color: 'var(--red)' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button onClick={() => { setItems([]); setAvisoOmitido('') }} style={{ ...GHOST, padding: '6px 12px', fontSize: 12 }}>＋ Nueva consulta</button>
              </div>
            )}
          </Card>
        </div>

        <Card style={{ position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <h3 style={{ ...TITULO_CARD, marginBottom: 2 }}>Resumen de precios</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{destinoSel ? destinoSel.municipio : 'Todo el valor, en un solo lugar.'}</p>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', color: estado.color, background: estado.bg }}>{estado.texto}</span>
          </div>

          <div style={{ marginTop: 12 }}>
            <FilaCosto label="Servicios de mantenimiento" valor={items.length ? fmtCOP(r.base) : '—'} />
            <FilaCosto
              label="Peajes" valor={!mostrarCostos ? '—' : r.peaje.conocido ? fmtCOP(r.peajes) : 'Por validar'}
              detalle={mostrarCostos && !esBogota && r.peaje.conocido && r.dias > 0
                ? (r.peaje.manual
                  ? `${fmtCOP(r.peaje.total)} por visita (valor manual${r.peaje.motivo ? `: ${r.peaje.motivo}` : ''}) × ${r.dias}`
                  : r.peaje.detalle.length
                    ? `${r.peaje.detalle.map(p => `${p.nombre} (${p.sentido}) ${fmtCOP(p.precio)}`).join(' · ')} × ${r.dias} ${r.dias === 1 ? 'visita' : 'visitas'}`
                    : 'Sin peajes en la ruta')
                : undefined}
            />
            <FilaCosto label="Combustible" valor={mostrarCostos ? fmtCOP(r.combustible) : '—'}
              detalle={mostrarCostos && !esBogota && r.km > 0 ? `${fmtDecimal(r.km)} km ÷ ${fmtDecimal(Number(config.rendimiento_km_galon))} km/gal × ${fmtCOP(Number(config.precio_galon))}` : undefined} />
            <FilaCosto label="Uso y desgaste del vehículo" valor={mostrarCostos ? fmtCOP(r.vehiculo) : '—'}
              detalle={mostrarCostos && !esBogota && r.km > 0 ? `${fmtDecimal(r.km)} km × ${fmtCOP(Number(config.costo_km))}/km` : undefined} />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)' }}>Total estimado</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: r.listo ? 'var(--accent)' : 'var(--muted)' }}>{r.listo ? fmtCOP(r.totalRedondeado) : '—'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              Los precios de cada equipo incluyen su parte del desplazamiento, redondeados a miles.
              {r.listo && r.totalRedondeado !== r.total && <> Valor exacto: {fmtCOP(r.total)}.</>}
            </div>
            {r.listo && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={copiarValor} title="Copia el total estimado (antes de IVA) como número" style={{ ...GHOST, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Copy size={14} /> Copiar valor
                </button>
                <button onClick={copiarWhatsApp} title="Incluye el IVA" style={{ ...PRI, flex: 1, justifyContent: 'center', background: '#1f9d55' }}>
                  <MessageCircle size={14} /> Resumen para WhatsApp
                </button>
              </div>
            )}
          </div>

          {errores.length > 0 && (
            <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', fontSize: 12, lineHeight: 1.5 }}>
              {errores.map(e => <div key={e}>{e}</div>)}
            </div>
          )}

          {mostrarCostos && r.dias > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><CalendarDays size={13} /> Duración estimada</span>
                <strong>{r.dias} {r.dias === 1 ? 'día / visita' : 'días / visitas'}</strong>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: 'var(--surface2)', marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--accent)', width: `${Math.min(100, 100 * (r.horas + r.horasViajeTotal) / (Math.max(1, r.dias) * Number(config.jornada_horas)))}%` }} />
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
                {fmtDecimal(r.horas)} h de mantenimiento + {fmtDecimal(r.horasViajeTotal)} h de desplazamiento. Jornada de {fmtDecimal(Number(config.jornada_horas))} h.
              </p>
              <details style={{ marginTop: 6 }}>
                <summary style={{ fontSize: 12, cursor: 'pointer', color: 'var(--accent)' }}>Ver organización por día</summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {dias.map(d => (
                    <div key={d.dia} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 8px', borderRadius: 6, background: 'var(--surface2)' }}>
                      <strong>Día {d.dia}</strong>
                      <span style={{ color: 'var(--muted)' }}>{fmtDecimal(d.servicio)} h servicio{d.recorrido > 0 && ` · ${fmtDecimal(d.recorrido)} h recorrido`}</span>
                    </div>
                  ))}
                  {r.dias > dias.length && <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>{r.dias - dias.length} días adicionales, incluidos en los costos.</p>}
                </div>
              </details>
            </div>
          )}
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 12 }}>El resumen se actualiza automáticamente. La cotización formal se realiza en el ERP.</p>
        </Card>
      </div>

      {descripcion && (
        <Modal open onClose={() => setDescripcion(null)} title="Descripción del servicio" width={620}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--mono)' }}>{descripcion.referencia} · {descripcion.nombre}</p>
          <textarea readOnly value={descripcion.descripcionServicio} rows={12} style={{ ...INP, resize: 'vertical', lineHeight: 1.55 }} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={() => setDescripcion(null)} style={GHOST}>Cerrar</button>
            <button onClick={copiarDescripcion} style={PRI}><Copy size={13} /> Copiar descripción</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FilaCosto({ label, valor, detalle }: { label: string, valor: string, detalle?: string }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
        <span style={{ color: 'var(--muted)' }}>{label}</span>
        <strong style={{ color: valor === 'Por validar' ? 'var(--yellow)' : 'var(--text)' }}>{valor}</strong>
      </div>
      {detalle && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{detalle}</div>}
    </div>
  )
}
