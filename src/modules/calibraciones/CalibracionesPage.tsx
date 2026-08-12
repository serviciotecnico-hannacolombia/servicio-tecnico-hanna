import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Pencil, FlaskConical, AlertTriangle, Search, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { useUser } from '../../hooks/useUser'
import {
  useOrdenesCalibracion, useCatalogoRvCalibr, useInvalidateCalibraciones,
  grupoEstado, ESTADO_LABEL, MODALIDAD_LABEL, estaVencido, proximoAVencer, fechaLimite,
} from './hooks/useCalibraciones'
import {
  FG, IconBtn, Stat, INP, PRI, GHOST, B_INFO, B_VENCIDA, B_PROXIMA, B_NOVEDAD,
  GRUPO_COLOR, EMPTY, fmtFecha, fmtCOP,
} from './ui'
import type { Modalidad, RvCalibrItem } from '../../types'

type VistaFiltro = 'activas' | 'vencidas' | 'completadas' | 'todas'

export function CalibracionesPage() {
  const navigate = useNavigate()
  const { hasCapability } = useUser()
  const puedeEditar = hasCapability('calibraciones_editar')
  const { data: ordenes = [], isLoading } = useOrdenesCalibracion()
  const { data: catalogo = [] } = useCatalogoRvCalibr()
  const invalidate = useInvalidateCalibraciones()

  const [tab, setTab] = useState<'ordenes' | 'catalogo'>('ordenes')
  const [vista, setVista] = useState<VistaFiltro>('activas')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const PAGE_SIZE = 30

  const filtered = ordenes
    .filter(o => {
      if (vista === 'todas') return true
      if (vista === 'completadas') return grupoEstado(o.estado) === 'completado'
      if (vista === 'vencidas') return estaVencido(o)
      return grupoEstado(o.estado) !== 'completado'
    })
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
  const completadasCount = ordenes.filter(o => grupoEstado(o.estado) === 'completado').length

  return (
    <div>
      <Header
        title="Calibraciones"
        subtitle="Gestión de calibración acreditada ONAC — reemplaza el seguimiento en Notion"
        actions={puedeEditar ? <button onClick={() => navigate('/calibraciones/nueva')} style={PRI}><Plus size={14} style={{ verticalAlign: -2 }} /> Nueva orden</button> : undefined}
      />

      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 20, maxWidth: 360 }}>
        {(['ordenes', ...(puedeEditar ? ['catalogo'] as const : [])] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 14px', border: 'none', borderRadius: 9,
            background: tab === t ? 'var(--accent)' : 'transparent',
            color: tab === t ? '#fff' : 'var(--muted)',
            fontFamily: 'var(--sans)', fontSize: '0.85rem', fontWeight: tab === t ? 700 : 500,
            cursor: 'pointer', transition: 'all .18s',
          }}>{t === 'ordenes' ? 'Órdenes' : 'Catálogo RV CALIBR'}</button>
        ))}
      </div>

      {tab === 'ordenes' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            <Stat label="Pendientes" value={pendientesCount} color="var(--muted)" />
            <Stat label="En curso" value={enCursoCount} color="var(--accent)" />
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
                          {vencida && <span style={B_VENCIDA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Vencida</span>}
                          {!vencida && proxima && <span style={B_PROXIMA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Próxima a vencer</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {o.correo_asesor && <span>Asesor: <strong>{o.correo_asesor}</strong></span>}
                          {o.proveedor && <span>Proveedor: <strong>{o.proveedor}</strong></span>}
                          <span>Fecha límite: <strong style={{ color: vencida ? 'var(--red)' : undefined }}>{fmtFecha(fechaLimite(o))}</strong></span>
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
      ) : (
        <CatalogoTab catalogo={catalogo} onSaved={invalidate.catalogo} />
      )}
    </div>
  )
}

// ── Catálogo RV CALIBR ───────────────────────────────────────────────────────

function CatalogoTab({ catalogo, onSaved }: { catalogo: RvCalibrItem[], onSaved: () => void }) {
  const [editando, setEditando] = useState<RvCalibrItem | null>(null)

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {catalogo.map(c => (
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
                {c.solo_laboratorio_externo && <span style={{ color: 'var(--red)' }}>Solo laboratorio externo</span>}
                {c.envio_exclusivo_tcc && <span style={{ color: 'var(--red)' }}>Envío exclusivo TCC</span>}
                {!c.activo && <span>Inactivo</span>}
              </div>
            </div>
            <IconBtn title="Editar" onClick={() => setEditando(c)}><Pencil size={14} /></IconBtn>
          </div>
        ))}
      </div>

      {editando && (
        <ModalCatalogoItem item={editando} onClose={() => setEditando(null)} onSaved={onSaved} />
      )}
    </Card>
  )
}

function ModalCatalogoItem({ item, onClose, onSaved }: { item: RvCalibrItem, onClose: () => void, onSaved: () => void }) {
  const [magnitud, setMagnitud] = useState(item.magnitud)
  const [descripcion, setDescripcion] = useState(item.descripcion)
  const [modalidades, setModalidades] = useState<Set<Modalidad>>(new Set(item.modalidades_permitidas))
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

  async function submit() {
    setSaving(true)
    const { error } = await supabase.from('rv_calibr_catalogo').update({
      magnitud: magnitud.trim(), descripcion: descripcion.trim(),
      modalidades_permitidas: [...modalidades], solo_laboratorio_externo: soloLab,
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
