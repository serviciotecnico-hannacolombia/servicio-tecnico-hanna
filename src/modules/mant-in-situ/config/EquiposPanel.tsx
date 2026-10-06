// Equipos y servicios: tabla filtrable con selección múltiple y acciones en
// bloque (asignar código in situ, fijar/quitar precio individual, fijar/
// quitar horas). Flujo típico: filtrar por código normal MANTCHECKER.01,
// "Seleccionar los N filtrados" y asignar MANTCHECKER.02. Toda acción pasa
// por una confirmación con el número de referencias y una muestra.
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Search, X } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Modal } from '../../../components/ui/Modal'
import { Spinner } from '../../../components/ui/Spinner'
import { useConfigInSitu, useEquiposInSitu, useInvalidarMantInSitu, fmtCOP, fmtHoras, type EquipoInSitu } from '../hooks/useMantInSitu'
import { asignarCodigoInSitu, excepcionActual, guardarExcepciones, type ExcepcionEquipo } from '../acciones'
import { leerNumero } from '../csv'
import { exportarEquipos, planEquipos } from '../importaciones'
import { CsvAcciones } from '../CsvAcciones'
import { EncabezadoPanel } from './EncabezadoPanel'
import { FG, INP, PRI, GHOST, EMPTY, B_CHIP, B_ALERTA } from '../ui'

const POR_PAGINA = 100
const SIN_ASIGNAR = '__sin__'

type Accion =
  | { tipo: 'codigo', codigo: string | null }
  | { tipo: 'precio', valor: number | null }
  | { tipo: 'horas', valor: number | null }

