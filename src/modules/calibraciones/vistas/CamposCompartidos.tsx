// Bloques de campos reutilizados entre el formulario completo de una orden
// y las vistas dedicadas por estado (VistaMantenimiento, VistaVisitaProgramada…).
import { AlertTriangle } from 'lucide-react'
import { FG, Seccion, Grid2, INP } from '../ui'
import type { Asesor, OrdenCalibracion } from '../../../types'

// El No. de Orden de Compra siempre tiene el formato ST{número}-{año} — al
// usuario solo le pedimos el número, el resto se arma solo.
export function parseNumeroOC(raw: string | null | undefined): { numero: string, anio: string } {
  const m = (raw || '').match(/^ST(\d+)-(\d{4})$/i)
  if (m) return { numero: m[1], anio: m[2] }
  return { numero: raw || '', anio: String(new Date().getFullYear()) }
}

// Siguiente consecutivo disponible para un año: el mayor número usado ese
// año entre las órdenes existentes, más uno (1 si no hay ninguna todavía).
export function sugerirNumeroOC(ordenes: Pick<OrdenCalibracion, 'numero_oc'>[], anio: string): number {
  const max = ordenes.reduce((acc, o) => {
    const p = parseNumeroOC(o.numero_oc)
    if (p.anio !== anio) return acc
    const n = parseInt(p.numero, 10)
    return Number.isFinite(n) && n > acc ? n : acc
  }, 0)
  return max + 1
}

// Orden existente (distinta de excluirId) que ya usa este mismo No. de
// Orden de Compra — comparación case-insensitive sobre el valor completo
// (ST{número}-{año}), para detectar duplicados al escribir.
export function ordenConMismoNumeroOC(
  ordenes: Pick<OrdenCalibracion, 'id' | 'numero_oc' | 'cliente'>[],
  numeroOC: string | null | undefined,
  excluirId?: string,
): Pick<OrdenCalibracion, 'id' | 'numero_oc' | 'cliente'> | undefined {
  const norm = (numeroOC || '').trim().toLowerCase()
  if (!norm) return undefined
  return ordenes.find(o => o.id !== excluirId && (o.numero_oc || '').trim().toLowerCase() === norm)
}

// Link solicitud SACI y Link OTST no son campos libres: se arman a partir
// del código SACI/OTST.
export function linkSaci(saci: string): string | null {
  const v = saci.trim()
  return v ? `https://regional.hannacolombia.com/saci/item/${v}` : null
}
export function linkOtst(otst: string): string | null {
  const v = otst.trim()
  return v ? `https://intranet.hannacolombia.com/stecnico/item/${v}` : null
}

// Una orden puede tener más de un equipo, cada uno con su propio OTST — el
// campo admite varios códigos separados por coma y cada uno arma su link.
export function parseOtstCodes(raw: string | null | undefined): string[] {
  return (raw || '').split(',').map(v => v.trim()).filter(Boolean)
}

