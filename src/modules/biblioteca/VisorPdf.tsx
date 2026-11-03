// Visor propio de los PDF de la biblioteca (pdf.js): las páginas se dibujan en
// canvas, una debajo de otra, con una barra al estilo de la app — página X de
// N, zoom, ajustar al ancho, pantalla completa y Descargar. Se ve igual en
// cualquier navegador y no trae las herramientas de dibujo del visor nativo.
// Se monta con un portal en <body>: dentro del layout quedaba debajo del menú.
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Download, Maximize, Minimize, Minus, MoveHorizontal, Plus, X } from 'lucide-react'
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Spinner } from '../../components/ui/Spinner'
import { urlVer, descargar } from './hooks/useBiblioteca'
import { PRI, B_VIGENTE, B_PENDIENTE, B_OBSOLETA, ESTADO_LABEL, fmtFecha, nombreDescarga } from './estilos'
import type { BibliotecaDocumento, BibliotecaRevision } from '../../types'

GlobalWorkerOptions.workerSrc = workerUrl

const BADGE = { vigente: B_VIGENTE, pendiente_aprobacion: B_PENDIENTE, obsoleta: B_OBSOLETA }
const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const GAP = 16

interface Tamano { ancho: number, alto: number }

const BTN: React.CSSProperties = {
  background: 'none', border: '1px solid transparent', borderRadius: 7, cursor: 'pointer', color: 'var(--text)',
  width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const SEP: React.CSSProperties = { width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }

// Una página: reserva su alto desde el principio (para que el scroll y el
// "página X de N" funcionen) y se dibuja solo cuando se acerca a la vista.
function PaginaPdf({ pdf, numero, tamano, escala, raiz }: {
  pdf: PDFDocumentProxy
  numero: number
  tamano: Tamano
  escala: number
  raiz: HTMLDivElement | null
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = contenedor.current
    if (!el || !raiz) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { root: raiz, rootMargin: '800px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [raiz])

  useEffect(() => {
    if (!visible) return
    let tarea: RenderTask | null = null
    let cancelado = false
    pdf.getPage(numero).then(page => {
      if (cancelado || !canvas.current) return
      const dpr = window.devicePixelRatio || 1
      const vp = page.getViewport({ scale: escala * dpr })
      const c = canvas.current
      c.width = Math.floor(vp.width)
      c.height = Math.floor(vp.height)
      tarea = page.render({ canvas: c, viewport: vp })
      tarea.promise.catch(() => { /* cancelado al cambiar el zoom */ })
    })
    return () => { cancelado = true; tarea?.cancel() }
  }, [visible, pdf, numero, escala])

  return (
    <div ref={contenedor} data-pagina={numero} style={{
      width: tamano.ancho * escala, height: tamano.alto * escala, flexShrink: 0,
      background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.18)', borderRadius: 2, overflow: 'hidden',
    }}>
      <canvas ref={canvas} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export function VisorPdf({ documento, revision, onClose }: {
  documento: BibliotecaDocumento
  revision: BibliotecaRevision
  onClose: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [tamanos, setTamanos] = useState<Tamano[]>([])
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState<number | 'ancho'>('ancho')
  const [anchoDisponible, setAnchoDisponible] = useState(0)
  const [paginaActual, setPaginaActual] = useState(1)
  const [paginaInput, setPaginaInput] = useState('1')
  const [completa, setCompleta] = useState(false)
  const [descargando, setDescargando] = useState(false)

  // Carga del PDF (URL firmada del bucket privado) y del tamaño de cada página.
  useEffect(() => {
    let vivo = true
    let tarea: ReturnType<typeof getDocument> | null = null
    ;(async () => {
      try {
        const url = await urlVer(revision.storage_path)
        if (!vivo) return
        tarea = getDocument({ url })
        const doc = await tarea.promise
        const t: Tamano[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const vp = (await doc.getPage(i)).getViewport({ scale: 1 })
          t.push({ ancho: vp.width, alto: vp.height })
        }
        if (!vivo) return
        setTamanos(t)
        setPdf(doc)
      } catch (e) {
        if (vivo) setError((e as Error)?.message || 'No se pudo abrir el PDF')
      }
    })()
    return () => { vivo = false; tarea?.destroy() }
  }, [revision.storage_path])

  // Ancho disponible para "ajustar al ancho" (cambia al redimensionar o en pantalla completa).
  useEffect(() => {
    if (!scroller) return
    const ro = new ResizeObserver(() => setAnchoDisponible(scroller.clientWidth))
    ro.observe(scroller)
    return () => ro.disconnect()
  }, [scroller])

  const anchoMax = Math.max(1, ...tamanos.map(t => t.ancho))
  const escalaAncho = anchoDisponible ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (anchoDisponible - 48) / anchoMax)) : 1
  const escala = zoom === 'ancho' ? escalaAncho : zoom

  // "Página X de N" según la página que ocupa la mitad superior de la vista.
  const alScroll = useCallback(() => {
    if (!scroller) return
    const limite = scroller.scrollTop + scroller.clientHeight * 0.35
    let actual = 1
    for (const el of scroller.querySelectorAll<HTMLElement>('[data-pagina]')) {
      if (el.offsetTop <= limite) actual = Number(el.dataset.pagina)
    }
    setPaginaActual(actual)
    setPaginaInput(String(actual))
  }, [scroller])

  function irA(n: number) {
    const total = tamanos.length
    if (!scroller || !total) return
    const destino = Math.min(total, Math.max(1, n))
    const el = scroller.querySelector<HTMLElement>(`[data-pagina="${destino}"]`)
    if (el) scroller.scrollTo({ top: el.offsetTop - GAP, behavior: 'smooth' })
  }

  function cambiarZoom(delta: number) {
    const base = zoom === 'ancho' ? escalaAncho : zoom
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((base + delta) * 10) / 10)))
  }

  async function alternarCompleta() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await panel.current?.requestFullscreen()
  }

  useEffect(() => {
    const alCambiar = () => setCompleta(!!document.fullscreenElement)
    const teclas = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.fullscreenElement) onClose() }
    document.addEventListener('fullscreenchange', alCambiar)
    window.addEventListener('keydown', teclas)
    return () => {
      document.removeEventListener('fullscreenchange', alCambiar)
      window.removeEventListener('keydown', teclas)
    }
  }, [onClose])

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

  const total = tamanos.length

  return createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,15,26,0.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div ref={panel} onClick={e => e.stopPropagation()} style={{
        width: completa ? '100vw' : '94vw', height: completa ? '100vh' : '92vh', maxWidth: completa ? undefined : 1400,
        background: 'var(--surface)', borderRadius: completa ? 0 : 'var(--radius-lg)', border: completa ? 'none' : '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 18px 10px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{documento.titulo}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 5, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {documento.codigo && <span>Código <strong style={{ color: 'var(--text)' }}>{documento.codigo}</strong></span>}
              <span>Revisión <strong style={{ color: 'var(--text)' }}>{revision.revision}</strong></span>
              <span>Fecha <strong style={{ color: 'var(--text)' }}>{fmtFecha(revision.fecha_aprobacion ?? revision.fecha_revision)}</strong></span>
              <span style={BADGE[revision.estado]}>{ESTADO_LABEL[revision.estado]}</span>
            </div>
          </div>
          <button title="Cerrar" onClick={onClose} style={{ ...BTN, background: 'var(--surface2)', borderRadius: '50%', color: 'var(--muted)', flexShrink: 0 }}><X size={16} /></button>
        </div>

        {/* Barra */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          padding: '6px 14px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button title="Página anterior" onClick={() => irA(paginaActual - 1)} disabled={paginaActual <= 1} style={{ ...BTN, opacity: paginaActual <= 1 ? 0.4 : 1 }}><ChevronLeft size={17} /></button>
            <input value={paginaInput} onChange={e => setPaginaInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') irA(Number(paginaInput) || 1) }}
              onBlur={() => setPaginaInput(String(paginaActual))}
              style={{ width: 42, height: 30, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13 }} />
            <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--mono)', minWidth: 42 }}>de {total || '—'}</span>
            <button title="Página siguiente" onClick={() => irA(paginaActual + 1)} disabled={paginaActual >= total} style={{ ...BTN, opacity: paginaActual >= total ? 0.4 : 1 }}><ChevronRight size={17} /></button>
            <span style={SEP} />
            <button title="Alejar" onClick={() => cambiarZoom(-0.1)} style={BTN}><Minus size={16} /></button>
            <span style={{ fontSize: 12.5, fontFamily: 'var(--mono)', minWidth: 46, textAlign: 'center', color: 'var(--text)' }}>{Math.round(escala * 100)}%</span>
            <button title="Acercar" onClick={() => cambiarZoom(0.1)} style={BTN}><Plus size={16} /></button>
            <button title="Ajustar al ancho" onClick={() => setZoom('ancho')}
              style={{ ...BTN, ...(zoom === 'ancho' ? { background: 'var(--accent-bg)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {}) }}>
              <MoveHorizontal size={16} />
            </button>
            <button title={completa ? 'Salir de pantalla completa' : 'Pantalla completa'} onClick={alternarCompleta} style={BTN}>
              {completa ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
          <button onClick={bajar} disabled={descargando} style={{ ...PRI, padding: '7px 14px' }}>
            <Download size={15} /> {descargando ? 'Descargando…' : 'Descargar'}
          </button>
        </div>

        {/* Páginas */}
        <div ref={setScroller} onScroll={alScroll} style={{ flex: 1, overflow: 'auto', background: 'var(--surface2)', position: 'relative' }}>
          {error ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>{error}</div>
          ) : !pdf ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spinner size={28} /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: GAP, padding: `${GAP}px 24px`, minWidth: 'fit-content' }}>
              {tamanos.map((t, i) => (
                <PaginaPdf key={i} pdf={pdf} numero={i + 1} tamano={t} escala={escala} raiz={scroller} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
