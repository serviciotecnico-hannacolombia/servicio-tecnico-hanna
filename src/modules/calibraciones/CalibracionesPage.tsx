import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Pencil, FlaskConical, Users, AlertTriangle, Search, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { useUser } from '../../hooks/useUser'
import {
  useOrdenesCalibracion, useCatalogoRvCalibr, useAsesores, useProveedores, useInvalidateCalibraciones,
  grupoEstado, ESTADO_LABEL, MODALIDAD_LABEL, estaVencido, proximoAVencer, fechaObjetivo, infoAntiguedadEstado, descripcionSemaforo,
} from './hooks/useCalibraciones'
import {
  FG, IconBtn, Stat, INP, PRI, GHOST, B_INFO, B_VENCIDA, B_PROXIMA, B_NOVEDAD,
  GRUPO_COLOR, EMPTY, fmtFecha, fmtCOP,
} from './ui'
import type { Asesor, CorreoProveedor, EstadoCalibracion, Modalidad, RvCalibrItem } from '../../types'

type VistaFiltro = 'activas' | 'vencidas' | 'completadas' | 'todas'
type Tab = 'ordenes' | 'catalogo' | 'asesores'

const TAB_LABEL: Record<Tab, string> = { ordenes: 'Órdenes', catalogo: 'Catálogo RV CALIBR', asesores: 'Asesores' }

// Filtros de Estado / Modalidad / Asesor — se recuerdan entre sesiones para
// no tener que reconfigurarlos cada vez que se entra al módulo.
interface FiltrosOrdenes {
  estado: EstadoCalibracion | ''
  modalidad: Modalidad | ''
  asesorCorreo: string
}
const FILTROS_VACIOS: FiltrosOrdenes = { estado: '', modalidad: '', asesorCorreo: '' }
const FILTROS_KEY = 'calibraciones_filtros_ordenes'

function cargarFiltros(): FiltrosOrdenes {
  try {
    const raw = localStorage.getItem(FILTROS_KEY)
    if (!raw) return FILTROS_VACIOS
    const parsed = JSON.parse(raw)
    return {
      estado: parsed.estado || '',
      modalidad: parsed.modalidad || '',
      asesorCorreo: parsed.asesorCorreo || '',
    }
  } catch {
    return FILTROS_VACIOS
  }
}

