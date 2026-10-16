// Ruta sin stock: primero se solicita la NV por correo (borrador para
// copiar) y se registra el N° de requerimiento SACI; cuando la NV existe,
// se registra con la que se aparta el stock de la importación y una fecha
// de seguimiento (la que muestra el semáforo).
import { useState } from 'react'
import { toast } from 'sonner'
import { FileText, Copy, Mail, CheckCircle2, ExternalLink, Pencil, AlertTriangle } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { BannerEstado, FG, INP, PRI, GHOST, CARD_TITULO } from '../ui'
import { linkRequerimientoNv, textoSolicitudNv } from '../hooks/useGarantias'
import type { VistaProps } from './tipos'

const BTN_COPIAR: React.CSSProperties = { ...GHOST, padding: '7px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }

function copiar(texto: string, mensaje: string) {
  navigator.clipboard.writeText(texto)
    .then(() => toast.success(mensaje))
    .catch(() => toast.error('No se pudo copiar al portapapeles'))
}

export function VistaNV({ garantia, puedeEditar, soloLectura, onActualizar }: VistaProps) {
  const [nv, setNv] = useState(garantia.numero_nv || '')
  const [fechaSeg, setFechaSeg] = useState(garantia.fecha_seguimiento || '')
  const [guardando, setGuardando] = useState(false)
  const [requerimiento, setRequerimiento] = useState(garantia.requerimiento_nv || '')
  const [editandoReq, setEditandoReq] = useState(false)
  const [guardandoReq, setGuardandoReq] = useState(false)
  const deshabilitado = !puedeEditar || soloLectura

  const { asunto, cuerpo } = textoSolicitudNv(garantia)
  const reqGuardado = garantia.requerimiento_nv
  const mostrarBorrador = !reqGuardado || editandoReq

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!nv.trim()) { toast.error('Ingresa el número de NV'); return }
    if (!fechaSeg) { toast.error('Ingresa la fecha de seguimiento'); return }
    setGuardando(true)
    await onActualizar({ numero_nv: nv.trim(), fecha_seguimiento: fechaSeg, estado: 'importacion' }, 'NV registrada — garantía en Importación')
    setGuardando(false)
  }

  async function guardarRequerimiento(e: React.FormEvent) {
    e.preventDefault()
    const valor = requerimiento.trim()
    if (!valor) { toast.error('Ingresa el número de requerimiento'); return }
    setGuardandoReq(true)
    const ok = await onActualizar({ requerimiento_nv: valor }, 'Requerimiento de NV registrado')
    setGuardandoReq(false)
    if (ok) setEditandoReq(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Solicitud de la NV: borrador de correo + N° de requerimiento ── */}
      {mostrarBorrador ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          <Card style={{ flex: '2 1 340px', minWidth: 0 }}>
            <div style={{ ...CARD_TITULO, display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} /> Borrador de correo — solicitud de NV</div>
            {!garantia.nit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 12, background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)' }}>
                <AlertTriangle size={14} /> Falta el NIT — complétalo editando la garantía (lápiz arriba).
              </div>
            )}
            <FG label="Asunto">
              <div style={{ ...INP, fontWeight: 600 }}>{asunto}</div>
            </FG>
            <div style={{ marginTop: 12 }}>
              <FG label="Mensaje">
                <pre style={{ ...INP, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{cuerpo}</pre>
              </FG>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => copiar(asunto, 'Asunto copiado')} style={BTN_COPIAR}><Copy size={13} /> Copiar asunto</button>
              <button type="button" onClick={() => copiar(cuerpo, 'Correo copiado')} style={BTN_COPIAR}><Copy size={13} /> Copiar correo</button>
            </div>
          </Card>

          <Card style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={CARD_TITULO}>Número de requerimiento</div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
              Cuando se cree el requerimiento en SACI, regístralo aquí.
            </p>
            <form onSubmit={guardarRequerimiento} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={requerimiento} onChange={e => setRequerimiento(e.target.value.trim())} placeholder="Ej. 12345" style={INP} disabled={deshabilitado} />
              {linkRequerimientoNv(requerimiento) && (
                <a href={linkRequerimientoNv(requerimiento)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: 'var(--accent)', wordBreak: 'break-all' }}>{linkRequerimientoNv(requerimiento)}</a>
              )}
              {!deshabilitado && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {editandoReq && (
                    <button type="button" onClick={() => { setRequerimiento(reqGuardado || ''); setEditandoReq(false) }} style={GHOST}>Cancelar</button>
                  )}
                  <button type="submit" disabled={guardandoReq} style={PRI}>{guardandoReq ? 'Guardando…' : '✓ Guardar'}</button>
                </div>
              )}
            </form>
          </Card>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 18px', borderRadius: 'var(--radius)', background: 'var(--green-bg, #dcfce7)', border: '1px solid var(--green-border, #86efac)', color: 'var(--green, #16a34a)' }}>
          <CheckCircle2 size={18} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Requerimiento de NV creado: {reqGuardado}</div>
            <a href={linkRequerimientoNv(reqGuardado)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }}>
              {linkRequerimientoNv(reqGuardado)} <ExternalLink size={11} />
            </a>
          </div>
          {!deshabilitado && (
            <button type="button" onClick={() => setEditandoReq(true)} title="Corregir número de requerimiento" style={{ ...BTN_COPIAR, color: 'var(--muted)' }}>
              <Pencil size={12} /> Corregir
            </button>
          )}
        </div>
      )}

      {/* ── Registro de la NV → Importación ── */}
      <Card>
        <BannerEstado icon={<FileText size={16} />}>
          {soloLectura ? 'Revisando "NV" (solo lectura)' : 'No hay stock — registra la NV con la que se aparta el stock para la importación.'}
        </BannerEstado>
        <form onSubmit={confirmar}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <FG label="Número de NV" required>
              <input value={nv} onChange={e => setNv(e.target.value.toUpperCase())} placeholder="Ej. 12345" style={INP} disabled={deshabilitado} />
            </FG>
            <FG label="Fecha de seguimiento" required>
              <input type="date" value={fechaSeg} onChange={e => setFechaSeg(e.target.value)} style={INP} disabled={deshabilitado} />
            </FG>
          </div>
          {!deshabilitado && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="submit" disabled={guardando} style={PRI}>{guardando ? 'Guardando…' : '✓ Enviar a importación →'}</button>
            </div>
          )}
        </form>
      </Card>
    </div>
  )
}
