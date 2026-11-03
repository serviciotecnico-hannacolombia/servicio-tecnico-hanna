// Visor de un PDF de la biblioteca dentro de la app: usa el visor de PDF del
// navegador en un iframe (zoom, páginas, imprimir) con una URL firmada del
// bucket privado, más el botón de descarga con un nombre legible.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { urlVer, descargar } from './hooks/useBiblioteca'
import { GHOST, PRI, B_VIGENTE, B_PENDIENTE, B_OBSOLETA, ESTADO_LABEL, fmtFecha, nombreDescarga } from './estilos'
import type { BibliotecaDocumento, BibliotecaRevision } from '../../types'

const BADGE = { vigente: B_VIGENTE, pendiente_aprobacion: B_PENDIENTE, obsoleta: B_OBSOLETA }

export function VisorPdf({ documento, revision, onClose }: {
  documento: BibliotecaDocumento
  revision: BibliotecaRevision
  onClose: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    let vigente = true
    urlVer(revision.storage_path)
      .then(u => { if (vigente) setUrl(u) })
      .catch(e => { if (vigente) setError(e?.message || 'No se pudo abrir el PDF') })
    return () => { vigente = false }
  }, [revision.storage_path])

  async function bajar() {
    setDescargando(true)
    try {
      await descargar(revision.storage_path, nombreDescarga(documento, revision))
    } catch (e) {
      toast.error('No se pudo descargar: ' + ((e as Error)?.message || e))
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={documento.titulo} width="92vw">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          {documento.codigo && <span>Código: <strong style={{ color: 'var(--text)' }}>{documento.codigo}</strong></span>}
          <span>Revisión: <strong style={{ color: 'var(--text)' }}>{revision.revision}</strong></span>
          <span>Fecha: <strong style={{ color: 'var(--text)' }}>{fmtFecha(revision.fecha_aprobacion ?? revision.fecha_revision)}</strong></span>
          <span style={BADGE[revision.estado]}>{ESTADO_LABEL[revision.estado]}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {url && <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...GHOST, padding: '8px 14px', textDecoration: 'none' }}>Abrir en pestaña</a>}
          <button onClick={bajar} disabled={descargando} style={{ ...PRI, padding: '8px 14px' }}>
            <Download size={15} /> {descargando ? 'Descargando…' : 'Descargar'}
          </button>
        </div>
      </div>
      <div style={{ height: '72vh', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface2)' }}>
        {error ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>{error}</div>
        ) : url ? (
          <iframe src={url} title={documento.titulo} style={{ width: '100%', height: '100%', border: 'none' }} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spinner size={28} /></div>
        )}
      </div>
    </Modal>
  )
}
