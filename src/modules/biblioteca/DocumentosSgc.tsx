// Pestaña "Documentos SGC": carpetas a la izquierda y, a la derecha, la tabla
// de documentos (título, código, revisión vigente, fecha y estado). Clic en
// una fila abre el visor. La gestión (carpetas, documentos, revisiones y
// aprobación) solo aparece para quien gestiona: biblioteca_gestionar por rol
// o estar en la lista de editores que elige el Admin.
import { lazy, Suspense, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, Download, Eye, FileUp, Folder, FolderPlus, History, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import { useCarpetas, useDocumentos, useInvalidateBiblioteca, usePuedeGestionar, eliminarCarpeta, eliminarDocumento, descargar } from './hooks/useBiblioteca'
import {
  INP, PRI, ICON_BTN, TH, TD, B_VIGENTE, B_PENDIENTE, fmtFecha, norm, vigenteDe, pendienteDe, nombreDescarga,
} from './estilos'
import { ModalCarpeta, ModalDocumento, ModalRevision, ModalAprobar, ModalHistorial } from './ModalesBiblioteca'
// pdf.js pesa: el visor se carga solo cuando se abre un documento.
const VisorPdf = lazy(() => import('./VisorPdf').then(m => ({ default: m.VisorPdf })))
import type { BibliotecaCarpeta, BibliotecaDocumento, BibliotecaRevision } from '../../types'

type ModalActivo =
  | { tipo: 'carpeta', carpeta?: BibliotecaCarpeta }
  | { tipo: 'documento', documento?: BibliotecaDocumento }
  | { tipo: 'revision', documento: BibliotecaDocumento }
  | { tipo: 'aprobar', documento: BibliotecaDocumento, revision: BibliotecaRevision }
  | { tipo: 'historial', documento: BibliotecaDocumento }
  | { tipo: 'ver', documento: BibliotecaDocumento, revision: BibliotecaRevision }

const CARD: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }

