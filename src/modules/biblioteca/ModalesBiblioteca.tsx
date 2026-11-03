// Modales de gestión de la Biblioteca (para quien gestiona): carpeta,
// documento nuevo / editar, nueva revisión, aprobar, historial y, solo Admin,
// los editores.
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, Download, Eye, FileUp, Trash2, UserPlus } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { useProfiles } from '../../hooks/useProfiles'
import {
  crearCarpeta, renombrarCarpeta, crearDocumento, editarDocumento, subirRevision, aprobarRevision,
  eliminarRevision, descargar, useInvalidateBiblioteca, useEditores, agregarEditor, quitarEditor, type DatosRevision,
} from './hooks/useBiblioteca'
import {
  INP, PRI, GHOST, ICON_BTN, TH, TD, B_VIGENTE, B_PENDIENTE, B_OBSOLETA, ESTADO_LABEL, MAX_PDF_MB,
  fmtFecha, hoyISO, nombreDescarga, norm,
} from './estilos'
import type { BibliotecaCarpeta, BibliotecaDocumento, BibliotecaRevision } from '../../types'

const BADGE = { vigente: B_VIGENTE, pendiente_aprobacion: B_PENDIENTE, obsoleta: B_OBSOLETA }

function mensaje(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = String((e as { message: unknown }).message)
    if (/duplicate key|unique/i.test(m)) return 'Ya existe un registro con ese nombre o código'
    return m
  }
  return String(e)
}

function Campo({ label, required, hint, children }: { label: string, required?: boolean, hint?: string, children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)' }}>
        {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{hint}</span>}
    </div>
  )
}