export function CalibracionesPage() {
  const navigate = useNavigate()
  const { hasCapability } = useUser()
  const puedeEditar = hasCapability('calibraciones_editar')
  const { data: ordenes = [], isLoading } = useOrdenesCalibracion()
  const { data: catalogo = [] } = useCatalogoRvCalibr()
  const { data: asesores = [] } = useAsesores()
  const { data: proveedores = [] } = useProveedores()
  const invalidate = useInvalidateCalibraciones()

  const [tab, setTab] = useState<Tab>('ordenes')
  const [vista, setVista] = useState<VistaFiltro>('activas')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [filtros, setFiltros] = useState<FiltrosOrdenes>(cargarFiltros)

  const PAGE_SIZE = 30

  useEffect(() => { localStorage.setItem(FILTROS_KEY, JSON.stringify(filtros)) }, [filtros])

  const hayFiltrosActivos = !!(filtros.estado || filtros.modalidad || filtros.asesorCorreo)
  const actualizarFiltro = (parcial: Partial<FiltrosOrdenes>) => { setFiltros(f => ({ ...f, ...parcial })); setPage(0) }
  const limpiarFiltros = () => { setFiltros(FILTROS_VACIOS); setPage(0) }

  const filtered = ordenes
    .filter(o => {
      if (vista === 'todas') return true
      if (vista === 'completadas') return grupoEstado(o.estado) === 'completado'
      if (vista === 'vencidas') return estaVencido(o)
      return grupoEstado(o.estado) !== 'completado'
    })
    .filter(o => !filtros.estado || o.estado === filtros.estado)
    .filter(o => !filtros.modalidad || o.modalidad === filtros.modalidad)
    .filter(o => !filtros.asesorCorreo || (o.correo_asesor || '').toLowerCase() === filtros.asesorCorreo.toLowerCase())
    .filter(o => {
      const q = search.toLowerCase().trim()
      if (!q) return true
      return (o.cliente || '').toLowerCase().includes(q)
        || (o.numero_oc || '').toLowerCase().includes(q)
        || (o.correo_asesor || '').toLowerCase().includes(q)
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { if (page >= totalPages) setPage(0) }, [totalPages, page])
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const pendientesCount = ordenes.filter(o => grupoEstado(o.estado) === 'pendiente').length
  const enCursoCount = ordenes.filter(o => grupoEstado(o.estado) === 'en_curso').length
  const vencidasCount = ordenes.filter(o => estaVencido(o)).length
  const proximasCount = ordenes.filter(o => proximoAVencer(o)).length
  const completadasCount = ordenes.filter(o => grupoEstado(o.estado) === 'completado').length

  return (
    <div>
      <Header
        title="Calibraciones"
        subtitle="Gestión de calibración acreditada ONAC — reemplaza el seguimiento en Notion"
        actions={puedeEditar ? <button onClick={() => navigate('/calibraciones/nueva')} style={PRI}><Plus size={14} style={{ verticalAlign: -2 }} /> Nueva orden</button> : undefined}
      />

      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 20, maxWidth: 480 }}>
        {(['ordenes', ...(puedeEditar ? ['catalogo', 'asesores'] as const : [])] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 14px', border: 'none', borderRadius: 9,
            background: tab === t ? 'var(--accent)' : 'transparent',
            color: tab === t ? '#fff' : 'var(--muted)',
            fontFamily: 'var(--sans)', fontSize: '0.85rem', fontWeight: tab === t ? 700 : 500,
            cursor: 'pointer', transition: 'all .18s',
          }}>{TAB_LABEL[t]}</button>
        ))}
      </div>

      {tab === 'ordenes' ? (
        <>
          {(vencidasCount > 0 || proximasCount > 0) && (
            <div
              onClick={vencidasCount > 0 ? () => { setVista('vencidas'); setPage(0) } : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
                marginBottom: 20, cursor: vencidasCount > 0 ? 'pointer' : 'default', fontSize: 13, fontWeight: 600,
                background: vencidasCount > 0 ? 'var(--red-bg)' : 'var(--yellow-bg)',
                border: `1px solid ${vencidasCount > 0 ? 'var(--red-border)' : 'var(--yellow-border)'}`,
                color: vencidasCount > 0 ? 'var(--red)' : 'var(--yellow)',
              }}
            >
              <AlertTriangle size={16} />
              {vencidasCount > 0
                ? `Tienes ${vencidasCount} orden${vencidasCount !== 1 ? 'es' : ''} vencida${vencidasCount !== 1 ? 's' : ''} que requiere${vencidasCount !== 1 ? 'n' : ''} atención`
                : `Tienes ${proximasCount} orden${proximasCount !== 1 ? 'es' : ''} próxima${proximasCount !== 1 ? 's' : ''} a vencer`}
              {vencidasCount > 0 && <span style={{ marginLeft: 'auto', textDecoration: 'underline', fontSize: 12 }}>Ver vencidas →</span>}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
            <Stat label="Pendientes" value={pendientesCount} color="var(--muted)" />
            <Stat label="En curso" value={enCursoCount} color="var(--accent)" />
            <Stat label="Próximas a vencer" value={proximasCount} color="var(--yellow, #ca8a04)" />
            <Stat label="Vencidas" value={vencidasCount} color="var(--red)" />
            <Stat label="Completadas" value={completadasCount} color="var(--green, #16a34a)" />
          </div>

          <Card>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, flexWrap: 'wrap' }}>
                {([['activas', 'Activas'], ['vencidas', 'Vencidas'], ['completadas', 'Completadas'], ['todas', 'Todas']] as [VistaFiltro, string][]).map(([v, label]) => (
                  <button key={v} onClick={() => { setVista(v); setPage(0) }} style={{
                    padding: '6px 12px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                    fontWeight: vista === v ? 600 : 500, fontFamily: 'var(--sans)',
                    background: vista === v ? 'var(--accent)' : 'transparent',
                    color: vista === v ? '#fff' : 'var(--muted)',
                  }}>{label}</button>
                ))}
              </div>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} placeholder="Buscar por cliente, OC o asesor..." style={{ ...INP, paddingLeft: 34 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <select
                value={filtros.estado}
                onChange={e => actualizarFiltro({ estado: e.target.value as EstadoCalibracion | '' })}
                style={{ ...INP, width: 'auto', minWidth: 170 }}
              >
                <option value="">Estado: todos</option>
                {(Object.keys(ESTADO_LABEL) as EstadoCalibracion[]).map(e => (
                  <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
                ))}
              </select>
              <select
                value={filtros.modalidad}
                onChange={e => actualizarFiltro({ modalidad: e.target.value as Modalidad | '' })}
                style={{ ...INP, width: 'auto', minWidth: 170 }}
              >
                <option value="">Modalidad: todas</option>
                {(['laboratorio_externo', 'in_situ', 'sede_hanna_dorado'] as Modalidad[]).map(m => (
                  <option key={m} value={m}>{MODALIDAD_LABEL[m]}</option>
                ))}
              </select>
              <select
                value={filtros.asesorCorreo}
                onChange={e => actualizarFiltro({ asesorCorreo: e.target.value })}
                style={{ ...INP, width: 'auto', minWidth: 190 }}
              >
                <option value="">Asesor(a): todos</option>
                {asesores.map(a => (
                  <option key={a.id} value={a.correo}>{a.nombre}{a.plataforma ? ` — ${a.plataforma}` : ''}</option>
                ))}
              </select>
              {hayFiltrosActivos && (
                <button onClick={limpiarFiltros} style={GHOST}>Limpiar filtros</button>
              )}
            </div>

            {isLoading ? (
              <div style={EMPTY}><p>Cargando…</p></div>
            ) : pageItems.length === 0 ? (
              <div style={EMPTY}><FlaskConical size={32} strokeWidth={1.5} /><p>No hay órdenes para este filtro</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pageItems.map(o => {
                  const vencida = estaVencido(o)
                  const proxima = proximoAVencer(o)
                  const grupo = grupoEstado(o.estado)
                  const grupoColor = GRUPO_COLOR[grupo]
                  const descripcion = descripcionSemaforo(o)
                  return (
                    <div key={o.id} onClick={() => navigate(`/calibraciones/${o.id}`)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer',
                      border: `1px solid ${vencida ? 'var(--red-border)' : proxima ? 'var(--yellow-border)' : 'var(--border)'}`,
                      background: vencida ? 'var(--red-bg)' : proxima ? 'var(--yellow-bg)' : 'var(--surface2)',
                      borderRadius: 10, opacity: grupo === 'completado' ? 0.75 : 1, transition: 'transform .1s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = vencida ? 'var(--red-border)' : proxima ? 'var(--yellow-border)' : 'var(--border)' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{o.cliente}</span>
                          {o.numero_oc && <span style={B_INFO}>{o.numero_oc}</span>}
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20,
                            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                            background: grupoColor.bg, color: grupoColor.text, border: `1px solid ${grupoColor.border}`,
                          }}>{ESTADO_LABEL[o.estado]}</span>
                          {o.modalidad && <span style={B_INFO}>{MODALIDAD_LABEL[o.modalidad]}</span>}
                          {o.estado === 'novedad' && <span style={B_NOVEDAD}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Novedad</span>}
                          {vencida && <span style={B_VENCIDA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{descripcion}</span>}
                          {!vencida && proxima && <span style={B_PROXIMA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{descripcion}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {o.correo_asesor && <span>Asesor: <strong>{o.correo_asesor}</strong></span>}
                          {o.proveedor && <span>Proveedor: <strong>{o.proveedor}</strong></span>}
                          {(() => {
                            const objetivo = fechaObjetivo(o)
                            return objetivo ? (
                              <span>Fecha límite: <strong style={{ color: vencida ? 'var(--red)' : undefined }}>{fmtFecha(objetivo)}</strong></span>
                            ) : null
                          })()}
                          {(() => {
                            const info = infoAntiguedadEstado(o)
                            if (!info) return null
                            return (
                              <span>{info.etiqueta}: <strong style={{ color: vencida ? 'var(--red)' : proxima ? 'var(--yellow)' : undefined }}>
                                {fmtFecha(info.fechaISO)} ({info.habiles} día{info.habiles !== 1 ? 's' : ''} hábil{info.habiles !== 1 ? 'es' : ''})
                              </strong></span>
                            )
                          })()}
                          {!vencida && !proxima && descripcion && <span style={{ color: 'var(--accent)' }}>{descripcion}</span>}
                          {o.valor_oc_antes_iva != null && <span>Valor: <strong>{fmtCOP(o.valor_oc_antes_iva)}</strong></span>}
                          {o.enviado_cliente_final && <span style={{ color: 'var(--accent)' }}>Equipo ya despachado al cliente</span>}
                        </div>
                      </div>
                      <ChevronRight size={16} color="var(--muted)" style={{ flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {filtered.length} orden{filtered.length !== 1 ? 'es' : ''} — página {page + 1} de {totalPages}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={GHOST}>← Anterior</button>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={GHOST}>Siguiente →</button>
                </div>
              </div>
            )}
          </Card>
        </>
      ) : tab === 'catalogo' ? (
        <CatalogoTab catalogo={catalogo} proveedores={proveedores} onSaved={invalidate.catalogo} />
      ) : (
        <AsesoresTab asesores={asesores} onSaved={invalidate.asesores} />
      )}
    </div>
  )
}

// ── Catálogo RV CALIBR ───────────────────────────────────────────────────────

type FiltroModalidad = 'todas' | Modalidad

const FILTRO_MODALIDAD_OPCIONES: [FiltroModalidad, string][] = [
  ['todas', 'Todas'],
  ['laboratorio_externo', 'Laboratorio externo'],
  ['in_situ', 'In Situ'],
  ['sede_hanna_dorado', 'Sede Hanna Dorado'],
]

function CatalogoTab({ catalogo, proveedores, onSaved }: { catalogo: RvCalibrItem[], proveedores: CorreoProveedor[], onSaved: () => void }) {
  const [editando, setEditando] = useState<RvCalibrItem | null>(null)
  const [search, setSearch] = useState('')
  const [filtroModalidad, setFiltroModalidad] = useState<FiltroModalidad>('todas')

  const filtrado = catalogo
    .filter(c => filtroModalidad === 'todas' || c.modalidades_permitidas.includes(filtroModalidad))
    .filter(c => {
      const q = search.toLowerCase().trim()
      if (!q) return true
      return c.codigo.toLowerCase().includes(q)
        || c.magnitud.toLowerCase().includes(q)
        || c.descripcion.toLowerCase().includes(q)
    })

  return (
    <Card>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, flexWrap: 'wrap' }}>
          {FILTRO_MODALIDAD_OPCIONES.map(([v, label]) => (
            <button key={v} onClick={() => setFiltroModalidad(v)} style={{
              padding: '6px 12px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
              fontWeight: filtroModalidad === v ? 600 : 500, fontFamily: 'var(--sans)',
              background: filtroModalidad === v ? 'var(--accent)' : 'transparent',
              color: filtroModalidad === v ? '#fff' : 'var(--muted)',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código, magnitud o descripción..." style={{ ...INP, paddingLeft: 34 }} />
        </div>
      </div>

      {filtrado.length === 0 ? (
        <div style={EMPTY}><FlaskConical size={32} strokeWidth={1.5} /><p>No hay servicios para este filtro</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrado.map(c => (
            <div key={c.codigo} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)',
              opacity: c.activo ? 1 : 0.5,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{c.codigo} — {c.magnitud}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{c.descripcion}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>Modalidades: {c.modalidades_permitidas.map(m => MODALIDAD_LABEL[m]).join(', ') || '—'}</span>
                  <span>Proveedores: {c.proveedores_permitidos?.length ? c.proveedores_permitidos.join(', ') : 'Cualquiera'}</span>
                  {c.solo_laboratorio_externo && <span style={{ color: 'var(--red)' }}>Solo laboratorio externo</span>}
                  {c.envio_exclusivo_tcc && <span style={{ color: 'var(--red)' }}>Envío exclusivo TCC</span>}
                  {!c.activo && <span>Inactivo</span>}
                </div>
              </div>
              <IconBtn title="Editar" onClick={() => setEditando(c)}><Pencil size={14} /></IconBtn>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <ModalCatalogoItem item={editando} proveedores={proveedores} onClose={() => setEditando(null)} onSaved={onSaved} />
      )}
    </Card>
  )
}

function ModalCatalogoItem({ item, proveedores, onClose, onSaved }: { item: RvCalibrItem, proveedores: CorreoProveedor[], onClose: () => void, onSaved: () => void }) {
  const [magnitud, setMagnitud] = useState(item.magnitud)
  const [descripcion, setDescripcion] = useState(item.descripcion)
  const [modalidades, setModalidades] = useState<Set<Modalidad>>(new Set(item.modalidades_permitidas))
  const [proveedoresSel, setProveedoresSel] = useState<Set<string>>(new Set(item.proveedores_permitidos || []))
  const [soloLab, setSoloLab] = useState(item.solo_laboratorio_externo)
  const [tcc, setTcc] = useState(item.envio_exclusivo_tcc)
  const [activo, setActivo] = useState(item.activo)
  const [saving, setSaving] = useState(false)

  const toggleModalidad = (m: Modalidad) => {
    setModalidades(prev => {
      const next = new Set(prev)
      next.has(m) ? next.delete(m) : next.add(m)
      return next
    })
  }

  const toggleProveedor = (nombre: string) => {
    setProveedoresSel(prev => {
      const next = new Set(prev)
      next.has(nombre) ? next.delete(nombre) : next.add(nombre)
      return next
    })
  }

  async function submit() {
    setSaving(true)
    const { error } = await supabase.from('rv_calibr_catalogo').update({
      magnitud: magnitud.trim(), descripcion: descripcion.trim(),
      modalidades_permitidas: [...modalidades], solo_laboratorio_externo: soloLab,
      proveedores_permitidos: proveedoresSel.size ? [...proveedoresSel] : null,
      envio_exclusivo_tcc: tcc, activo,
    }).eq('codigo', item.codigo)
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Catálogo actualizado')
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Editar ${item.codigo}`} width={480}>
      <FG label="Magnitud"><input value={magnitud} onChange={e => setMagnitud(e.target.value)} style={INP} /></FG>
      <div style={{ marginTop: 14 }}>
        <FG label="Descripción"><textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} style={{ ...INP, resize: 'vertical' }} /></FG>
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)' }}>Modalidades permitidas</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          {(['laboratorio_externo', 'in_situ', 'sede_hanna_dorado'] as Modalidad[]).map(m => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={modalidades.has(m)} onChange={() => toggleModalidad(m)} /> {MODALIDAD_LABEL[m]}
            </label>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)' }}>
          Proveedores permitidos <span style={{ textTransform: 'none', fontWeight: 400 }}>(vacío = cualquiera)</span>
        </label>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          {proveedores.filter(p => p.activo).map(p => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={proveedoresSel.has(p.nombre)} onChange={() => toggleProveedor(p.nombre)} /> {p.nombre}
            </label>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={soloLab} onChange={e => setSoloLab(e.target.checked)} /> Solo se puede realizar en laboratorio externo
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={tcc} onChange={e => setTcc(e.target.checked)} /> Envío exclusivo por TCC
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} /> Activo (visible al crear órdenes)
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Guardar cambios'}</button>
      </div>
    </Modal>
  )
}

// ── Asesores ──────────────────────────────────────────────────────────────

const PLATAFORMAS_SUGERIDAS = [
  'Preferente', 'Nuevos negocios', 'Televentas', 'Canal Indirecto Y Cooperativo', 'Educación', 'Territory',
]

function AsesoresTab({ asesores, onSaved }: { asesores: Asesor[], onSaved: () => void }) {
  const [search, setSearch] = useState('')
  const [editando, setEditando] = useState<Asesor | null>(null)
  const [creando, setCreando] = useState(false)

  const filtrados = asesores.filter(a => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return a.nombre.toLowerCase().includes(q)
      || a.correo.toLowerCase().includes(q)
      || (a.plataforma || '').toLowerCase().includes(q)
  })

  return (
    <Card>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, correo o plataforma..." style={{ ...INP, paddingLeft: 34 }} />
        </div>
        <button onClick={() => setCreando(true)} style={PRI}><Plus size={14} style={{ verticalAlign: -2 }} /> Nuevo asesor</button>
      </div>

      {filtrados.length === 0 ? (
        <div style={EMPTY}><Users size={32} strokeWidth={1.5} /><p>No hay asesores para este filtro</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)',
              opacity: a.activo ? 1 : 0.5,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{a.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>{a.correo}</span>
                  {a.plataforma && <span style={B_INFO}>{a.plataforma}</span>}
                  {!a.activo && <span>Inactivo</span>}
                </div>
              </div>
              <IconBtn title="Editar" onClick={() => setEditando(a)}><Pencil size={14} /></IconBtn>
            </div>
          ))}
        </div>
      )}

      {(editando || creando) && (
        <ModalAsesor
          asesor={editando}
          onClose={() => { setEditando(null); setCreando(false) }}
          onSaved={onSaved}
        />
      )}
    </Card>
  )
}

function ModalAsesor({ asesor, onClose, onSaved }: { asesor: Asesor | null, onClose: () => void, onSaved: () => void }) {
  const [nombre, setNombre] = useState(asesor?.nombre || '')
  const [correo, setCorreo] = useState(asesor?.correo || '')
  const [plataforma, setPlataforma] = useState(asesor?.plataforma || '')
  const [activo, setActivo] = useState(asesor?.activo ?? true)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    if (!correo.trim()) { toast.error('Ingresa el correo'); return }

    setSaving(true)
    const payload = {
      nombre: nombre.trim(), correo: correo.trim().toLowerCase(),
      plataforma: plataforma.trim() || null, activo,
    }
    const { error } = asesor
      ? await supabase.from('calibraciones_asesores').update(payload).eq('id', asesor.id)
      : await supabase.from('calibraciones_asesores').insert(payload)
    setSaving(false)
    if (error) {
      toast.error(error.code === '23505' ? 'Ya existe un asesor con ese correo' : 'Error: ' + error.message)
      return
    }
    toast.success(asesor ? 'Asesor actualizado' : 'Asesor creado')
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={asesor ? `Editar ${asesor.nombre}` : 'Nuevo asesor'} width={440}>
      <FG label="Nombre"><input value={nombre} onChange={e => setNombre(e.target.value)} style={INP} autoFocus /></FG>
      <div style={{ marginTop: 14 }}>
        <FG label="Correo electrónico"><input value={correo} onChange={e => setCorreo(e.target.value)} style={INP} /></FG>
      </div>
      <div style={{ marginTop: 14 }}>
        <FG label="Plataforma">
          <input value={plataforma} onChange={e => setPlataforma(e.target.value)} list="plataformas-sugeridas" style={INP} />
          <datalist id="plataformas-sugeridas">{PLATAFORMAS_SUGERIDAS.map(p => <option key={p} value={p} />)}</datalist>
        </FG>
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} /> Activo
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : asesor ? '✓ Guardar cambios' : '+ Crear asesor'}</button>
      </div>
    </Modal>
  )
}