export function DocumentosSgc() {
  const gestiona = usePuedeGestionar()
  const { data: carpetas = [], isLoading: cargandoCarpetas } = useCarpetas()
  const { data: documentos = [], isLoading: cargandoDocs } = useDocumentos()
  const invalidate = useInvalidateBiblioteca()
  const [carpetaSel, setCarpetaSel] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<ModalActivo | null>(null)

  const porCarpeta = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of documentos) m.set(d.carpeta_id, (m.get(d.carpeta_id) ?? 0) + 1)
    return m
  }, [documentos])

  // Con texto en el buscador se busca en todas las carpetas.
  const q = norm(busqueda.trim())
  const visibles = documentos.filter(d =>
    q ? norm(`${d.titulo} ${d.codigo ?? ''}`).includes(q) : !carpetaSel || d.carpeta_id === carpetaSel)
  const nombreCarpeta = (id: string) => carpetas.find(c => c.id === id)?.nombre ?? ''

  async function borrarCarpeta(c: BibliotecaCarpeta) {
    if (porCarpeta.get(c.id)) { toast.error('La carpeta tiene documentos: muévelos o bórralos antes'); return }
    if (!confirm(`¿Eliminar la carpeta "${c.nombre}"?`)) return
    try {
      await eliminarCarpeta(c.id)
      if (carpetaSel === c.id) setCarpetaSel(null)
      toast.success('Carpeta eliminada')
      invalidate()
    } catch (e) {
      toast.error('Error: ' + ((e as Error)?.message || e))
    }
  }

  async function borrarDocumento(d: BibliotecaDocumento) {
    if (!confirm(`¿Eliminar "${d.codigo ? d.codigo + ' — ' : ''}${d.titulo}" con todas sus revisiones y PDF? No se puede deshacer.`)) return
    try {
      await eliminarDocumento(d)
      toast.success('Documento eliminado')
      invalidate()
    } catch (e) {
      toast.error('Error: ' + ((e as Error)?.message || e))
    }
  }

  function bajar(d: BibliotecaDocumento, r: BibliotecaRevision) {
    descargar(r.storage_path, nombreDescarga(d, r)).catch(e => toast.error('No se pudo descargar: ' + ((e as Error)?.message || e)))
  }

  if (cargandoCarpetas || cargandoDocs) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Spinner size={32} /></div>
  }

  const itemCarpeta = (activa: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px', borderRadius: 8,
    border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, textAlign: 'left',
    background: activa ? 'var(--accent-bg)' : 'transparent', color: activa ? 'var(--accent)' : 'var(--text)',
    fontWeight: activa ? 700 : 500,
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 16, alignItems: 'flex-start' }}>
      {/* Carpetas */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--mono)' }}>Carpetas</span>
          {gestiona && (
            <button title="Nueva carpeta" onClick={() => setModal({ tipo: 'carpeta' })} style={ICON_BTN}><FolderPlus size={16} /></button>
          )}
        </div>
        <button onClick={() => setCarpetaSel(null)} style={itemCarpeta(!carpetaSel)}>
          <Folder size={15} /> <span style={{ flex: 1 }}>Todas</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{documentos.length}</span>
        </button>
        {carpetas.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setCarpetaSel(c.id)} style={itemCarpeta(carpetaSel === c.id)}>
              <Folder size={15} /> <span style={{ flex: 1 }}>{c.nombre}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{porCarpeta.get(c.id) ?? 0}</span>
            </button>
            {gestiona && (
              <>
                <button title="Renombrar" onClick={() => setModal({ tipo: 'carpeta', carpeta: c })} style={ICON_BTN}><Pencil size={13} /></button>
                <button title="Eliminar carpeta" onClick={() => borrarCarpeta(c)} style={ICON_BTN}><Trash2 size={13} /></button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Documentos */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por título o código en todas las carpetas..."
              style={{ ...INP, paddingLeft: 36 }} />
          </div>
          {gestiona && carpetas.length > 0 && (
            <button onClick={() => setModal({ tipo: 'documento' })} style={PRI}><Plus size={15} /> Nuevo documento</button>
          )}
        </div>

        {visibles.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', padding: '30px 0', textAlign: 'center' }}>
            {q ? `Sin resultados para "${busqueda.trim()}"` : 'Esta carpeta no tiene documentos todavía.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Título</th>
                  <th style={TH}>Código</th>
                  <th style={TH}>Revisión</th>
                  <th style={TH}>Fecha</th>
                  <th style={TH}>Estado</th>
                  <th style={TH} />
                </tr>
              </thead>
              <tbody>
                {visibles.map(d => {
                  const vig = vigenteDe(d)
                  const pend = pendienteDe(d)
                  const mostrada = vig ?? pend
                  return (
                    <tr key={d.id} onClick={() => mostrada && setModal({ tipo: 'ver', documento: d, revision: mostrada })}
                      style={{ cursor: mostrada ? 'pointer' : 'default' }}>
                      <td style={{ ...TD, fontWeight: 600 }}>
                        {d.titulo}
                        {(q || !carpetaSel) && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginTop: 2 }}>{nombreCarpeta(d.carpeta_id)}</div>}
                      </td>
                      <td style={{ ...TD, fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{d.codigo || '—'}</td>
                      <td style={{ ...TD, fontFamily: 'var(--mono)' }}>{mostrada?.revision ?? '—'}</td>
                      <td style={{ ...TD, fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                        {fmtFecha(vig?.fecha_aprobacion ?? pend?.fecha_revision ?? null)}
                      </td>
                      <td style={TD}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          {vig && <span style={B_VIGENTE}>Vigente</span>}
                          {pend && <span style={B_PENDIENTE}>{vig ? `Rev. ${pend.revision} en aprobación` : 'Pendiente de aprobación'}</span>}
                        </div>
                      </td>
                      <td style={{ ...TD, whiteSpace: 'nowrap', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        {mostrada && (
                          <>
                            <button title="Ver" onClick={() => setModal({ tipo: 'ver', documento: d, revision: mostrada })} style={ICON_BTN}><Eye size={15} /></button>
                            <button title="Descargar" onClick={() => bajar(d, mostrada)} style={ICON_BTN}><Download size={15} /></button>
                          </>
                        )}
                        {gestiona && (
                          <>
                            {pend && (
                              <button title={`Aprobar revisión ${pend.revision}`} onClick={() => setModal({ tipo: 'aprobar', documento: d, revision: pend })}
                                style={{ ...ICON_BTN, color: 'var(--green, #16a34a)' }}><Check size={15} /></button>
                            )}
                            <button title="Nueva revisión" onClick={() => setModal({ tipo: 'revision', documento: d })} style={ICON_BTN}><FileUp size={15} /></button>
                            <button title="Historial de revisiones" onClick={() => setModal({ tipo: 'historial', documento: d })} style={ICON_BTN}><History size={15} /></button>
                            <button title="Editar datos" onClick={() => setModal({ tipo: 'documento', documento: d })} style={ICON_BTN}><Pencil size={15} /></button>
                            <button title="Eliminar documento" onClick={() => borrarDocumento(d)} style={{ ...ICON_BTN, color: 'var(--red)' }}><Trash2 size={15} /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {gestiona && carpetas.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>Crea una carpeta para empezar a cargar documentos.</p>
        )}
      </div>

      {modal?.tipo === 'carpeta' && (
        <ModalCarpeta carpeta={modal.carpeta} siguienteOrden={Math.max(0, ...carpetas.map(c => c.orden)) + 1} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'documento' && (
        <ModalDocumento carpetas={carpetas} carpetaInicial={carpetaSel} documento={modal.documento} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'revision' && <ModalRevision documento={modal.documento} onClose={() => setModal(null)} />}
      {modal?.tipo === 'aprobar' && <ModalAprobar documento={modal.documento} revision={modal.revision} onClose={() => setModal(null)} />}
      {modal?.tipo === 'historial' && (
        <ModalHistorial
          documento={documentos.find(d => d.id === modal.documento.id) ?? modal.documento}
          onVer={r => setModal({ tipo: 'ver', documento: modal.documento, revision: r })}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === 'ver' && (
        <Suspense fallback={null}>
          <VisorPdf documento={modal.documento} revision={modal.revision} onClose={() => setModal(null)} />
        </Suspense>
      )}
    </div>
  )
}
