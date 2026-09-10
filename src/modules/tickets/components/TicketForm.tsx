import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { Ticket as TicketIcon, CheckCircle2, Link2, Edit3 } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import { parseEquipoQR } from '../../void/utils/qrParser'
import {
  ORIGEN_LABEL, ESTADO_LABEL, ESTADO_NOTA_PLACEHOLDER,
  type TicketFabrica, type TicketOrigen, type TicketEstado,
} from '../types'

interface TicketFormProps {
  onSave: (ticket: TicketFabrica) => void
}

const TICKET_ID_PREFIJO = 'Ticket ID: '

export function TicketForm({ onSave }: TicketFormProps) {
  const [numeroTicket, setNumeroTicket] = useState('')

  const [modoManualEquipo, setModoManualEquipo] = useState(false)
  const [qrEquipo, setQrEquipo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [serial, setSerial] = useState('')
  const [equipoNombre, setEquipoNombre] = useState('')

  const [origen, setOrigen] = useState<TicketOrigen | ''>('')
  const [estado, setEstado] = useState<TicketEstado | ''>('')
  const [notaEstado, setNotaEstado] = useState('')

  const [esEquipoHijo, setEsEquipoHijo] = useState(false)
  const [modoManualMadre, setModoManualMadre] = useState(false)
  const [qrMadre, setQrMadre] = useState('')
  const [equipoMadreCodigo, setEquipoMadreCodigo] = useState('')
  const [equipoMadreSerial, setEquipoMadreSerial] = useState('')
  const [equipoMadreNombre, setEquipoMadreNombre] = useState('')

  const inputQrEquipoRef = useRef<HTMLInputElement>(null)
  const inputQrMadreRef = useRef<HTMLInputElement>(null)

  const handleQrEquipoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const parsed = parseEquipoQR(qrEquipo)
      setCodigo(parsed.referencia)
      setSerial(parsed.serie)
      setEquipoNombre(parsed.nombre)
    }
  }

  const handleQrMadreKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const parsed = parseEquipoQR(qrMadre)
      setEquipoMadreCodigo(parsed.referencia)
      setEquipoMadreSerial(parsed.serie)
      setEquipoMadreNombre(parsed.nombre)
    }
  }

  const reset = () => {
    setNumeroTicket(''); setQrEquipo(''); setCodigo(''); setSerial(''); setEquipoNombre('')
    setOrigen(''); setEstado(''); setNotaEstado('')
    setEsEquipoHijo(false); setQrMadre(''); setEquipoMadreCodigo(''); setEquipoMadreSerial(''); setEquipoMadreNombre('')
    inputQrEquipoRef.current?.focus()
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!numeroTicket.trim()) { toast.error('Ingresa el número del ticket'); return }
    if (esEquipoHijo && !equipoMadreCodigo.trim() && !equipoMadreSerial.trim()) {
      toast.error('Ingresa al menos el código o el serial del equipo madre'); return
    }

    onSave({
      nombre: `${TICKET_ID_PREFIJO}${numeroTicket.trim()}`,
      codigo: codigo.trim(),
      serial: serial.trim(),
      equipo_nombre: equipoNombre.trim(),
      origen: origen || null,
      estado: estado || null,
      nota_estado: notaEstado.trim(),
      es_equipo_hijo: esEquipoHijo,
      equipo_madre_codigo: esEquipoHijo ? equipoMadreCodigo.trim() : '',
      equipo_madre_serial: esEquipoHijo ? equipoMadreSerial.trim() : '',
      equipo_madre_nombre: esEquipoHijo ? equipoMadreNombre.trim() : '',
    })

    reset()
  }

  return (
    <Card style={{ marginBottom: 18 }} bodyStyle={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <TicketIcon size={20} style={{ color: 'var(--accent)' }} />
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Registrar Ticket a Fábrica</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
            Usa el número de ticket generado en la plataforma de fábrica
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
            No. de Ticket (plataforma de fábrica)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{TICKET_ID_PREFIJO}</span>
            <Input
              required
              value={numeroTicket}
              onChange={e => setNumeroTicket(e.target.value)}
              placeholder="22790"
              style={{ fontFamily: 'var(--mono)', flex: 1 }}
              wrapStyle={{ flex: 1 }}
            />
          </div>
        </div>

        {/* ── Equipo reportado ─────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>Equipo reportado</label>
            <Button type="button" variant={modoManualEquipo ? 'primary' : 'ghost'} size="sm" onClick={() => setModoManualEquipo(m => !m)}>
              <Edit3 size={13} /> {modoManualEquipo ? 'Desactivar modo manual' : 'Ingreso sin QR (manual)'}
            </Button>
          </div>

          {!modoManualEquipo ? (
            <Input
              ref={inputQrEquipoRef}
              value={qrEquipo}
              onChange={e => setQrEquipo(e.target.value)}
              onKeyDown={handleQrEquipoKeyDown}
              placeholder="QR AQUÍ"
              style={{ fontFamily: 'var(--mono)', background: 'var(--surface2)' }}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
              <Input label="Código" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ej: HI764113" style={{ fontFamily: 'var(--mono)' }} />
              <Input label="Serial" value={serial} onChange={e => setSerial(e.target.value)} placeholder="Ej: 08260042" style={{ fontFamily: 'var(--mono)' }} />
              <Input label="Nombre del Equipo" value={equipoNombre} onChange={e => setEquipoNombre(e.target.value)} placeholder="Ej: Multiparámetro Portátil" />
            </div>
          )}

          {codigo && !modoManualEquipo && (
            <div style={{ marginTop: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: '0.8rem' }}>
              <div><strong style={{ color: 'var(--accent)' }}>Código:</strong> {codigo}</div>
              <div><strong style={{ color: 'var(--accent)' }}>Serial:</strong> {serial}</div>
              <div><strong style={{ color: 'var(--accent)' }}>Nombre:</strong> {equipoNombre}</div>
            </div>
          )}
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none',
          background: esEquipoHijo ? 'var(--accent-bg)' : 'var(--surface2)',
          border: `1px solid ${esEquipoHijo ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '0.85rem', fontWeight: 600,
          color: esEquipoHijo ? 'var(--accent)' : 'var(--text)', transition: 'all .15s',
        }}>
          <input type="checkbox" checked={esEquipoHijo} onChange={e => setEsEquipoHijo(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <Link2 size={15} />
          Es una sonda/electrodo (equipo hijo) de otro equipo — reportar equipo madre para trazabilidad
        </label>

        {esEquipoHijo && (
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>Equipo madre</label>
              <Button type="button" variant={modoManualMadre ? 'primary' : 'ghost'} size="sm" onClick={() => setModoManualMadre(m => !m)}>
                <Edit3 size={13} /> {modoManualMadre ? 'Desactivar modo manual' : 'Ingreso sin QR (manual)'}
              </Button>
            </div>

            {!modoManualMadre ? (
              <Input
                ref={inputQrMadreRef}
                value={qrMadre}
                onChange={e => setQrMadre(e.target.value)}
                onKeyDown={handleQrMadreKeyDown}
                placeholder="QR AQUÍ"
                style={{ fontFamily: 'var(--mono)', background: 'var(--surface)' }}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
                <Input label="Código Equipo Madre" value={equipoMadreCodigo} onChange={e => setEquipoMadreCodigo(e.target.value)} placeholder="Ej: HI98194" style={{ fontFamily: 'var(--mono)' }} />
                <Input label="Serial Equipo Madre" value={equipoMadreSerial} onChange={e => setEquipoMadreSerial(e.target.value)} placeholder="Ej: 1847120" style={{ fontFamily: 'var(--mono)' }} />
                <Input label="Nombre Equipo Madre" value={equipoMadreNombre} onChange={e => setEquipoMadreNombre(e.target.value)} placeholder="Ej: Multiparámetro Portátil" />
              </div>
            )}

            {equipoMadreCodigo && !modoManualMadre && (
              <div style={{ marginTop: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: '0.8rem' }}>
                <div><strong style={{ color: 'var(--accent)' }}>Código:</strong> {equipoMadreCodigo}</div>
                <div><strong style={{ color: 'var(--accent)' }}>Serial:</strong> {equipoMadreSerial}</div>
                <div><strong style={{ color: 'var(--accent)' }}>Nombre:</strong> {equipoMadreNombre}</div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Select
            label="Origen"
            placeholder="Selecciona un origen"
            value={origen}
            onChange={e => setOrigen(e.target.value as TicketOrigen)}
            options={(Object.keys(ORIGEN_LABEL) as TicketOrigen[]).map(o => ({ value: o, label: ORIGEN_LABEL[o] }))}
          />
          <Select
            label="Estado"
            placeholder="Selecciona un estado"
            value={estado}
            onChange={e => setEstado(e.target.value as TicketEstado)}
            options={(Object.keys(ESTADO_LABEL) as TicketEstado[]).map(r => ({ value: r, label: ESTADO_LABEL[r] }))}
          />
        </div>

        {estado && (
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
              Detalle del estado
            </label>
            <textarea
              rows={2}
              value={notaEstado}
              onChange={e => setNotaEstado(e.target.value)}
              placeholder={ESTADO_NOTA_PLACEHOLDER[estado]}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.875rem', resize: 'vertical' }}
            />
          </div>
        )}

        <Button type="submit" style={{ marginTop: 4 }}>
          <CheckCircle2 size={16} /> Guardar Ticket
        </Button>
      </form>
    </Card>
  )
}
