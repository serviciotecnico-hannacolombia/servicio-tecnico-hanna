import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, ExternalLink, Users } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../../components/ui/Button'
import type { CorreoProveedor, CorreoDestinatario } from '../../../types'

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

function Field({
  label, value, onChange, placeholder, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}</label>
      <input
        style={inputStyle}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}

const YEAR = new Date().getFullYear()

function construirOC(num: string) {
  return `ST${num.trim()}-${YEAR}`
}

function generarMailto(
  destinatarios: CorreoDestinatario[],
  ocCompleta: string,
  cliente: string,
  nit: string,
  rmv: string,
  otst: string,
): string {
  const to = destinatarios.filter(d => d.tipo === 'to').map(d => d.email).join(',')
  const cc = destinatarios.filter(d => d.tipo === 'cc').map(d => d.email).join(',')

  const subject = `OC: ${ocCompleta} ${cliente}`

  const body = [
    `Estimados,`,
    ``,
    `Adjunto encontrarán la Orden de Compra correspondiente a los siguientes instrumentos para calibración:`,
    ``,
    `  • Cliente : ${cliente}`,
    `  • NIT     : ${nit}`,
    `  • RMV     : ${rmv}`,
    `  • OTST    : ${otst}`,
    `  • N° OC   : ${ocCompleta}`,
    ``,
    `Quedo atento a cualquier novedad.`,
    ``,
    `Saludos,`,
  ].join('\n')

  const params: string[] = []
  if (cc) params.push(`cc=${encodeURIComponent(cc)}`)
  params.push(`subject=${encodeURIComponent(subject)}`)
  params.push(`body=${encodeURIComponent(body)}`)

  return `mailto:${to}?${params.join('&')}`
}

export function CorreosOCPage() {
  const [proveedorId, setProveedorId] = useState('')
  const [numOC, setNumOC]             = useState('')
  const [cliente, setCliente]         = useState('')
  const [nit, setNit]                 = useState('')
  const [rmv, setRmv]                 = useState('')
  const [otst, setOtst]               = useState('')
  const [abierto, setAbierto]         = useState(false)

  const ocCompleta = numOC.trim() ? construirOC(numOC) : ''

  const limpiar = () => {
    setNumOC(''); setCliente(''); setNit(''); setRmv(''); setOtst('')
    setAbierto(false)
  }

  const { data: proveedores = [] } = useQuery<CorreoProveedor[]>({
    queryKey: ['correos-proveedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('correos_proveedores')
        .select('*')
        .eq('activo', true)
        .order('nombre')
      if (error) throw error
      return data
    },
  })

  const { data: destinatarios = [] } = useQuery<CorreoDestinatario[]>({
    queryKey: ['correos-destinatarios', proveedorId],
    enabled: !!proveedorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('correos_destinatarios')
        .select('*')
        .eq('proveedor_id', proveedorId)
        .order('orden')
      if (error) throw error
      return data
    },
  })

  const toList = destinatarios.filter(d => d.tipo === 'to')
  const ccList = destinatarios.filter(d => d.tipo === 'cc')

  const camposOk = proveedorId && numOC.trim() && cliente.trim() && nit.trim() && rmv.trim() && otst.trim()
  const destinatariosOk = toList.length > 0

  const handleAbrir = () => {
    if (!camposOk) return toast.error('Completa todos los campos obligatorios')
    if (!destinatariosOk) return toast.error('Este proveedor no tiene destinatarios TO configurados')
    const url = generarMailto(destinatarios, ocCompleta, cliente, nit, rmv, otst)
    window.location.href = url
    setAbierto(true)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

      {/* Formulario */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Proveedor */}
        <div>
          <label style={labelStyle}>
            Proveedor <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>
          </label>
          <select
            style={{ ...inputStyle }}
            value={proveedorId}
            onChange={e => setProveedorId(e.target.value)}
          >
            <option value="">— Selecciona un proveedor —</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          {proveedores.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 6 }}>
              No hay proveedores configurados. Ve a Admin → Correos OC para añadirlos.
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* N° OC con prefijo visual */}
          <div>
            <label style={labelStyle}>
              N° Orden de Compra <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{
                padding: '8px 10px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRight: 'none',
                borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                fontSize: '0.875rem',
                color: 'var(--muted)',
                fontFamily: 'var(--mono)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}>
                ST
              </span>
              <input
                style={{ ...inputStyle, borderRadius: '0', flex: 1, minWidth: 0 }}
                value={numOC}
                onChange={e => setNumOC(e.target.value.replace(/\D/g, ''))}
                placeholder="123"
                required
              />
              <span style={{
                padding: '8px 10px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderLeft: 'none',
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                fontSize: '0.875rem',
                color: 'var(--muted)',
                fontFamily: 'var(--mono)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}>
                -{YEAR}
              </span>
            </div>
            {ocCompleta && (
              <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontFamily: 'var(--mono)', marginTop: 4, display: 'block' }}>
                → {ocCompleta}
              </span>
            )}
          </div>

          <Field label="Cliente" value={cliente} onChange={v => setCliente(v.toUpperCase())} placeholder="Nombre del cliente" required />

          {/* NIT solo número */}
          <div>
            <label style={labelStyle}>NIT <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span></label>
            <input
              style={inputStyle}
              value={nit}
              onChange={e => setNit(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 900123456"
              required
            />
          </div>

          <Field label="RMV" value={rmv} onChange={setRmv} placeholder="Ej: 123 o 123-A" required />
        </div>

        <Field label="OTST" value={otst} onChange={setOtst} placeholder="Ej: 456 o 456-B" required />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button
            onClick={handleAbrir}
            disabled={!camposOk || !destinatariosOk}
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

      {/* Panel destinatarios */}
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
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Destinatarios</span>
        </div>

        {!proveedorId ? (
          <p style={{ padding: '20px 16px', fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
            Selecciona un proveedor para ver sus destinatarios.
          </p>
        ) : destinatarios.length === 0 ? (
          <p style={{ padding: '20px 16px', fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
            Sin destinatarios configurados para este proveedor.
          </p>
        ) : (
          <div>
            {[{ label: 'TO', list: toList }, { label: 'CC', list: ccList }].map(({ label, list }) =>
              list.length > 0 && (
                <div key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    padding: '6px 16px',
                    fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--mono)',
                    color: label === 'TO' ? 'var(--accent)' : 'var(--muted)',
                    background: label === 'TO' ? 'var(--accent-bg)' : 'var(--surface2)',
                    letterSpacing: '0.08em',
                  }}>
                    {label}
                  </div>
                  {list.map(d => (
                    <div key={d.id} style={{
                      padding: '8px 16px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '0.82rem',
                    }}>
                      <div style={{ fontWeight: 600 }}>{d.nombre}</div>
                      <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{d.email}</div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
