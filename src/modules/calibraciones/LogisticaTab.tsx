// Pestaña "Logística": vista enfocada solo en las órdenes que están en
// tránsito con el laboratorio externo — "Para enviar" (todavía en Hanna,
// pendiente de despacho), "Enviado" (viajando hacia el proveedor) y "En
// retorno" (viajando de vuelta a Hanna). El resto del flujo (calibración en
// sitio, control de calidad, certificados…) no le compete a logística, así
// que se deja por fuera para no repetir el ruido de la lista de Órdenes.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Package, AlertTriangle, Inbox, Plus, Trash2, UserCog, Copy, Link2, X, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { useUser } from '../../hooks/useUser'
import {
  grupoEstado, ESTADO_LABEL, estaVencido, proximoAVencer, fechaObjetivo, descripcionSemaforo,
  usePendientesLogistica, usePendientesLogisticaOrdenes, useAsesores, useInvalidateCalibraciones,
} from './hooks/useCalibraciones'
import { FG, IconBtn, INP, PRI, GHOST, B_INFO, B_VENCIDA, B_PROXIMA, B_SUGERIDA, GRUPO_COLOR, EMPTY, fmtFecha, fechaLocalISO } from './ui'
import {
  linkOtst, parseOtstCodes, parseNumeroOC,
  sugerirOrdenesParaPendiente, esCoincidenciaFuerte, SENAL_LABEL, type SugerenciaOrden,
} from './vistas/CamposCompartidos'
import type { Asesor, LogisticaPendiente, OrdenCalibracion } from '../../types'

// Arma el mensaje de seguimiento para un pendiente ya gestionado (asesor
// asignado) — misma lógica que la fórmula de Notion que se usaba antes.
function generarMensajePendiente(p: LogisticaPendiente, nombreAsesor: string | null): string {
  const partes: string[] = []
  if (p.remision) partes.push(`la RMV ${p.remision}`)
  if (p.factura) partes.push(`la FV ${p.factura}`)
  const pendientesTexto = partes.join(' y ')

  const textoOtst = p.otst ? ` relacionada a la OTST ${p.otst}` : ''
  const textoObs = p.observaciones ? `. ${p.observaciones}` : ''

  return 'Hola, buen día ' +
    (nombreAsesor ? `${nombreAsesor} ` : '') +
    'tengo pendiente de gestión de calibración' +
    (p.cliente ? ` del cliente ${p.cliente}` : '') +
    ' ' +
    (pendientesTexto ? `con ${pendientesTexto}` : 'un caso') +
    textoOtst +
    textoObs
}

const ESTADOS_LOGISTICA: OrdenCalibracion['estado'][] = ['para_enviar', 'enviado', 'en_retorno']

type FiltroEstadoLogistica = 'todas' | 'para_enviar' | 'enviado' | 'en_retorno'

const FILTRO_ESTADO_OPCIONES: [FiltroEstadoLogistica, string][] = [
  ['todas', 'Todas'],
  ['para_enviar', 'Para enviar'],
  ['enviado', 'Enviadas'],
  ['en_retorno', 'En retorno'],
]

function porNumeroOCDesc(a: OrdenCalibracion, b: OrdenCalibracion): number {
  const pa = parseNumeroOC(a.numero_oc)
  const pb = parseNumeroOC(b.numero_oc)
  if (pa.anio !== pb.anio) return pb.anio.localeCompare(pa.anio)
  return (parseInt(pb.numero, 10) || 0) - (parseInt(pa.numero, 10) || 0)
}

