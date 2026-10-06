// Botones "Descargar CSV" / "Importar CSV" de cada sección de Configuración.
// Importar nunca guarda directo: arma un plan, lo muestra como vista previa
// (cambios antes → después, sin cambios y errores) y solo se aplica al
// confirmar, y únicamente si no hay errores.
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { leerCSV, type CsvLeido } from './csv'
import { useInvalidarMantInSitu } from './hooks/useMantInSitu'
import { GHOST, PRI } from './ui'
import type { PlanImportacion } from './importaciones'

const MAX_CAMBIOS_VISIBLES = 200

export function CsvAcciones({ titulo, ayuda, onExportar, planificar, deshabilitado }: {
  titulo: string
  ayuda: React.ReactNode
  onExportar: () => void
  planificar: (csv: CsvLeido) => PlanImportacion
  deshabilitado?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const invalidar = useInvalidarMantInSitu()
  const [plan, setPlan] = useState<PlanImportacion | null>(null)
  const [archivo, setArchivo] = useState('')
  const [aplicando, setAplicando] = useState(false)

  async function onArchivo(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    try {
      const csv = await leerCSV(file)
      if (!csv.filas.length) { toast.error('El archivo no tiene filas'); return }
      setArchivo(file.name)
      setPlan(planificar(csv))
    } catch (e) {
      toast.error('No se pudo leer el CSV: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function aplicar() {
    if (!plan) return
    setAplicando(true)
    const error = await plan.aplicar()
    setAplicando(false)
    if (error) { toast.error('Error al aplicar: ' + error); return }
    toast.success(`${plan.cambios.length} ${plan.cambios.length === 1 ? 'registro actualizado' : 'registros actualizados'}`)
    invalidar()
    setPlan(null)
  }

  const bloqueado = !!plan && plan.errores.length > 0

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onExportar} disabled={deshabilitado} style={{ ...GHOST, padding: '7px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Download size={13} /> Descargar CSV
        </button>
        <button onClick={() => inputRef.current?.click()} disabled={deshabilitado} style={{ ...GHOST, padding: '7px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Upload size={13} /> Importar CSV
        </button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={e => onArchivo(e.target.files?.[0])} />
      </div>

      {plan && (
        <Modal open onClose={() => !aplicando && setPlan(null)} title={`Importar — ${titulo}`} width={760}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontFamily: 'var(--mono)' }}>{archivo}</p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Contador valor={plan.cambios.length} label="con cambios" color="var(--accent)" />
            <Contador valor={plan.sinCambio} label="sin cambios" color="var(--muted)" />
            <Contador valor={plan.errores.length} label="errores" color={plan.errores.length ? 'var(--red)' : 'var(--muted)'} />
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, lineHeight: 1.55, marginBottom: 12 }}>
            {ayuda}
            <div style={{ marginTop: 6 }}>En Excel, guarda como <strong>CSV UTF-8</strong> para conservar las tildes.</div>
            {plan.camposIgnorados.length > 0 && (
              <div style={{ marginTop: 6 }}>Columnas que no vinieron (no se tocan): <strong>{plan.camposIgnorados.join(', ')}</strong></div>
            )}
          </div>

          {plan.errores.length > 0 && (
            <div style={{ border: '1px solid var(--red-border)', background: 'var(--red-bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, maxHeight: 180, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>
                <AlertTriangle size={14} /> Corrige estos errores en el archivo — no se aplicará nada mientras existan
              </div>
              {plan.errores.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text)' }}><span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>Fila {e.fila}:</span> {e.mensaje}</div>
              ))}
            </div>
          )}

          {plan.cambios.length > 0 ? (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', position: 'sticky', top: 0 }}>
                    {['Registro', 'Campo', 'Antes', 'Después'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '7px 10px', fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'var(--mono)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.cambios.slice(0, MAX_CAMBIOS_VISIBLES).flatMap(c => c.campos.map((campo, j) => (
                    <tr key={`${c.clave}-${campo.campo}`} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 10px', verticalAlign: 'top' }}>
                        {j === 0 && <><strong style={{ fontFamily: 'var(--mono)' }}>{c.clave}</strong>{c.detalle && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.detalle}</div>}</>}
                      </td>
                      <td style={{ padding: '6px 10px' }}>{campo.campo}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--muted)', textDecoration: 'line-through' }}>{campo.antes}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{campo.despues}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          ) : plan.errores.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', padding: '14px 0' }}>
              <CheckCircle2 size={16} /> El archivo coincide con lo guardado — no hay nada que actualizar.
            </div>
          )}
          {plan.cambios.length > MAX_CAMBIOS_VISIBLES && (
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>Mostrando {MAX_CAMBIOS_VISIBLES} de {plan.cambios.length} registros con cambios.</p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={() => setPlan(null)} disabled={aplicando} style={GHOST}>Cancelar</button>
            <button onClick={aplicar} disabled={aplicando || bloqueado || plan.cambios.length === 0} style={{ ...PRI, opacity: aplicando || bloqueado || plan.cambios.length === 0 ? .5 : 1 }}>
              {aplicando ? 'Aplicando…' : `✓ Aplicar ${plan.cambios.length} ${plan.cambios.length === 1 ? 'cambio' : 'cambios'}`}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function Contador({ valor, label, color }: { valor: number, label: string, color: string }) {
  return (
    <div style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
      <strong style={{ color, fontSize: 15, marginRight: 5 }}>{valor}</strong><span style={{ color: 'var(--muted)' }}>{label}</span>
    </div>
  )
}
