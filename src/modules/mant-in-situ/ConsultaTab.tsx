// Consulta: destino + equipos → resumen de precios. En esta fase solo se
// calcula el valor de los servicios (precio × cantidad) y las horas de
// mantenimiento; peajes, combustible, vehículo y días llegan en la fase 2
// (fórmula documentada en la migración 20261006_modulo_mant_in_situ.sql).
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Search, Plus, Minus, Trash2, FileText, Copy, MapPinned } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { useDestinosInSitu, useEquiposInSitu, fmtCOP, fmtHoras, fmtMinutos, CODIGO_BOGOTA, type EquipoInSitu } from './hooks/useMantInSitu'
import { FG, INP, PRI, GHOST, EMPTY, PASO, TITULO_CARD } from './ui'

export interface ItemConsulta { referencia: string, cantidad: number }

function norm(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase()
}

export function ConsultaTab({ destino, setDestino, items, setItems }: {
  destino: string
  setDestino: (v: string) => void
  items: ItemConsulta[]
  setItems: React.Dispatch<React.SetStateAction<ItemConsulta[]>>
}) {
  const { equipos, isLoading: cargandoEquipos } = useEquiposInSitu()
  const { data: rutas, isLoading: cargandoDestinos } = useDestinosInSitu()
  const [busqueda, setBusqueda] = useState('')
  const [descripcion, setDescripcion] = useState<EquipoInSitu | null>(null)

  const porReferencia = useMemo(() => new Map(equipos.map(e => [e.referencia, e])), [equipos])
  const destinoSel = rutas?.destinos.find(d => d.codigo === destino)

  const sugerencias = useMemo(() => {
    const q = norm(busqueda)
    if (q.length < 2) return []
    return equipos.filter(e => norm(e.referencia).includes(q) || norm(e.nombre).includes(q)).slice(0, 8)
  }, [busqueda, equipos])

  function agregar(e: EquipoInSitu) {
    setItems(prev => prev.some(i => i.referencia === e.referencia)
      ? prev.map(i => i.referencia === e.referencia ? { ...i, cantidad: i.cantidad + 1 } : i)
      : [...prev, { referencia: e.referencia, cantidad: 1 }])
    setBusqueda('')
  }
  function cambiarCantidad(ref: string, delta: number) {
    setItems(prev => prev.map(i => i.referencia === ref ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i))
  }
  function quitar(ref: string) {
    setItems(prev => prev.filter(i => i.referencia !== ref))
  }

  const filas = items.map(i => ({ ...i, equipo: porReferencia.get(i.referencia) }))
  const incompletos = filas.filter(f => !f.equipo?.completo)
  const totalServicios = filas.reduce((s, f) => s + (f.equipo?.precio ?? 0) * f.cantidad, 0)
  const totalHoras = filas.reduce((s, f) => s + (f.equipo?.horas ?? 0) * f.cantidad, 0)
  const totalEquipos = items.reduce((s, i) => s + i.cantidad, 0)
  const esBogota = destino === CODIGO_BOGOTA

  async function copiarDescripcion() {
    if (!descripcion) return
    try {
      await navigator.clipboard.writeText(descripcion.descripcionServicio)
      toast.success('Descripción copiada')
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  if (cargandoEquipos || cargandoDestinos) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <h3 style={TITULO_CARD}><span style={PASO}>1</span> ¿Dónde se realizará el servicio?</h3>
          <FG label="Ciudad o municipio">
            <select value={destino} onChange={e => setDestino(e.target.value)} style={INP}>
              <option value="">Selecciona el destino</option>
              {rutas?.destinos.filter(d => d.activo).map(d => (
                <option key={d.codigo} value={d.codigo}>{d.municipio}{d.codigo !== CODIGO_BOGOTA ? ` — ${d.departamento}` : ''}</option>
              ))}
            </select>
          </FG>
          {destinoSel && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPinned size={13} />
              {esBogota
                ? 'Dentro de Bogotá se cobra únicamente el servicio.'
                : <>Desde HANNA El Dorado: ida {destinoSel.ida_km ?? '—'} km ({fmtMinutos(destinoSel.ida_min)}) · regreso {destinoSel.regreso_km ?? '—'} km ({fmtMinutos(destinoSel.regreso_min)})</>}
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

          <div style={{ marginTop: 16 }}>
            {filas.length === 0 ? (
              <div style={{ ...EMPTY, padding: '30px 20px' }}><p>Busca un equipo y selecciónalo de la lista.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filas.map(f => (
                  <div key={f.referencia} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: 12, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12.5 }}>{f.referencia}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.equipo?.nombre || 'Referencia no encontrada'}</div>
                      <div style={{ fontSize: 11, color: f.equipo?.completo ? 'var(--muted)' : 'var(--red)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                        {f.equipo?.completo
                          ? <>{f.equipo.codigo} · {fmtHoras(f.equipo.horas!)} · {fmtCOP(f.equipo.precio)} c/u</>
                          : 'Falta código, horas o precio — solicita revisión en Configuración'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => cambiarCantidad(f.referencia, -1)} disabled={f.cantidad <= 1} title="Restar" style={{ ...GHOST, padding: '5px 8px' }}><Minus size={12} /></button>
                      <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{f.cantidad}</span>
                      <button onClick={() => cambiarCantidad(f.referencia, 1)} title="Sumar" style={{ ...GHOST, padding: '5px 8px' }}><Plus size={12} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {f.equipo && <button onClick={() => setDescripcion(f.equipo!)} title="Descripción del servicio" style={{ ...GHOST, padding: '5px 9px' }}><FileText size={13} /></button>}
                      <button onClick={() => quitar(f.referencia)} title="Quitar" style={{ ...GHOST, padding: '5px 9px', color: 'var(--red)' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card style={{ position: 'sticky', top: 20 }}>
        <h3 style={{ ...TITULO_CARD, marginBottom: 4 }}>Resumen de precios</h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          {destinoSel ? destinoSel.municipio : 'Selecciona un destino'} · {totalEquipos} {totalEquipos === 1 ? 'equipo' : 'equipos'}
        </p>
        {[
          ['Servicios de mantenimiento', items.length ? fmtCOP(totalServicios) : '—'],
          ['Peajes', esBogota ? fmtCOP(0) : 'Fase 2'],
          ['Combustible', esBogota ? fmtCOP(0) : 'Fase 2'],
          ['Uso y desgaste del vehículo', esBogota ? fmtCOP(0) : 'Fase 2'],
        ].map(([label, valor]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>{label}</span>
            <strong style={{ color: valor === 'Fase 2' ? 'var(--muted)' : 'var(--text)', fontWeight: valor === 'Fase 2' ? 500 : 700, fontSize: valor === 'Fase 2' ? 11.5 : 13 }}>{valor}</strong>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--mono)' }}>
            {esBogota ? 'Total' : 'Subtotal de servicios'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{items.length ? fmtCOP(totalServicios) : '—'}</div>
          {totalHoras > 0 && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Mantenimiento: {fmtHoras(totalHoras)}</div>}
        </div>
        {incompletos.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 12 }}>
            {incompletos.length === 1 ? 'Una referencia necesita' : `${incompletos.length} referencias necesitan`} código, precio o tiempo válido.
          </p>
        )}
        {destino && !esBogota && (
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 12, padding: '9px 11px', background: 'var(--surface2)', borderRadius: 8 }}>
            El desplazamiento (peajes, combustible, vehículo y días) se calculará en la siguiente fase del módulo.
          </p>
        )}
        <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 12 }}>La cotización formal se realiza en el ERP.</p>
      </Card>

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
