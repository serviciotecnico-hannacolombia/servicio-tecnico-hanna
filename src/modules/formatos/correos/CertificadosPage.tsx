import { useState } from 'react'
import { Mail, ExternalLink, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/Button'

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--muted)',
  marginBottom: 5,
  display: 'block',
}

const CC_FIJO = 'serviciotecnico@hannacolombia.com'

// "ST123-2026 NOMBRE CLIENTE" → "Nombre Cliente"
function extraerCliente(servicio: string): string {
  const match = servicio.trim().match(/^ST\d+-\d{4}\s+(.+)$/i)
  if (!match) return ''
  return match[1]
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function generarMailto(
  servicio: string,
  clienteNormalizado: string,
  contacto: string,
  genero: 'M' | 'F',
): string {
  const saludo = contacto.trim()
    ? genero === 'F'
      ? `Estimada ${contacto.trim()},`
      : `Estimado ${contacto.trim()},`
    : 'Buen día,'

  const articulo = genero === 'F' ? 'de la cliente' : 'del cliente'

  const body = [
    saludo,
    ``,
    `Cordial Saludo,`,
    ``,
    `Adjunto enviamos los certificados de calibración ${articulo} ${clienteNormalizado}.`,
    ``,
    `Agradecemos su confianza en nosotros para sus necesidades de calibración.`,
    ``,
    `Cordialmente,`,
  ].join('\n')

  const params = [
    `cc=${encodeURIComponent(CC_FIJO)}`,
    `subject=${encodeURIComponent(servicio.trim())}`,
    `body=${encodeURIComponent(body)}`,
  ].join('&')

  return `mailto:?${params}`
}

export function CertificadosPage() {
  const [servicio, setServicio] = useState('')
  const [contacto, setContacto] = useState('')
  const [genero, setGenero]     = useState<'M' | 'F'>('M')
  const [abierto, setAbierto]   = useState(false)

  const clienteNormalizado = extraerCliente(servicio)
  const formatoValido      = clienteNormalizado !== ''
  const camposOk           = servicio.trim() && formatoValido

  const handleAbrir = () => {
    if (!servicio.trim()) return toast.error('Escribe el servicio')
    if (!formatoValido)   return toast.error('Formato inválido. Ej: ST123-2026 NOMBRE CLIENTE')
    window.location.href = generarMailto(servicio, clienteNormalizado, contacto, genero)
    setAbierto(true)
  }

  const limpiar = () => {
    setServicio(''); setContacto(''); setGenero('M')
    setAbierto(false)
  }

  const articuloPreview = genero === 'F' ? 'de la cliente' : 'del cliente'
  const saludoPreview   = contacto.trim()
    ? genero === 'F' ? `Estimada ${contacto.trim()},` : `Estimado ${contacto.trim()},`
    : 'Buen día,'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>

      {/* Formulario */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Servicio */}
        <div>
          <label style={labelStyle}>
            Servicio <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>
          </label>
          <input
            style={inputStyle}
            value={servicio}
            onChange={e => setServicio(e.target.value)}
            placeholder="Ej: ST123-2026 BACAO SAS"
          />
          {servicio.trim() && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {formatoValido ? (
                <>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                    Asunto → {servicio.trim()}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    Cliente en cuerpo → {clienteNormalizado}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '0.72rem', color: 'var(--red)', fontFamily: 'var(--mono)' }}>
                  Formato esperado: ST123-2026 NOMBRE CLIENTE
                </span>
              )}
            </div>
          )}
        </div>

        {/* Contacto + género */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Contacto (opcional)</label>
            <input
              style={inputStyle}
              value={contacto}
              onChange={e => setContacto(e.target.value)}
              placeholder="Nombre de la persona a quien va dirigido"
            />
          </div>

          <div>
            <label style={labelStyle}>Género</label>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {(['M', 'F'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGenero(g)}
                  style={{
                    flex: 1, padding: '8px 16px', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--sans)', fontWeight: 600, fontSize: '0.85rem',
                    background: genero === g ? 'var(--accent)' : 'var(--surface)',
                    color: genero === g ? '#fff' : 'var(--muted)',
                    transition: 'all .12s',
                  }}
                >
                  {g === 'M' ? 'Estimado' : 'Estimada'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview cuerpo */}
        <div style={{
          padding: '12px 14px',
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.82rem',
          fontFamily: 'var(--mono)',
          color: 'var(--muted)',
          lineHeight: 1.9,
          whiteSpace: 'pre-wrap',
        }}>
          {saludoPreview}{'\n\n'}
          {'Cordial Saludo,\n\n'}
          {`Adjunto enviamos los certificados de calibración ${articuloPreview} ${clienteNormalizado || '[cliente]'}.`}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button
            onClick={handleAbrir}
            disabled={!camposOk}
            style={{ gap: 8, display: 'flex', alignItems: 'center' }}
          >
            <Mail size={15} />
            Abrir en cliente de correo
            <ExternalLink size={13} style={{ opacity: 0.7 }} />
          </Button>

          {abierto && (
            <Button variant="ghost" onClick={limpiar} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Nuevo correo
            </Button>
          )}
        </div>
      </div>

      {/* Panel info fija */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        position: 'sticky',
        top: 24,
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Users size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>CC fijo</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Servicio Técnico</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>
            {CC_FIJO}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
            El campo <strong>Para (TO)</strong> lo completas directamente en tu cliente de correo.
          </p>
        </div>
      </div>

    </div>
  )
}
