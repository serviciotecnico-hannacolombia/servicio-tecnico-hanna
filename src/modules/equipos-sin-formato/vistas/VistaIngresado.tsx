import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Copy, Check } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { linkPreIngreso, linkOtst, parseOtstCodes } from '../hooks/useEquiposSinFormato'
import { generarNotificacionIngresado, copiarConFormato } from '../correo'
import { GHOST } from '../ui'
import type { EquipoSinFormato, EquipoSinFormatoItem } from '../../../types'

export function VistaIngresado({ registro, items }: { registro: EquipoSinFormato, items: EquipoSinFormatoItem[] }) {
  const codigos = parseOtstCodes(registro.otst)
  const [copiado, setCopiado] = useState(false)

  async function copiarNotificacion() {
    const { text, html } = generarNotificacionIngresado(registro, items.length, codigos)
    const ok = await copiarConFormato(text, html)
    if (!ok) { toast.error('No se pudo copiar al portapapeles'); return }
    toast.success('Correo de notificación copiado')
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2200)
  }

  return (
    <Card>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--green-bg, #dcfce7)', border: '1px solid var(--green-border, #86efac)', color: 'var(--green, #16a34a)',
        marginBottom: 20, fontSize: 13, fontWeight: 600,
      }}>
        <CheckCircle2 size={16} /> Ingresado — proceso completo.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)', marginBottom: 6 }}>Pre-ingreso</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{registro.numero_pre_ingreso || '—'}</div>
          {registro.numero_pre_ingreso && (
            <a href={linkPreIngreso(registro.numero_pre_ingreso)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: 'var(--accent)' }}>
              {linkPreIngreso(registro.numero_pre_ingreso)}
            </a>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)', marginBottom: 6 }}>OTST</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {codigos.map(c => (
              <a key={c} href={linkOtst(c)!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--accent)' }}>
                {c}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={copiarNotificacion} style={{ ...GHOST, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {copiado ? <Check size={14} /> : <Copy size={14} />}
          {copiado ? 'Copiado' : 'Copiar correo de notificación'}
        </button>
      </div>
    </Card>
  )
}
