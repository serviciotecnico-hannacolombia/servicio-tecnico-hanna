// Pestaña "SACI": ayuda a los asesores a redactar la Solicitud de
// Calibración ONAC que se le envía al cliente pidiendo los datos para el
// certificado. El formulario arma el texto automáticamente y se puede
// copiar con un clic. El borrador vive solo en localStorage (no en
// Supabase, no hay nada que compartir entre usuarios) para que un reload
// no le borre al asesor lo que ya llevaba escrito.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { FG, Grid2, Grid3, Seccion, INP, PRI, GHOST } from './ui'

interface SaciForm {
  cliente: string
  referenciaEquipo: string
  remisionFactura: string
  otst: string
  razonSocial: string
  nit: string
  direccion: string
  ciudad: string
  ubicacionEquipo: string
  idActivoFijo: string
  parametroPuntos: string
  contactoNombre: string
  contactoCorreo: string
  contactoTelefono: string
  fechaEspecial: 'no' | 'si'
  fechaLimite: string
  motivo: string
}

const FORM_VACIO: SaciForm = {
  cliente: '', referenciaEquipo: '', remisionFactura: '', otst: '',
  razonSocial: '', nit: '', direccion: '', ciudad: '',
  ubicacionEquipo: '', idActivoFijo: '', parametroPuntos: '',
  contactoNombre: '', contactoCorreo: '', contactoTelefono: '',
  fechaEspecial: 'no', fechaLimite: '', motivo: '',
}
const SACI_KEY = 'calibraciones_saci_draft'

function cargarForm(): SaciForm {
  try {
    const raw = localStorage.getItem(SACI_KEY)
    if (!raw) return FORM_VACIO
    return { ...FORM_VACIO, ...JSON.parse(raw) }
  } catch {
    return FORM_VACIO
  }
}

function construirTextoSaci(f: SaciForm): string {
  const contacto = [f.contactoNombre, f.contactoCorreo, f.contactoTelefono].filter(Boolean).join(', ')
  const bloqueFecha = f.fechaEspecial === 'si'
    ? `¿Requiere fecha especial de entrega? Sí\nEn caso afirmativo, indicar la fecha límite requerida y el motivo:\n- Fecha límite: ${f.fechaLimite}\n- Motivo: ${f.motivo}`
    : '¿Requiere fecha especial de entrega? No'
  const bloqueOtst = f.otst.trim() ? ` y a las OTST ${f.otst.trim()}` : ''

  return `Título: SOLICITUD DE CALIBRACIÓN ONAC — ${f.cliente || '[NOMBRE DEL CLIENTE]'}

Cordial saludo,
Solicito amablemente realizar la gestión de calibración acreditada ONAC del equipo ${f.referenciaEquipo || '[REFERENCIA DEL EQUIPO]'} correspondiente a la ${f.remisionFactura || '[REMISIÓN / FACTURA]'}${bloqueOtst}.

Datos para el certificado:
- RAZÓN SOCIAL: ${f.razonSocial}
- NIT: ${f.nit}
- DIRECCIÓN: ${f.direccion}
- CIUDAD: ${f.ciudad}
- UBICACIÓN DEL EQUIPO: ${f.ubicacionEquipo}
- ID / ACTIVO FIJO: ${f.idActivoFijo}
- PARÁMETRO Y PUNTOS A CALIBRAR: ${f.parametroPuntos}
- PERSONA DE CONTACTO, CORREO Y TELÉFONO: ${contacto}

${bloqueFecha}

Saludos,`
}

