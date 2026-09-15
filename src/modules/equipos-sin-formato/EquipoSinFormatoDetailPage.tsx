import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { useUser } from '../../hooks/useUser'
import { useAsesores } from '../calibraciones/hooks/useCalibraciones'
import {
  useEquiposSinFormato, useEquiposSinFormatoItems, useInvalidateEquiposSinFormato,
  crearEquipoSinFormato, avanzarEquipoSinFormato, ESTADO_LABEL_SF,
} from './hooks/useEquiposSinFormato'
import { generarMailtoSinFormato } from './correo'
import { VistaPendiente } from './vistas/VistaPendiente'
import { VistaPreingresado } from './vistas/VistaPreingresado'
import { VistaIngresado } from './vistas/VistaIngresado'
import { LineaTiempoSF } from './LineaTiempoSF'
import { FG, INP, PRI, GHOST } from './ui'
import type { EquipoSinFormatoItem } from '../../types'

interface ItemForm { referencia: string, serial: string, observaciones: string }
const ITEM_VACIO: ItemForm = { referencia: '', serial: '', observaciones: '' }

export function EquipoSinFormatoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, hasCapability } = useUser()
  const puedeEditar = hasCapability('equipos_sin_formato_editar')
  const esNueva = id === 'nueva'

  const { data: registros = [], isLoading } = useEquiposSinFormato()
  const { data: allItems = [] } = useEquiposSinFormatoItems()
  const { data: asesores = [] } = useAsesores()
  const invalidate = useInvalidateEquiposSinFormato()

  const registro = esNueva ? undefined : registros.find(r => r.id === id)
  const items = registro ? allItems.filter(i => i.equipo_sf_id === registro.id) : []
  const asesorNombre = registro ? (asesores.find(a => a.correo === registro.asesor_correo)?.nombre || registro.asesor_correo) : ''

  // ── Formulario de creación ──────────────────────────────────────────────
  const [razonSocial, setRazonSocial] = useState('')
  const [fechaLlegada, setFechaLlegada] = useState(new Date().toISOString().slice(0, 10))
  const [modoLlegada, setModoLlegada] = useState('')
  const [asesorCorreo, setAsesorCorreo] = useState('')
  const [itemsForm, setItemsForm] = useState<ItemForm[]>([ITEM_VACIO])
  const [saving, setSaving] = useState(false)

  function actualizarItem(i: number, campo: keyof ItemForm, valor: string) {
    setItemsForm(prev => prev.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it))
  }
  function agregarItem() {
    setItemsForm(prev => [...prev, ITEM_VACIO])
  }
  function quitarItem(i: number) {
    setItemsForm(prev => prev.filter((_, idx) => idx !== i))
  }

  async function crear() {
    if (!razonSocial.trim()) { toast.error('Ingresa la razón social'); return }
    if (!fechaLlegada) { toast.error('Ingresa la fecha de llegada'); return }
    if (!modoLlegada.trim()) { toast.error('Ingresa el modo de llegada'); return }
    if (!asesorCorreo) { toast.error('Selecciona el asesor'); return }
    if (itemsForm.some(it => !it.referencia.trim() || !it.serial.trim())) {
      toast.error('Completa la referencia y el serial de todos los equipos')
      return
    }

    setSaving(true)
    const { data, error } = await crearEquipoSinFormato(
      { razon_social: razonSocial.trim(), fecha_llegada: fechaLlegada, modo_llegada: modoLlegada.trim(), asesor_correo: asesorCorreo, creado_por: user?.id || null },
      itemsForm,
    )
    setSaving(false)
    if (error || !data) { toast.error('Error: ' + error?.message); return }

    toast.success('Registro creado')
    invalidate()
    window.location.href = generarMailtoSinFormato(data, itemsForm, asesorCorreo)
    navigate(`/equipos-sin-formato/${data.id}`, { replace: true })
  }

  async function onAvanzar(overrides: Record<string, unknown>) {
    if (!registro) return
    const { error } = await avanzarEquipoSinFormato(registro.id, overrides)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Estado actualizado')
    invalidate()
  }

  function reenviarCorreo() {
    if (!registro) return
    window.location.href = generarMailtoSinFormato(registro, items.map(it => ({ referencia: it.referencia, serial: it.serial || '', observaciones: it.observaciones || '' })), registro.asesor_correo)
  }

  if (!esNueva && isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
  }
  if (!esNueva && !registro) {
    return <Card><p style={{ color: 'var(--muted)' }}>Registro no encontrado.</p></Card>
  }

  return (
    <div>
      <button onClick={() => navigate('/equipos-sin-formato')} style={{ ...GHOST, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={14} /> Volver
      </button>

      {esNueva ? (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Nuevo registro — Equipo Sin Formato</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FG label="Razón social" required>
              <input value={razonSocial} onChange={e => setRazonSocial(e.target.value.toUpperCase())} placeholder="Ej. PINTURAS DAVINCI S.A.S." style={INP} autoFocus />
            </FG>
            <FG label="Asesor" required>
              <select value={asesorCorreo} onChange={e => setAsesorCorreo(e.target.value)} style={INP}>
                <option value="">Selecciona...</option>
                {asesores.map(a => <option key={a.id} value={a.correo}>{a.nombre}{a.plataforma ? ` — ${a.plataforma}` : ''}</option>)}
              </select>
            </FG>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <FG label="Fecha de llegada" required>
              <input type="date" value={fechaLlegada} onChange={e => setFechaLlegada(e.target.value)} style={INP} />
            </FG>
            <FG label="Modo de llegada" required>
              <input value={modoLlegada} onChange={e => setModoLlegada(e.target.value)} placeholder="Ej. Guía TCC #12314221, dejado en bodega por el cliente..." style={INP} />
            </FG>
          </div>

          <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginTop: 24, marginBottom: 14 }}>
            Equipos
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {itemsForm.map((it, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--surface2)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FG label="Referencia" required>
                    <input value={it.referencia} onChange={e => actualizarItem(i, 'referencia', e.target.value.toUpperCase())} placeholder="Ej. HI2620" style={INP} />
                  </FG>
                  <FG label="Serial" required>
                    <input value={it.serial} onChange={e => actualizarItem(i, 'serial', e.target.value.toUpperCase())} placeholder="Ej. C0107019" style={INP} />
                  </FG>
                </div>
                <div style={{ marginTop: 12 }}>
                  <FG label="Observaciones">
                    <input value={it.observaciones} onChange={e => actualizarItem(i, 'observaciones', e.target.value)} placeholder="Opcional..." style={INP} />
                  </FG>
                </div>
                {itemsForm.length > 1 && (
                  <button onClick={() => quitarItem(i)} style={{ ...GHOST, marginTop: 10, color: 'var(--red)', padding: '6px 12px', fontSize: 12 }}>
                    <Trash2 size={12} style={{ verticalAlign: -2, marginRight: 4 }} /> Quitar equipo
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={agregarItem} style={{ ...GHOST, marginTop: 12 }}><Plus size={13} style={{ verticalAlign: -2 }} /> Agregar otro equipo</button>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button onClick={() => navigate('/equipos-sin-formato')} style={GHOST}>Cancelar</button>
            <button onClick={crear} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '+ Crear y notificar'}</button>
          </div>
        </Card>
      ) : registro && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 700 }}>SF-{registro.numero} — {ESTADO_LABEL_SF[registro.estado]}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{registro.razon_social}</h3>
              </div>
              {puedeEditar && registro.estado === 'pendiente' && (
                <button onClick={reenviarCorreo} style={GHOST}>✉ Reenviar correo</button>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>Asesor: <strong>{asesorNombre}</strong></span>
              <span>Fecha de llegada: <strong>{registro.fecha_llegada}</strong></span>
              {registro.modo_llegada && <span>Modo de llegada: <strong>{registro.modo_llegada}</strong></span>}
            </div>
          </Card>

          <Card>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>Equipos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((it: EquipoSinFormatoItem) => (
                <div key={it.id} style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface2)', fontSize: 12.5 }}>
                  <strong>{it.referencia}</strong>{it.serial && <> — Serial: <span style={{ fontFamily: 'var(--mono)' }}>{it.serial}</span></>}
                  {it.observaciones && <div style={{ color: 'var(--muted)', marginTop: 4 }}>{it.observaciones}</div>}
                </div>
              ))}
            </div>
          </Card>

          <LineaTiempoSF registro={registro} />

          {registro.estado === 'pendiente' ? (
            <VistaPendiente registro={registro} puedeEditar={puedeEditar} onAvanzar={onAvanzar} />
          ) : registro.estado === 'preingresado' ? (
            <VistaPreingresado registro={registro} puedeEditar={puedeEditar} onAvanzar={onAvanzar} />
          ) : registro.estado === 'ingresado' ? (
            <VistaIngresado registro={registro} />
          ) : null}
        </div>
      )}
    </div>
  )
}