export function LogisticaTab({ ordenes }: { ordenes: OrdenCalibracion[] }) {
  const navigate = useNavigate()
  const { hasCapability } = useUser()
  const puedeEditar = hasCapability('calibraciones_editar')
  const { data: pendientes = [] } = usePendientesLogistica()
  const { data: enlaces = [] } = usePendientesLogisticaOrdenes()
  const { data: asesores = [] } = useAsesores()
  const invalidate = useInvalidateCalibraciones()
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoLogistica>('todas')
  const [agregandoPendiente, setAgregandoPendiente] = useState(false)
  const [gestionando, setGestionando] = useState<LogisticaPendiente | null>(null)
  const [enlazando, setEnlazando] = useState<LogisticaPendiente | null>(null)
  const [verEnlazadas, setVerEnlazadas] = useState(false)

  async function eliminarPendiente(id: string) {
    if (!confirm('¿Eliminar este pendiente?')) return
    const { error } = await supabase.from('calibraciones_logistica_pendientes').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Pendiente eliminado')
    invalidate.pendientesLogistica()
  }

  async function desenlazarOrden(pendienteId: string, ordenId: string) {
    const { error } = await supabase.from('calibraciones_logistica_pendientes_ordenes')
      .delete().eq('pendiente_id', pendienteId).eq('orden_id', ordenId)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Orden desenlazada')
    invalidate.pendientesLogisticaOrdenes()
  }

  function copiarMensaje(p: LogisticaPendiente) {
    const nombreAsesor = asesores.find(a => a.correo.toLowerCase() === (p.correo_asesor || '').toLowerCase())?.nombre ?? null
    const texto = generarMensajePendiente(p, nombreAsesor)
    navigator.clipboard.writeText(texto).then(() => toast.success('Mensaje copiado al portapapeles'))
  }

  // Órdenes enlazadas por pendiente — un pendiente con al menos una orden
  // enlazada ya no cuenta como "por procesar".
  const ordenesPorPendiente = new Map<string, OrdenCalibracion[]>()
  for (const e of enlaces) {
    const orden = ordenes.find(o => o.id === e.orden_id)
    if (!orden) continue
    if (!ordenesPorPendiente.has(e.pendiente_id)) ordenesPorPendiente.set(e.pendiente_id, [])
    ordenesPorPendiente.get(e.pendiente_id)!.push(orden)
  }

  const pendientesPorProcesar = pendientes.filter(p => !ordenesPorPendiente.has(p.id))
  const pendientesEnlazados = pendientes.filter(p => ordenesPorPendiente.has(p.id))
  const pendientesMostrados = verEnlazadas ? pendientesEnlazados : pendientesPorProcesar

  // Sugerencias de enlace (comparando Cliente/Remisión/Factura/OTST) — solo
  // para lo que todavía está "por procesar", nunca se resalta nada ya
  // enlazado. Resaltar, no enlazar: el logístico siempre confirma a mano.
  const sugerenciasPorPendiente = new Map<string, SugerenciaOrden[]>()
  for (const p of pendientesPorProcesar) {
    const excluirIds = new Set((ordenesPorPendiente.get(p.id) || []).map(o => o.id))
    sugerenciasPorPendiente.set(p.id, sugerirOrdenesParaPendiente(p, ordenes, excluirIds))
  }

  const ordenesLogistica = ordenes
    .filter(o => ESTADOS_LOGISTICA.includes(o.estado) && !o.anulada)
    .sort(porNumeroOCDesc)

  const ordenesFiltradas = filtroEstado === 'todas'
    ? ordenesLogistica
    : ordenesLogistica.filter(o => o.estado === filtroEstado)

  const porEnviar = ordenesLogistica.filter(o => o.estado === 'para_enviar').length
  const enviadas = ordenesLogistica.filter(o => o.estado === 'enviado').length
  const enRetorno = ordenesLogistica.filter(o => o.estado === 'en_retorno').length

  const columnas: Column<OrdenCalibracion>[] = [
    {
      key: 'cliente', header: 'Cliente',
      render: o => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{o.cliente}</div>
          {o.numero_oc && <div style={{ marginTop: 3 }}><span style={B_INFO}>{o.numero_oc}</span></div>}
        </div>
      ),
    },
    {
      key: 'estado', header: 'Estado', width: '130px',
      render: o => {
        const c = GRUPO_COLOR[grupoEstado(o.estado)]
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20,
            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
            background: c.bg, color: c.text, border: `1px solid ${c.border}`,
          }}>{ESTADO_LABEL[o.estado]}</span>
        )
      },
    },
    {
      key: 'proveedor', header: 'Proveedor', width: '150px',
      render: o => o.proveedor
        ? <span style={{ fontSize: 12 }}>{o.proveedor}</span>
        : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'rmv', header: 'RMV/FV', width: '110px',
      render: o => o.rmv_fv
        ? <span style={{ fontSize: 12 }}>{o.rmv_fv}</span>
        : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'otst', header: 'OTST', width: '150px',
      render: o => {
        const codigos = parseOtstCodes(o.otst)
        if (!codigos.length) return <span style={{ color: 'var(--muted)' }}>—</span>
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} onClick={e => e.stopPropagation()}>
            {codigos.map(codigo => (
              <a key={codigo} href={linkOtst(codigo)!} target="_blank" rel="noopener noreferrer" style={{
                fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--mono)',
              }}>{codigo} ↗</a>
            ))}
          </div>
        )
      },
    },
    {
      key: 'vencimiento', header: 'Estado del tránsito', width: '220px',
      render: o => {
        const vencida = estaVencido(o)
        const proxima = proximoAVencer(o)
        const descripcion = descripcionSemaforo(o)
        const objetivo = fechaObjetivo(o)
        const hayAlerta = vencida || proxima
        return (
          <div>
            {hayAlerta && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: objetivo ? 3 : 0 }}>
                {vencida && <span style={B_VENCIDA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{descripcion}</span>}
                {!vencida && proxima && <span style={B_PROXIMA}><AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{descripcion}</span>}
              </div>
            )}
            {objetivo && (
              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: vencida ? 'var(--red)' : 'var(--muted)' }}>
                {fmtFecha(objetivo)}
              </span>
            )}
            {!hayAlerta && !objetivo && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{descripcion || '—'}</span>}
          </div>
        )
      },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{porEnviar}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.8px' }}>Para enviar</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{enviadas}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.8px' }}>Enviadas</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--yellow, #ca8a04)' }}>{enRetorno}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.8px' }}>En retorno</div>
        </div>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, flexWrap: 'wrap', width: 'fit-content' }}>
            {FILTRO_ESTADO_OPCIONES.map(([v, label]) => (
              <button key={v} onClick={() => setFiltroEstado(v)} style={{
                padding: '6px 12px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                fontWeight: filtroEstado === v ? 600 : 500, fontFamily: 'var(--sans)',
                background: filtroEstado === v ? 'var(--accent)' : 'transparent',
                color: filtroEstado === v ? '#fff' : 'var(--muted)',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {ordenesFiltradas.length === 0 ? (
          <div style={EMPTY}>
            <Package size={32} strokeWidth={1.5} />
            <p>{ordenesLogistica.length === 0 ? 'No hay órdenes en tránsito con el laboratorio en este momento' : 'No hay órdenes para este filtro'}</p>
          </div>
        ) : (
          <Table
            columns={columnas}
            data={ordenesFiltradas}
            keyExtractor={o => o.id}
            onRowClick={o => navigate(`/calibraciones/${o.id}`)}
            rowStyle={o => estaVencido(o) ? { background: 'var(--red-bg)' } : proximoAVencer(o) ? { background: 'var(--yellow-bg)' } : undefined}
          />
        )}
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <Inbox size={13} /> {verEnlazadas ? 'Pendientes enlazados' : 'Pendientes por procesar'}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {pendientesEnlazados.length > 0 && (
              <button onClick={() => setVerEnlazadas(v => !v)} style={GHOST}>
                {verEnlazadas ? '← Ver pendientes' : `Ver enlazados (${pendientesEnlazados.length})`}
              </button>
            )}
            {puedeEditar && (
              <button onClick={() => setAgregandoPendiente(true)} style={PRI}><Plus size={14} style={{ verticalAlign: -2 }} /> Agregar pendiente</button>
            )}
          </div>
        </div>

        {pendientesMostrados.length === 0 ? (
          <div style={EMPTY}>
            <Inbox size={32} strokeWidth={1.5} />
            <p>{verEnlazadas ? 'No hay pendientes enlazados todavía' : 'No hay remisiones o facturas pendientes por procesar'}</p>
          </div>
        ) : (
          <Table
            columns={columnasPendientes({
              puedeEditar, asesores, ordenesPorPendiente, verEnlazadas, sugerenciasPorPendiente,
              onGestionar: setGestionando, onEnlazar: setEnlazando, onCopiar: copiarMensaje,
              onEliminar: eliminarPendiente, onDesenlazar: desenlazarOrden,
            })}
            data={pendientesMostrados}
            keyExtractor={p => p.id}
            rowStyle={p => {
              const sugerencias = sugerenciasPorPendiente.get(p.id) || []
              return sugerencias.some(s => esCoincidenciaFuerte(s.senales)) ? { background: 'var(--green-bg, #dcfce7)' } : undefined
            }}
          />
        )}
      </Card>

      {agregandoPendiente && (
        <ModalNuevoPendiente onClose={() => setAgregandoPendiente(false)} onSaved={invalidate.pendientesLogistica} />
      )}

      {gestionando && (
        <ModalGestionarPendiente
          pendiente={gestionando}
          asesores={asesores}
          onClose={() => setGestionando(null)}
          onSaved={invalidate.pendientesLogistica}
        />
      )}

      {enlazando && (
        <ModalEnlazarPendiente
          pendiente={enlazando}
          ordenes={ordenes}
          yaEnlazadas={ordenesPorPendiente.get(enlazando.id) || []}
          onClose={() => setEnlazando(null)}
          onSaved={invalidate.pendientesLogisticaOrdenes}
        />
      )}
    </div>
  )
}

function columnasPendientes({ puedeEditar, asesores, ordenesPorPendiente, verEnlazadas, sugerenciasPorPendiente, onGestionar, onEnlazar, onCopiar, onEliminar, onDesenlazar }: {
  puedeEditar: boolean
  asesores: Asesor[]
  ordenesPorPendiente: Map<string, OrdenCalibracion[]>
  verEnlazadas: boolean
  sugerenciasPorPendiente: Map<string, SugerenciaOrden[]>
  onGestionar: (p: LogisticaPendiente) => void
  onEnlazar: (p: LogisticaPendiente) => void
  onCopiar: (p: LogisticaPendiente) => void
  onEliminar: (id: string) => void
  onDesenlazar: (pendienteId: string, ordenId: string) => void
}): Column<LogisticaPendiente>[] {
  const columnas: Column<LogisticaPendiente>[] = [
    {
      key: 'cliente', header: 'Cliente',
      render: p => {
        const sugerencias = (sugerenciasPorPendiente.get(p.id) || []).filter(s => esCoincidenciaFuerte(s.senales))
        const mejor = sugerencias[0]
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{p.cliente}</span>
            {mejor && (
              <span
                style={B_SUGERIDA}
                title={`Coincide con ${mejor.orden.numero_oc || mejor.orden.cliente} por: ${mejor.senales.map(s => SENAL_LABEL[s]).join(', ')}${sugerencias.length > 1 ? ` (+${sugerencias.length - 1} más)` : ''}`}
                onClick={e => { e.stopPropagation(); onEnlazar(p) }}
              >
                ✓ Posible match — {mejor.orden.numero_oc || mejor.orden.cliente}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'factura', header: 'Factura', width: '140px',
      render: p => p.factura ? <span style={{ fontSize: 12 }}>{p.factura}</span> : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'remision', header: 'Remisión', width: '140px',
      render: p => p.remision ? <span style={{ fontSize: 12 }}>{p.remision}</span> : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'otst', header: 'OTST', width: '150px',
      render: p => {
        const codigos = parseOtstCodes(p.otst)
        if (!codigos.length) return <span style={{ color: 'var(--muted)' }}>—</span>
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {codigos.map(codigo => (
              <a key={codigo} href={linkOtst(codigo)!} target="_blank" rel="noopener noreferrer" style={{
                fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--mono)',
              }}>{codigo} ↗</a>
            ))}
          </div>
        )
      },
    },
    {
      key: 'fecha', header: 'Ingresado', width: '110px',
      render: p => <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{fmtFecha(fechaLocalISO(p.created_at))}</span>,
    },
    {
      key: 'asesor', header: 'Asesor', width: '170px',
      render: p => {
        if (!p.correo_asesor) return <span style={{ color: 'var(--muted)' }}>Sin gestionar</span>
        const nombre = asesores.find(a => a.correo.toLowerCase() === p.correo_asesor!.toLowerCase())?.nombre
        return <span style={{ fontSize: 12 }}>{nombre || p.correo_asesor}</span>
      },
    },
  ]

  if (verEnlazadas) {
    columnas.push({
      key: 'ordenes', header: 'Órdenes enlazadas', width: '220px',
      render: p => {
        const vinculadas = ordenesPorPendiente.get(p.id) || []
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {vinculadas.map(o => (
              <span key={o.id} style={{ ...B_INFO, gap: 5 }}>
                {o.numero_oc || o.cliente}
                {puedeEditar && (
                  <button onClick={() => onDesenlazar(p.id, o.id)} title="Desenlazar" style={{
                    background: 'none', border: 'none', padding: 0, marginLeft: 2, cursor: 'pointer',
                    color: 'inherit', display: 'inline-flex', alignItems: 'center',
                  }}>
                    <X size={10} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )
      },
    })
  }

  if (puedeEditar) {
    columnas.push({
      key: 'acciones', header: '', width: '140px', align: 'center',
      render: p => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <IconBtn title={p.correo_asesor ? 'Editar gestión' : 'Gestionar'} onClick={() => onGestionar(p)}><UserCog size={14} /></IconBtn>
          <IconBtn title="Enlazar con orden(es)" onClick={() => onEnlazar(p)}><Link2 size={14} /></IconBtn>
          {p.correo_asesor && (
            <IconBtn title="Copiar mensaje" onClick={() => onCopiar(p)}><Copy size={14} /></IconBtn>
          )}
          <button onClick={() => onEliminar(p.id)} title="Eliminar" style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', borderRadius: 6, flexShrink: 0,
          }}>
            <Trash2 size={13} />
          </button>
        </div>
      ),
    })
  }

  return columnas
}

function ModalNuevoPendiente({ onClose, onSaved }: { onClose: () => void, onSaved: () => void }) {
  const { user } = useUser()
  const [cliente, setCliente] = useState('')
  const [factura, setFactura] = useState('')
  const [remision, setRemision] = useState('')
  const [otst, setOtst] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!cliente.trim()) { toast.error('Ingresa la razón social del cliente'); return }
    if (!factura.trim() && !remision.trim()) { toast.error('Ingresa al menos la factura o la remisión'); return }

    setSaving(true)
    const { error } = await supabase.from('calibraciones_logistica_pendientes').insert({
      cliente: cliente.trim().toUpperCase(),
      factura: factura.trim() || null,
      remision: remision.trim() || null,
      otst: otst.trim() || null,
      creado_por: user?.id ?? null,
    })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Pendiente agregado')
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Nuevo pendiente" width={420}>
      <FG label="Razón social del cliente" required>
        <input value={cliente} onChange={e => setCliente(e.target.value)} style={INP} autoFocus />
      </FG>
      <div style={{ marginTop: 14, display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <FG label="Factura"><input value={factura} onChange={e => setFactura(e.target.value)} style={INP} /></FG>
        </div>
        <div style={{ flex: 1 }}>
          <FG label="Remisión"><input value={remision} onChange={e => setRemision(e.target.value)} style={INP} /></FG>
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Debes ingresar al menos una de las dos.</p>
      <div style={{ marginTop: 14 }}>
        <FG label="OTST"><input value={otst} onChange={e => setOtst(e.target.value)} style={INP} /></FG>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '+ Agregar'}</button>
      </div>
    </Modal>
  )
}

function ModalGestionarPendiente({ pendiente, asesores, onClose, onSaved }: {
  pendiente: LogisticaPendiente
  asesores: Asesor[]
  onClose: () => void
  onSaved: () => void
}) {
  const [correoAsesor, setCorreoAsesor] = useState(pendiente.correo_asesor || '')
  const [observaciones, setObservaciones] = useState(pendiente.observaciones || '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!correoAsesor) { toast.error('Selecciona el asesor comercial'); return }
    setSaving(true)
    const { error } = await supabase.from('calibraciones_logistica_pendientes').update({
      correo_asesor: correoAsesor,
      observaciones: observaciones.trim() || null,
    }).eq('id', pendiente.id)
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Pendiente gestionado')
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Gestionar — ${pendiente.cliente}`} width={440}>
      <FG label="Asesor(a) comercial" required>
        <select value={correoAsesor} onChange={e => setCorreoAsesor(e.target.value)} style={INP}>
          <option value="">Selecciona un asesor(a)…</option>
          {asesores.filter(a => a.activo).map(a => (
            <option key={a.id} value={a.correo}>{a.nombre}{a.plataforma ? ` — ${a.plataforma}` : ''}</option>
          ))}
        </select>
      </FG>
      <div style={{ marginTop: 14 }}>
        <FG label="Observaciones">
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} style={{ ...INP, resize: 'vertical' }} />
        </FG>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Guardar'}</button>
      </div>
    </Modal>
  )
}

function ModalEnlazarPendiente({ pendiente, ordenes, yaEnlazadas, onClose, onSaved }: {
  pendiente: LogisticaPendiente
  ordenes: OrdenCalibracion[]
  yaEnlazadas: OrdenCalibracion[]
  onClose: () => void
  onSaved: () => void
}) {
  const [search, setSearch] = useState('')
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const yaEnlazadasIds = new Set(yaEnlazadas.map(o => o.id))
  // Mismas señales que resaltan la fila en la tabla — aquí solo se usan para
  // ordenar la candidata sugerida al principio y marcarla, nunca para
  // pre-seleccionarla: el logístico siempre confirma la casilla a mano.
  const senalesPorOrden = new Map(
    sugerirOrdenesParaPendiente(pendiente, ordenes, yaEnlazadasIds)
      .filter(s => esCoincidenciaFuerte(s.senales))
      .map(s => [s.orden.id, s.senales])
  )
  const q = search.toLowerCase().trim()
  const filtradas = ordenes
    .filter(o => !yaEnlazadasIds.has(o.id))
    .filter(o => !q || (o.cliente || '').toLowerCase().includes(q) || (o.numero_oc || '').toLowerCase().includes(q))
    .sort((a, b) => (senalesPorOrden.has(b.id) ? 1 : 0) - (senalesPorOrden.has(a.id) ? 1 : 0))
    .slice(0, 50)

  function toggle(id: string) {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function submit() {
    if (seleccionadas.size === 0) { toast.error('Selecciona al menos una orden'); return }
    setSaving(true)
    const { error } = await supabase.from('calibraciones_logistica_pendientes_ordenes')
      .insert([...seleccionadas].map(ordenId => ({ pendiente_id: pendiente.id, orden_id: ordenId })))
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`Enlazado con ${seleccionadas.size} orden${seleccionadas.size !== 1 ? 'es' : ''}`)
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Enlazar — ${pendiente.cliente}`} width={480}>
      {yaEnlazadas.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Ya enlazado con: {yaEnlazadas.map(o => o.numero_oc || o.cliente).join(', ')}
        </p>
      )}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente o N° OC..." style={{ ...INP, paddingLeft: 34 }} autoFocus />
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtradas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Sin resultados</p>
        ) : filtradas.map(o => {
          const senales = senalesPorOrden.get(o.id)
          return (
          <label key={o.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${seleccionadas.has(o.id) ? 'var(--accent)' : senales ? 'var(--green-border, #86efac)' : 'var(--border)'}`,
            background: seleccionadas.has(o.id) ? 'var(--accent-bg)' : 'var(--surface2)',
          }}>
            <input type="checkbox" checked={seleccionadas.has(o.id)} onChange={() => toggle(o.id)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {o.cliente}
                {senales && (
                  <span style={{ ...B_SUGERIDA, cursor: 'default' }} title={`Coincide por: ${senales.map(s => SENAL_LABEL[s]).join(', ')}`}>
                    Sugerida
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{o.numero_oc || '—'} · {ESTADO_LABEL[o.estado]}</div>
            </div>
          </label>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={saving || seleccionadas.size === 0} style={PRI}>
          {saving ? 'Guardando…' : `Enlazar (${seleccionadas.size})`}
        </button>
      </div>
    </Modal>
  )
}
