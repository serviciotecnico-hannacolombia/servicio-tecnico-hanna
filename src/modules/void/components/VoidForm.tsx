import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { VoidRecord } from '../types'
import { parseEquipoQR } from '../utils/qrParser'
import { QrCode, CheckCircle2, Edit3 } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'

interface VoidFormProps {
  onSave: (record: VoidRecord) => void
}

export function VoidForm({ onSave }: VoidFormProps) {
  const [modoManual, setModoManual] = useState(false)
  const [qrEquipo, setQrEquipo] = useState('')
  const [referencia, setReferencia] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')
  const [nombreEquipo, setNombreEquipo] = useState('')
  const [voidBlanco, setVoidBlanco] = useState('')
  const [voidGris, setVoidGris] = useState('')
  const [documentoRef, setDocumentoRef] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const inputVoidBlancoRef = useRef<HTMLInputElement>(null)
  const inputVoidGrisRef = useRef<HTMLInputElement>(null)
  const inputDocRef = useRef<HTMLInputElement>(null)
  const inputQrRef = useRef<HTMLInputElement>(null)

  const handleQrKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const parsed = parseEquipoQR(qrEquipo)
      setReferencia(parsed.referencia)
      setNumeroSerie(parsed.serie)
      setNombreEquipo(parsed.nombre)
      inputVoidBlancoRef.current?.focus()
    }
  }

  const handleVoidBlancoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); inputVoidGrisRef.current?.focus() }
  }

  const handleVoidGrisKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); inputDocRef.current?.focus() }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!voidBlanco || !voidGris) return

    onSave({
      qr_equipo: qrEquipo || `${referencia}Ñ${numeroSerie}Ñ${nombreEquipo}`,
      referencia,
      numero_serie: numeroSerie,
      nombre_equipo: nombreEquipo,
      void_blanco: voidBlanco,
      void_gris: voidGris,
      documento_referencia: documentoRef,
      observaciones,
      created_at: new Date().toISOString(),
    })

    setQrEquipo(''); setReferencia(''); setNumeroSerie(''); setNombreEquipo('')
    setVoidBlanco(''); setVoidGris(''); setDocumentoRef(''); setObservaciones('')
    inputQrRef.current?.focus()
  }

  return (
    <Card style={{ marginBottom: 18 }} bodyStyle={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <QrCode size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Registrar Equipo y VOIDs</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>Pistolea el código QR o activa el modo manual</p>
          </div>
        </div>

        <Button type="button" variant={modoManual ? 'primary' : 'ghost'} size="sm" onClick={() => setModoManual(!modoManual)}>
          <Edit3 size={14} /> {modoManual ? 'Desactivar modo manual' : 'Ingreso sin QR (manual)'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!modoManual ? (
          <Input
            ref={inputQrRef}
            label="1. QR EQUIPO (PISTOLEAR AQUÍ)"
            value={qrEquipo}
            onChange={e => setQrEquipo(e.target.value)}
            onKeyDown={handleQrKeyDown}
            placeholder="HI76312Ñ121417CMÑMAURITIUSÑConductivity Probe"
            style={{ fontFamily: 'var(--mono)', background: 'var(--surface2)' }}
            autoFocus
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
            <Input required label="Referencia" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ej: HI98194" />
            <Input required label="Número de Serie" value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} placeholder="Ej: 1847120" />
            <Input required label="Nombre del Equipo" value={nombreEquipo} onChange={e => setNombreEquipo(e.target.value)} placeholder="Ej: Multiparámetro Portátil" />
          </div>
        )}

        {referencia && !modoManual && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: '0.8rem' }}>
            <div><strong style={{ color: 'var(--accent)' }}>Ref:</strong> {referencia}</div>
            <div><strong style={{ color: 'var(--accent)' }}>Serie:</strong> {numeroSerie}</div>
            <div><strong style={{ color: 'var(--accent)' }}>Nombre:</strong> {nombreEquipo}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Input
            required
            ref={inputVoidBlancoRef}
            label="2. VOID BLANCO (PISTOLEAR)"
            value={voidBlanco}
            onChange={e => setVoidBlanco(e.target.value)}
            onKeyDown={handleVoidBlancoKeyDown}
            placeholder="CO342500HA"
            style={{ fontFamily: 'var(--mono)' }}
          />
          <Input
            required
            ref={inputVoidGrisRef}
            label="3. VOID GRIS (PISTOLEAR)"
            value={voidGris}
            onChange={e => setVoidGris(e.target.value)}
            onKeyDown={handleVoidGrisKeyDown}
            placeholder="CO16517B"
            style={{ fontFamily: 'var(--mono)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Input ref={inputDocRef} required label="Factura / Remisión / OTST" value={documentoRef} onChange={e => setDocumentoRef(e.target.value)} placeholder="Ej: FV 123456 / OTST 41000" />
          <Input label="Observaciones (opcional)" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas sobre el estado del equipo..." />
        </div>

        <Button type="submit" style={{ marginTop: 4 }}>
          <CheckCircle2 size={16} /> Guardar Registro
        </Button>
      </form>
    </Card>
  )
}