export function SaciTab() {
  const [form, setForm] = useState<SaciForm>(cargarForm)
  const [copied, setCopied] = useState(false)

  useEffect(() => { localStorage.setItem(SACI_KEY, JSON.stringify(form)) }, [form])

  function set<K extends keyof SaciForm>(campo: K, valor: SaciForm[K]) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function limpiar() {
    if (!confirm('¿Vaciar el formulario? Se perderá lo que llevas escrito.')) return
    setForm(FORM_VACIO)
    toast.success('Formulario vaciado')
  }

  function copiar() {
    navigator.clipboard.writeText(construirTextoSaci(form)).then(() => {
      setCopied(true)
      toast.success('Solicitud copiada al portapapeles')
      setTimeout(() => setCopied(false), 2200)
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      <Card>
        <Seccion titulo="Datos generales">
          <div style={{ marginBottom: 14 }}>
            <FG label="Nombre del cliente">
              <input value={form.cliente} onChange={e => set('cliente', e.target.value)} placeholder="Ej. Acueducto Municipal de..." style={INP} />
            </FG>
          </div>
          <Grid2>
            <FG label="Referencia del equipo" hint="Si son varios equipos, sepáralos por comas">
              <input value={form.referenciaEquipo} onChange={e => set('referenciaEquipo', e.target.value)} placeholder="Ej. HI98194, HI98195" style={INP} />
            </FG>
            <FG label="Remisión / Factura" hint="Si son varias, sepáralas por comas">
              <input value={form.remisionFactura} onChange={e => set('remisionFactura', e.target.value)} placeholder="Ej. REM-1234, REM-1235" style={INP} />
            </FG>
          </Grid2>
          <div style={{ marginTop: 14 }}>
            <FG label="OTST" hint="Opcional — si son varias, sepáralas por comas">
              <input value={form.otst} onChange={e => set('otst', e.target.value)} placeholder="Ej. 41784, 41785" style={INP} />
            </FG>
          </div>
        </Seccion>

        <Seccion titulo="Datos para el certificado">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Grid2>
              <FG label="Razón social">
                <input value={form.razonSocial} onChange={e => set('razonSocial', e.target.value)} style={INP} />
              </FG>
              <FG label="NIT">
                <input value={form.nit} onChange={e => set('nit', e.target.value)} style={INP} />
              </FG>
            </Grid2>
            <Grid2>
              <FG label="Dirección">
                <input value={form.direccion} onChange={e => set('direccion', e.target.value)} style={INP} />
              </FG>
              <FG label="Ciudad">
                <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)} style={INP} />
              </FG>
            </Grid2>
            <FG label="Ubicación del equipo" hint="Dato para el certificado (dónde lo usa el cliente), no dónde está el equipo ahora mismo">
              <input value={form.ubicacionEquipo} onChange={e => set('ubicacionEquipo', e.target.value)} placeholder="Ej. Laboratorio de calidad, gestión ambiental (si aplica)" style={INP} />
            </FG>
            <FG label="ID / Activo fijo" hint="Dato para el certificado — el número de activo fijo que el cliente usa internamente (si aplica)">
              <input value={form.idActivoFijo} onChange={e => set('idActivoFijo', e.target.value)} placeholder="Número de activo fijo del cliente" style={INP} />
            </FG>
            <FG label="Parámetro y puntos a calibrar">
              <textarea value={form.parametroPuntos} onChange={e => set('parametroPuntos', e.target.value)} rows={2} style={{ ...INP, resize: 'vertical' }} />
            </FG>
          </div>
        </Seccion>

        <Seccion titulo="Persona de contacto">
          <Grid3>
            <FG label="Nombre">
              <input value={form.contactoNombre} onChange={e => set('contactoNombre', e.target.value)} style={INP} />
            </FG>
            <FG label="Correo">
              <input value={form.contactoCorreo} onChange={e => set('contactoCorreo', e.target.value)} style={INP} />
            </FG>
            <FG label="Teléfono">
              <input value={form.contactoTelefono} onChange={e => set('contactoTelefono', e.target.value)} style={INP} />
            </FG>
          </Grid3>
        </Seccion>

        <div>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 14 }}>
            ¿Requiere fecha especial de entrega?
          </h4>
          <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="radio" checked={form.fechaEspecial === 'no'} onChange={() => set('fechaEspecial', 'no')} /> No
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="radio" checked={form.fechaEspecial === 'si'} onChange={() => set('fechaEspecial', 'si')} /> Sí
            </label>
          </div>
          {form.fechaEspecial === 'si' && (
            <Grid2>
              <FG label="Fecha límite">
                <input type="date" value={form.fechaLimite} onChange={e => set('fechaLimite', e.target.value)} style={INP} />
              </FG>
              <FG label="Motivo">
                <input value={form.motivo} onChange={e => set('motivo', e.target.value)} placeholder="Ej. cierre contable, vencimiento de contrato, auditoría, visita de ente regulador, compromiso comercial" style={INP} />
              </FG>
            </Grid2>
          )}
        </div>
      </Card>

      <Card>
        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 14 }}>
          Vista previa
        </h4>
        <div style={{
          ...INP, whiteSpace: 'pre-wrap', lineHeight: 1.6, minHeight: 420,
          fontFamily: 'var(--mono)', fontSize: 12.5, background: 'var(--surface2)',
        }}>
          {construirTextoSaci(form)}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={limpiar} style={GHOST}>Limpiar formulario</button>
          <button onClick={copiar} style={{ ...PRI, background: copied ? 'var(--green, #16a34a)' : 'var(--accent)' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </Card>
    </div>
  )
}