function Acciones({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>{children}</div>
}

// ── Carpeta ──────────────────────────────────────────────────────────────────

export function ModalCarpeta({ carpeta, siguienteOrden, onClose }: {
  carpeta?: BibliotecaCarpeta
  siguienteOrden: number
  onClose: () => void
}) {
  const invalidate = useInvalidateBiblioteca()
  const [nombre, setNombre] = useState(carpeta?.nombre ?? '')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (!nombre.trim()) { toast.error('Escribe el nombre de la carpeta'); return }
    setGuardando(true)
    try {
      if (carpeta) await renombrarCarpeta(carpeta.id, nombre)
      else await crearCarpeta(nombre, siguienteOrden)
      toast.success(carpeta ? 'Carpeta renombrada' : 'Carpeta creada')
      invalidate()
      onClose()
    } catch (e) {
      toast.error('Error: ' + mensaje(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={carpeta ? 'Renombrar carpeta' : 'Nueva carpeta'}>
      <Campo label="Nombre" required>
        <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus placeholder="Políticas de calidad"
          onKeyDown={e => { if (e.key === 'Enter') guardar() }} style={INP} />
      </Campo>
      <Acciones>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={PRI}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </Acciones>
    </Modal>
  )
}

// ── Campos de una revisión (documento nuevo y nueva revisión) ───────────────

function useCamposRevision(revisionInicial: string) {
  const [revision, setRevision] = useState(revisionInicial)
  const [fechaRevision, setFechaRevision] = useState(hoyISO())
  const [vigente, setVigente] = useState(true)
  const [fechaAprobacion, setFechaAprobacion] = useState(hoyISO())
  const [notas, setNotas] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function elegirArchivo(file: File | undefined) {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('El archivo debe ser un PDF'); if (inputRef.current) inputRef.current.value = ''; return
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      toast.error(`El PDF no puede pesar más de ${MAX_PDF_MB} MB`); if (inputRef.current) inputRef.current.value = ''; return
    }
    setArchivo(file)
  }

  function validar(): DatosRevision | null {
    if (!revision.trim()) { toast.error('Indica el número de revisión'); return null }
    if (!archivo) { toast.error('Adjunta el PDF'); return null }
    if (vigente && !fechaAprobacion) { toast.error('Indica la fecha de aprobación'); return null }
    return { revision, fecha_revision: fechaRevision || null, vigente, fecha_aprobacion: vigente ? fechaAprobacion : null, notas: notas || null }
  }

  const campos = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Campo label="Revisión" required>
          <input value={revision} onChange={e => setRevision(e.target.value)} placeholder="1" style={INP} />
        </Campo>
        <Campo label="Fecha de revisión">
          <input type="date" value={fechaRevision} onChange={e => setFechaRevision(e.target.value)} style={INP} />
        </Campo>
      </div>
      <Campo label="Estado" required>
        <div style={{ display: 'flex', gap: 8 }}>
          {([[true, 'Vigente (aprobado)'], [false, 'Pendiente de aprobación']] as const).map(([valor, label]) => (
            <button key={label} type="button" onClick={() => setVigente(valor)} style={{
              ...GHOST, flex: 1, justifyContent: 'center', padding: '9px 12px',
              ...(vigente === valor ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', fontWeight: 600 } : {}),
            }}>{label}</button>
          ))}
        </div>
      </Campo>
      {vigente && (
        <Campo label="Fecha de aprobación" required hint="Es la fecha que se muestra en la tabla. Si hay una revisión vigente, pasa a obsoleta.">
          <input type="date" value={fechaAprobacion} onChange={e => setFechaAprobacion(e.target.value)} style={INP} />
        </Campo>
      )}
      <Campo label="Archivo PDF" required hint={`Máximo ${MAX_PDF_MB} MB`}>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={e => elegirArchivo(e.target.files?.[0])}
          style={{ ...INP, padding: '8px 10px' }} />
      </Campo>
      <Campo label="Notas" hint="Opcional: qué cambió en esta revisión">
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} style={{ ...INP, resize: 'vertical' }} />
      </Campo>
    </>
  )

  return { campos, validar, archivo }
}

// ── Documento nuevo / editar ────────────────────────────────────────────────

export function ModalDocumento({ carpetas, carpetaInicial, documento, onClose }: {
  carpetas: BibliotecaCarpeta[]
  carpetaInicial: string | null
  documento?: BibliotecaDocumento
  onClose: () => void
}) {
  const invalidate = useInvalidateBiblioteca()
  const [carpetaId, setCarpetaId] = useState(documento?.carpeta_id ?? carpetaInicial ?? carpetas[0]?.id ?? '')
  const [titulo, setTitulo] = useState(documento?.titulo ?? '')
  const [codigo, setCodigo] = useState(documento?.codigo ?? '')
  const [guardando, setGuardando] = useState(false)
  const rev = useCamposRevision('1')

  async function guardar() {
    if (!carpetaId) { toast.error('Elige la carpeta'); return }
    if (!titulo.trim()) { toast.error('Escribe el título del documento'); return }
    const datosDoc = { carpeta_id: carpetaId, titulo, codigo: codigo || null }
    let datosRev: DatosRevision | null = null
    if (!documento) {
      datosRev = rev.validar()
      if (!datosRev) return
    }
    setGuardando(true)
    try {
      if (documento) await editarDocumento(documento.id, datosDoc)
      else await crearDocumento(datosDoc, datosRev!, rev.archivo!)
      toast.success(documento ? 'Documento actualizado' : 'Documento agregado')
      invalidate()
      onClose()
    } catch (e) {
      toast.error('Error: ' + mensaje(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={documento ? 'Editar documento' : 'Nuevo documento'} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Campo label="Carpeta" required>
          <select value={carpetaId} onChange={e => setCarpetaId(e.target.value)} style={INP}>
            {carpetas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
        <Campo label="Título" required>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus
            placeholder="POLÍTICA DIAGNÓSTICOS, REPARACIONES, DEVOLUCIONES Y GARANTÍAS" style={INP} />
        </Campo>
        <Campo label="Código">
          <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="PL.ST.01" style={INP} />
        </Campo>
        {!documento && rev.campos}
      </div>
      <Acciones>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={PRI}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </Acciones>
    </Modal>
  )
}

// ── Nueva revisión ───────────────────────────────────────────────────────────

function siguienteRevision(doc: BibliotecaDocumento): string {
  const n = Math.max(0, ...doc.revisiones.map(r => Number(r.revision)).filter(Number.isFinite))
  return String(n + 1)
}

export function ModalRevision({ documento, onClose }: { documento: BibliotecaDocumento, onClose: () => void }) {
  const invalidate = useInvalidateBiblioteca()
  const [guardando, setGuardando] = useState(false)
  const rev = useCamposRevision(siguienteRevision(documento))

  async function guardar() {
    const datos = rev.validar()
    if (!datos) return
    setGuardando(true)
    try {
      await subirRevision(documento.id, datos, rev.archivo!)
      toast.success(datos.vigente ? 'Revisión vigente cargada' : 'Revisión cargada, pendiente de aprobación')
      invalidate()
      onClose()
    } catch (e) {
      toast.error('Error: ' + mensaje(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Nueva revisión — ${documento.codigo || documento.titulo}`} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{rev.campos}</div>
      <Acciones>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={PRI}><FileUp size={15} /> {guardando ? 'Subiendo…' : 'Subir revisión'}</button>
      </Acciones>
    </Modal>
  )
}

// ── Aprobar ──────────────────────────────────────────────────────────────────

export function ModalAprobar({ documento, revision, onClose }: {
  documento: BibliotecaDocumento
  revision: BibliotecaRevision
  onClose: () => void
}) {
  const invalidate = useInvalidateBiblioteca()
  const [fecha, setFecha] = useState(hoyISO())
  const [guardando, setGuardando] = useState(false)
  const hayVigente = documento.revisiones.some(r => r.estado === 'vigente')

  async function aprobar() {
    if (!fecha) { toast.error('Indica la fecha de aprobación'); return }
    setGuardando(true)
    try {
      await aprobarRevision(revision.id, fecha)
      toast.success(`Revisión ${revision.revision} aprobada`)
      invalidate()
      onClose()
    } catch (e) {
      toast.error('Error: ' + mensaje(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Aprobar revisión ${revision.revision}`}>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
        {documento.codigo ? `${documento.codigo} — ` : ''}{documento.titulo}.
        {hayVigente && ' La revisión vigente actual pasa a obsoleta.'}
      </p>
      <Campo label="Fecha de aprobación" required>
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={INP} />
      </Campo>
      <Acciones>
        <button onClick={onClose} style={GHOST}>Cancelar</button>
        <button onClick={aprobar} disabled={guardando} style={PRI}><Check size={15} /> {guardando ? 'Aprobando…' : 'Aprobar'}</button>
      </Acciones>
    </Modal>
  )
}

// ── Historial de revisiones ─────────────────────────────────────────────────

export function ModalHistorial({ documento, onVer, onClose }: {
  documento: BibliotecaDocumento
  onVer: (r: BibliotecaRevision) => void
  onClose: () => void
}) {
  const invalidate = useInvalidateBiblioteca()
  const { data: profiles = [] } = useProfiles()
  const nombre = (id: string | null) => {
    const p = profiles.find(x => x.id === id)
    return p?.full_name || p?.email || '—'
  }

  async function borrar(r: BibliotecaRevision) {
    if (!confirm(`¿Eliminar la revisión ${r.revision} y su PDF? No se puede deshacer.`)) return
    try {
      await eliminarRevision(r.id, r.storage_path)
      toast.success('Revisión eliminada')
      invalidate()
    } catch (e) {
      toast.error('Error: ' + mensaje(e))
    }
  }

  return (
    <Modal open onClose={onClose} title={`Historial — ${documento.codigo || documento.titulo}`} width={820}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Rev.</th><th style={TH}>Estado</th><th style={TH}>F. revisión</th>
              <th style={TH}>F. aprobación</th><th style={TH}>Subida por</th><th style={TH}>Notas</th><th style={TH} />
            </tr>
          </thead>
          <tbody>
            {documento.revisiones.map(r => (
              <tr key={r.id}>
                <td style={{ ...TD, fontFamily: 'var(--mono)', fontWeight: 700 }}>{r.revision}</td>
                <td style={TD}><span style={BADGE[r.estado]}>{ESTADO_LABEL[r.estado]}</span></td>
                <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{fmtFecha(r.fecha_revision)}</td>
                <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{fmtFecha(r.fecha_aprobacion)}</td>
                <td style={TD}>{nombre(r.subido_por)}<div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{fmtFecha(r.created_at)}</div></td>
                <td style={{ ...TD, color: 'var(--muted)', fontSize: 12 }}>{r.notas || '—'}</td>
                <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                  <button title="Ver" onClick={() => onVer(r)} style={ICON_BTN}><Eye size={15} /></button>
                  <button title="Descargar" onClick={() => descargar(r.storage_path, nombreDescarga(documento, r)).catch(e => toast.error(mensaje(e)))} style={ICON_BTN}><Download size={15} /></button>
                  {r.estado !== 'vigente' && (
                    <button title="Eliminar revisión" onClick={() => borrar(r)} style={{ ...ICON_BTN, color: 'var(--red)' }}><Trash2 size={15} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

// ── Editores (solo Admin) ───────────────────────────────────────────────────
// Personas que, sin tener la capability por rol, pueden crear, editar,
// aprobar y borrar carpetas y documentos de la biblioteca.

export function ModalEditores({ onClose }: { onClose: () => void }) {
  const invalidate = useInvalidateBiblioteca()
  const { data: profiles = [] } = useProfiles()
  const { data: editores = [] } = useEditores()
  const [busqueda, setBusqueda] = useState('')
  const [activo, setActivo] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const ids = new Set(editores.map(e => e.user_id))
  const nombre = (id: string) => {
    const p = profiles.find(x => x.id === id)
    return p?.full_name || p?.email || 'Usuario'
  }
  // Sugerencias: usuarios activos que aún no son editores, por nombre o correo (sin tildes).
  const q = norm(busqueda.trim())
  const sugerencias = q
    ? profiles
      .filter(p => p.activo && !ids.has(p.id) && norm(`${p.full_name ?? ''} ${p.email}`).includes(q))
      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email, 'es'))
      .slice(0, 8)
    : []

  async function agregar(id: string) {
    setGuardando(true)
    try {
      await agregarEditor(id)
      toast.success(`${nombre(id)} ahora puede gestionar la biblioteca`)
      setBusqueda('')
      setActivo(0)
      invalidate()
    } catch (e) {
      toast.error('Error: ' + mensaje(e))
    } finally {
      setGuardando(false)
    }
  }

  async function quitar(id: string) {
    if (!confirm(`¿Quitar a ${nombre(id)} de los editores de la biblioteca?`)) return
    try {
      await quitarEditor(id)
      toast.success('Editor quitado')
      invalidate()
    } catch (e) {
      toast.error('Error: ' + mensaje(e))
    }
  }

  return (
    <Modal open onClose={onClose} title="Editores de la biblioteca" width={520}>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
        Pueden agregar, editar, aprobar y borrar carpetas y documentos. El rol Admin ya puede hacerlo siempre.
      </p>
      <div style={{ position: 'relative' }}>
        <UserPlus size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
        <input
          value={busqueda}
          autoFocus
          disabled={guardando}
          onChange={e => { setBusqueda(e.target.value); setActivo(0) }}
          onKeyDown={e => {
            if (!sugerencias.length) return
            if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(i => Math.min(sugerencias.length - 1, i + 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(i => Math.max(0, i - 1)) }
            if (e.key === 'Enter') { e.preventDefault(); agregar(sugerencias[activo].id) }
          }}
          placeholder="Escribe el nombre o correo del usuario…"
          style={{ ...INP, paddingLeft: 36 }}
        />
        {q && (
          <div style={{ marginTop: 4, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', overflow: 'hidden' }}>
            {sugerencias.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--muted)' }}>Sin usuarios que coincidan (o ya son editores).</div>
            ) : sugerencias.map((p, i) => (
              <button key={p.id} type="button" onMouseEnter={() => setActivo(i)} onClick={() => agregar(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left',
                  padding: '9px 12px', border: 'none', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer',
                  fontFamily: 'var(--sans)', background: i === activo ? 'var(--accent-bg)' : 'transparent', color: 'var(--text)',
                }}>
                <span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.full_name || p.email}</span>
                  {p.full_name && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{p.email}</span>}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>+ Agregar</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
        {editores.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--muted)', padding: 14, textAlign: 'center' }}>Todavía no hay editores agregados.</p>
        ) : editores.map((e, i) => (
          <div key={e.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{nombre(e.user_id)}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                {profiles.find(p => p.id === e.user_id)?.email} · desde {fmtFecha(e.created_at)}
              </div>
            </div>
            <button title="Quitar editor" onClick={() => quitar(e.user_id)} style={{ ...ICON_BTN, color: 'var(--red)' }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