export function IdentificacionFields({ form, set, esNueva, asesores, asesorSeleccionado, ordenes }: {
  form: Partial<OrdenCalibracion>
  set: <K extends keyof OrdenCalibracion>(key: K, value: OrdenCalibracion[K]) => void
  esNueva: boolean
  asesores: Asesor[]
  asesorSeleccionado: Asesor | undefined
  ordenes: Pick<OrdenCalibracion, 'id' | 'numero_oc' | 'cliente'>[]
}) {
  const { numero, anio } = parseNumeroOC(form.numero_oc)
  const sugerido = sugerirNumeroOC(ordenes, anio)
  const duplicada = ordenConMismoNumeroOC(ordenes, form.numero_oc, form.id)

  return (
    <Seccion titulo="Identificación">
      <Grid2>
        <FG label="Cliente" required={esNueva}>
          <input value={form.cliente || ''} onChange={e => set('cliente', e.target.value.toUpperCase())} style={INP} autoFocus={esNueva} />
        </FG>
        <FG label="No. Orden de Compra" required={esNueva}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>ST</span>
            <input
              value={numero}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '')
                set('numero_oc', digits ? `ST${digits}-${anio}` : '')
              }}
              inputMode="numeric"
              placeholder="211"
              style={{ ...INP, flex: 1, minWidth: 0, ...(duplicada ? { borderColor: 'var(--red-border)' } : {}) }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>-{anio}</span>
          </div>
          {esNueva && !numero && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
              Sugerido: <button
                type="button"
                onClick={() => set('numero_oc', `ST${sugerido}-${anio}`)}
                style={{
                  background: 'none', border: 'none', padding: 0, color: 'var(--accent)',
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline',
                }}
              >ST{sugerido}-{anio}</button> (siguiente consecutivo de {anio})
            </div>
          )}
          {duplicada && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--red)', marginTop: 5 }}>
              <AlertTriangle size={12} /> Ya existe una orden con este número — {duplicada.cliente}
            </div>
          )}
        </FG>
        <FG label="Correo cliente" required={esNueva}><input value={form.correo_cliente || ''} onChange={e => set('correo_cliente', e.target.value)} style={INP} /></FG>
        <FG label="Correo asesor(a)" required={esNueva}>
          <input value={form.correo_asesor || ''} onChange={e => set('correo_asesor', e.target.value)} list="asesores-sugeridos" style={INP} />
          <datalist id="asesores-sugeridos">
            {asesores.filter(a => a.activo).map(a => <option key={a.id} value={a.correo}>{a.nombre}{a.plataforma ? ` — ${a.plataforma}` : ''}</option>)}
          </datalist>
          {asesorSeleccionado && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
              {asesorSeleccionado.nombre}{asesorSeleccionado.plataforma ? ` — ${asesorSeleccionado.plataforma}` : ''}
            </div>
          )}
        </FG>
      </Grid2>
    </Seccion>
  )
}

export function ReferenciasFields({ form, setForm, set, esNueva }: {
  form: Partial<OrdenCalibracion>
  setForm: React.Dispatch<React.SetStateAction<Partial<OrdenCalibracion>>>
  set: <K extends keyof OrdenCalibracion>(key: K, value: OrdenCalibracion[K]) => void
  esNueva?: boolean
}) {
  return (
    <Seccion titulo="Referencias">
      <Grid2>
        <FG label="SACI">
          <input
            value={form.saci || ''}
            onChange={e => setForm(f => ({ ...f, saci: e.target.value, link_solicitud: linkSaci(e.target.value) }))}
            style={INP}
          />
        </FG>
        <FG label="Link solicitud SACI">
          {form.link_solicitud ? (
            <a href={form.link_solicitud} target="_blank" rel="noopener noreferrer" style={{
              ...INP, display: 'block', color: 'var(--accent)', textDecoration: 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{form.link_solicitud}</a>
          ) : (
            <div style={{ ...INP, color: 'var(--muted)' }}>Se genera al ingresar el SACI</div>
          )}
        </FG>
        <FG label="OTST">
          <input
            value={form.otst || ''}
            onChange={e => {
              const codigos = parseOtstCodes(e.target.value)
              setForm(f => ({
                ...f,
                otst: e.target.value,
                link_otst: codigos.map(linkOtst).filter(Boolean).join(', ') || null,
              }))
            }}
            placeholder="Separa varios códigos con coma: 1234, 5678"
            style={INP}
          />
        </FG>
        <FG label="Link OTST">
          {parseOtstCodes(form.otst).length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {parseOtstCodes(form.otst).map(codigo => (
                <a key={codigo} href={linkOtst(codigo)!} target="_blank" rel="noopener noreferrer" style={{
                  padding: '9px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--accent)', textDecoration: 'none', fontSize: 13, fontFamily: 'var(--sans)',
                }}>{codigo} ↗</a>
              ))}
            </div>
          ) : (
            <div style={{ ...INP, color: 'var(--muted)' }}>Se genera al ingresar el OTST</div>
          )}
        </FG>
        <FG label="RMV/FV" required={esNueva}><input value={form.rmv_fv || ''} onChange={e => set('rmv_fv', e.target.value)} style={INP} /></FG>
      </Grid2>
    </Seccion>
  )
}