export function EquiposPanel() {
  const { equipos, codigos, isLoading } = useEquiposInSitu()
  const { data: config } = useConfigInSitu()
  const invalidar = useInvalidarMantInSitu()

  const [busqueda, setBusqueda] = useState('')
  const [familia, setFamilia] = useState('')
  const [codigoNormal, setCodigoNormal] = useState('')
  const [codigoInSitu, setCodigoInSitu] = useState('')
  const [estado, setEstado] = useState<'todos' | 'pendientes' | 'excepciones'>('todos')
  const [pagina, setPagina] = useState(0)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [accion, setAccion] = useState<Accion | null>(null)
  const [aplicando, setAplicando] = useState(false)

  const familias = useMemo(() => [...new Set(equipos.map(e => e.familia).filter(Boolean))].sort(), [equipos])
  const codigosNormales = useMemo(() => [...new Set(equipos.map(e => e.codigoNormal).filter(Boolean))].sort(), [equipos])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return equipos.filter(e =>
      (!familia || e.familia === familia) &&
      (!codigoNormal || e.codigoNormal === codigoNormal) &&
      (!codigoInSitu || (codigoInSitu === SIN_ASIGNAR ? !e.codigo : e.codigo === codigoInSitu)) &&
      (estado === 'todos' || (estado === 'pendientes' ? !e.completo : e.tieneExcepcion)) &&
      (!q || [e.referencia, e.nombre, e.familia, e.codigo, e.codigoNormal].some(v => (v || '').toLowerCase().includes(q))))
  }, [equipos, busqueda, familia, codigoNormal, codigoInSitu, estado])

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, paginas - 1)
  const visibles = filtrados.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA)
  const todosVisiblesSel = visibles.length > 0 && visibles.every(e => seleccion.has(e.referencia))
  const seleccionados = equipos.filter(e => seleccion.has(e.referencia))
  const pendientes = equipos.filter(e => !e.completo).length

  function cambiarFiltro(fn: () => void) { fn(); setPagina(0) }
  function toggle(ref: string) {
    setSeleccion(prev => { const n = new Set(prev); if (n.has(ref)) n.delete(ref); else n.add(ref); return n })
  }
  function toggleVisibles() {
    setSeleccion(prev => {
      const n = new Set(prev)
      for (const e of visibles) { if (todosVisiblesSel) n.delete(e.referencia); else n.add(e.referencia) }
      return n
    })
  }

  // Lo que cambia en cada referencia seleccionada con la acción elegida.
  function cambiosDe(a: Accion): { equipo: EquipoInSitu, antes: string, despues: string }[] {
    return seleccionados.flatMap(e => {
      if (a.tipo === 'codigo') {
        return e.codigo === a.codigo ? [] : [{ equipo: e, antes: e.codigo ?? 'sin asignar', despues: a.codigo ?? 'sin asignar' }]
      }
      const actual = a.tipo === 'precio' ? e.excepcion?.precio ?? null : e.excepcion?.horas ?? null
      if (actual === a.valor) return []
      const f = a.tipo === 'precio' ? fmtCOP : (v: number) => fmtHoras(v)
      return [{ equipo: e, antes: actual == null ? 'del código' : f(actual), despues: a.valor == null ? 'del código' : f(a.valor) }]
    })
  }

  async function aplicar() {
    if (!accion) return
    const cambios = cambiosDe(accion)
    if (!cambios.length) { setAccion(null); return }
    setAplicando(true)
    let error: string | null
    if (accion.tipo === 'codigo') {
      error = await asignarCodigoInSitu(cambios.map(c => c.equipo.referencia), accion.codigo)
    } else {
      const nuevas = new Map<string, ExcepcionEquipo>()
      for (const { equipo } of cambios) {
        nuevas.set(equipo.referencia, { ...excepcionActual(equipo), [accion.tipo === 'precio' ? 'precio' : 'horas']: accion.valor })
      }
      error = await guardarExcepciones(nuevas)
    }
    setAplicando(false)
    if (error) { toast.error('Error: ' + error); return }
    toast.success(`${cambios.length} ${cambios.length === 1 ? 'referencia actualizada' : 'referencias actualizadas'}`)
    invalidar()
    setAccion(null)
    setSeleccion(new Set())
  }

  if (isLoading) return <Card><Spinner size={24} /></Card>

  return (
    <Card>
      <EncabezadoPanel
        titulo="Equipos y servicios"
        subtitulo={<>
          Catálogo desde <strong>Códigos</strong> ({equipos.length} referencias). El código in situ se guarda en Códigos y solo se edita aquí.
          {pendientes > 0 && <> · <span style={{ color: 'var(--red)' }}>{pendientes} pendientes</span></>}
        </>}
        acciones={
          <CsvAcciones
            titulo="Equipos y servicios"
            onExportar={() => exportarEquipos(equipos)}
            planificar={csv => planEquipos(csv, equipos, codigos, config?.descripcion_servicio ?? '')}
            ayuda={<>
              Solo se actualizan referencias que ya existen en <strong>Códigos</strong> (no se crean equipos) y las que no vienen no se tocan.
              codigo_in_situ vacío = sin asignar. horas / precio_individual / descripcion_servicio vacíos = usar los del código o la descripción general.
              equipo, familia, codigo_normal y *_efectivo(s) son solo de consulta.
            </>}
          />
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) repeat(4, minmax(140px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input value={busqueda} onChange={e => cambiarFiltro(() => setBusqueda(e.target.value))} placeholder="Referencia, nombre o código" style={{ ...INP, paddingLeft: 34 }} />
        </div>
        <select value={familia} onChange={e => cambiarFiltro(() => setFamilia(e.target.value))} style={INP}>
          <option value="">Familia: todas</option>
          {familias.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={codigoNormal} onChange={e => cambiarFiltro(() => setCodigoNormal(e.target.value))} style={INP}>
          <option value="">Código normal: todos</option>
          {codigosNormales.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={codigoInSitu} onChange={e => cambiarFiltro(() => setCodigoInSitu(e.target.value))} style={INP}>
          <option value="">Código in situ: todos</option>
          <option value={SIN_ASIGNAR}>Sin asignar</option>
          {codigos.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo}</option>)}
        </select>
        <select value={estado} onChange={e => cambiarFiltro(() => setEstado(e.target.value as typeof estado))} style={INP}>
          <option value="todos">Estado: todos</option>
          <option value="pendientes">Información pendiente</option>
          <option value="excepciones">Con precio u horas propios</option>
        </select>
      </div>

      {/* Barra de selección y acciones en bloque */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 9, marginBottom: 10, background: seleccion.size ? 'var(--accent-bg)' : 'var(--surface2)', border: `1px solid ${seleccion.size ? 'var(--accent)' : 'var(--border)'}` }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{seleccion.size} seleccionadas</span>
        {filtrados.length > 0 && seleccion.size < filtrados.length && (
          <button onClick={() => setSeleccion(new Set(filtrados.map(e => e.referencia)))} style={{ ...GHOST, padding: '5px 10px', fontSize: 12 }}>
            Seleccionar los {filtrados.length} filtrados
          </button>
        )}
        {seleccion.size > 0 && (
          <>
            <button onClick={() => setSeleccion(new Set())} style={{ ...GHOST, padding: '5px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><X size={12} /> Limpiar</button>
            <span style={{ flex: 1 }} />
            <AccionesBloque codigos={codigos.map(c => c.codigo)} onElegir={setAccion} />
          </>
        )}
      </div>

      {filtrados.length === 0 ? <div style={EMPTY}><p>Sin resultados</p></div> : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 9 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                <th style={TH}><input type="checkbox" checked={todosVisiblesSel} onChange={toggleVisibles} title="Seleccionar esta página" /></th>
                {['Referencia', 'Equipo', 'Código normal', 'Código in situ', 'Horas', 'Precio'].map(h => <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibles.map(e => (
                <tr key={e.referencia} onClick={() => toggle(e.referencia)} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer', background: seleccion.has(e.referencia) ? 'var(--accent-bg)' : undefined }}>
                  <td style={TD}><input type="checkbox" checked={seleccion.has(e.referencia)} onChange={() => toggle(e.referencia)} onClick={ev => ev.stopPropagation()} /></td>
                  <td style={{ ...TD, fontFamily: 'var(--mono)', fontWeight: 700, whiteSpace: 'nowrap' }}>{e.referencia}</td>
                  <td style={TD}><div>{e.nombre}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.familia}</div></td>
                  <td style={{ ...TD, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)' }}>{e.codigoNormal || '—'}</td>
                  <td style={TD}>{e.codigo ? <span style={B_CHIP}>{e.codigo}</span> : <span style={B_ALERTA}>Sin asignar</span>}</td>
                  <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {e.horas != null ? fmtHoras(e.horas) : '—'}{e.excepcion?.horas != null && <span title="Horas propias de esta referencia" style={{ color: 'var(--accent)' }}> ●</span>}
                  </td>
                  <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {fmtCOP(e.precio)}{e.precioIndividual && <span title="Precio individual" style={{ color: 'var(--accent)' }}> ●</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
        <span>{filtrados.length} referencias · <span style={{ color: 'var(--accent)' }}>●</span> = valor propio de la referencia</span>
        {paginas > 1 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual === 0} style={{ ...GHOST, padding: '5px 10px', fontSize: 12 }}>Anterior</button>
            Página {paginaActual + 1} de {paginas}
            <button onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual >= paginas - 1} style={{ ...GHOST, padding: '5px 10px', fontSize: 12 }}>Siguiente</button>
          </span>
        )}
      </div>

      {accion && (() => {
        const cambios = cambiosDe(accion)
        const titulo = accion.tipo === 'codigo'
          ? (accion.codigo ? `Asignar código in situ ${accion.codigo}` : 'Quitar código in situ')
          : accion.tipo === 'precio'
            ? (accion.valor == null ? 'Quitar precio individual' : `Fijar precio individual ${fmtCOP(accion.valor)}`)
            : (accion.valor == null ? 'Quitar horas propias' : `Fijar ${fmtHoras(accion.valor)}`)
        return (
          <Modal open onClose={() => !aplicando && setAccion(null)} title={titulo} width={620}>
            <p style={{ fontSize: 13, marginBottom: 10 }}>
              <strong>{cambios.length}</strong> de {seleccionados.length} referencias seleccionadas cambian
              {seleccionados.length - cambios.length > 0 && <> · {seleccionados.length - cambios.length} ya tienen ese valor</>}.
            </p>
            {cambios.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 260, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {cambios.slice(0, 100).map(c => (
                      <tr key={c.equipo.referencia} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ ...TD, fontFamily: 'var(--mono)', fontWeight: 700 }}>{c.equipo.referencia}</td>
                        <td style={{ ...TD, color: 'var(--muted)', textDecoration: 'line-through' }}>{c.antes}</td>
                        <td style={{ ...TD, fontWeight: 600 }}>{c.despues}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {cambios.length > 100 && <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>Mostrando 100 de {cambios.length}.</p>}
            {accion.tipo === 'codigo' && <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10 }}>El código in situ se guarda en Códigos (columna de solo lectura allá).</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setAccion(null)} disabled={aplicando} style={GHOST}>Cancelar</button>
              <button onClick={aplicar} disabled={aplicando || !cambios.length} style={{ ...PRI, opacity: aplicando || !cambios.length ? .5 : 1 }}>
                {aplicando ? 'Aplicando…' : `✓ Aplicar a ${cambios.length}`}
              </button>
            </div>
          </Modal>
        )
      })()}
    </Card>
  )
}

const TH: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)', fontWeight: 600 }
const TD: React.CSSProperties = { padding: '7px 10px', verticalAlign: 'top' }

// Tres controles compactos: código in situ, precio y horas. Cada uno arma la
// acción y la manda a confirmar — nada se guarda sin la confirmación.
function AccionesBloque({ codigos, onElegir }: { codigos: string[], onElegir: (a: Accion) => void }) {
  const [codigo, setCodigo] = useState('')
  const [precio, setPrecio] = useState('')
  const [horas, setHoras] = useState('')
  const BTN: React.CSSProperties = { ...GHOST, padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap' }

  function fijarPrecio() {
    const n = leerNumero(precio, true)
    if (n == null || isNaN(n) || n <= 0) { toast.error('Precio no válido (sin decimales, mayor a 0)'); return }
    onElegir({ tipo: 'precio', valor: n })
  }
  function fijarHoras() {
    const n = leerNumero(horas)
    if (n == null || isNaN(n) || n <= 0) { toast.error('Horas no válidas'); return }
    onElegir({ tipo: 'horas', valor: n })
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <FG label="Código in situ">
        <div style={{ display: 'flex', gap: 4 }}>
          <select value={codigo} onChange={e => setCodigo(e.target.value)} style={{ ...INP, padding: '6px 8px', fontSize: 12, width: 160 }}>
            <option value="">Elegir…</option>
            {codigos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => codigo && onElegir({ tipo: 'codigo', codigo })} disabled={!codigo} style={{ ...PRI, padding: '6px 10px', fontSize: 12 }}>Asignar</button>
          <button onClick={() => onElegir({ tipo: 'codigo', codigo: null })} title="Dejar sin código in situ" style={BTN}>Quitar</button>
        </div>
      </FG>
      <FG label="Precio individual">
        <div style={{ display: 'flex', gap: 4 }}>
          <input value={precio} onChange={e => setPrecio(e.target.value)} placeholder="COP" inputMode="numeric" style={{ ...INP, padding: '6px 8px', fontSize: 12, width: 100 }} />
          <button onClick={fijarPrecio} style={{ ...PRI, padding: '6px 10px', fontSize: 12 }}>Fijar</button>
          <button onClick={() => onElegir({ tipo: 'precio', valor: null })} title="Volver al precio del código" style={BTN}>Quitar</button>
        </div>
      </FG>
      <FG label="Horas">
        <div style={{ display: 'flex', gap: 4 }}>
          <input value={horas} onChange={e => setHoras(e.target.value)} placeholder="h" inputMode="decimal" style={{ ...INP, padding: '6px 8px', fontSize: 12, width: 60 }} />
          <button onClick={fijarHoras} style={{ ...PRI, padding: '6px 10px', fontSize: 12 }}>Fijar</button>
          <button onClick={() => onElegir({ tipo: 'horas', valor: null })} title="Volver a las horas del código" style={BTN}>Quitar</button>
        </div>
      </FG>
    </div>
  )
}
