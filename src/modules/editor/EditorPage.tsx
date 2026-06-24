import { useState, useRef, useCallback, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Plantilla {
  id: string
  nombre: string
  categoria: string
  contenido: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const LS_KEY = 'hi_plantillas_v1'

const COLORS = [
  { value: 'red',       hex: '#e53935', label: 'Rojo' },
  { value: 'green',     hex: '#2e9e4e', label: 'Verde' },
  { value: 'orange',    hex: '#e07b00', label: 'Naranja' },
  { value: 'teal',      hex: '#007a72', label: 'Teal' },
  { value: 'goldenrod', hex: '#b8960a', label: 'Dorado' },
  { value: '#005eb8',   hex: '#005eb8', label: 'Azul' },
  { value: 'purple',    hex: '#7b2fa0', label: 'Morado' },
]

const HIGHLIGHTS = [
  { value: '#00ff00', label: 'Verde neón' },
  { value: '#ffff00', label: 'Amarillo' },
  { value: '#ffa04a', label: 'Naranja' },
  { value: '#f48fb1', label: 'Rosa' },
  { value: '#80deea', label: 'Celeste' },
]

const MARKERS: Record<string, string> = {
  check:           '<b><FONT COLOR="green">✔</FONT></b>',
  cross:           '<b><FONT COLOR="red">✘</FONT></b>',
  dash:            '<b><FONT COLOR="orange">-</FONT></b>',
  fuera:           '<FONT COLOR="red">✘ fuera de rango </FONT>',
  inestable:       '<FONT COLOR="orange">Inestable</FONT>',
  borroso:         '<FONT COLOR="teal">Borroso</FONT>',
  importante:      '<b><FONT COLOR="red">*IMPORTANTE*</FONT></b>',
  consideraciones: '<b><FONT COLOR="red">*CONSIDERACIONES*</FONT></b>',
  conclusion:      '<b><FONT COLOR="green">Conclusión</FONT></b>',
}

const MARKER_BTNS: [string, string, string][] = [
  ['check',           '✔',           '#2e9e4e'],
  ['cross',           '✘',           '#e53935'],
  ['dash',            '−',           '#e07b00'],
  ['fuera',           '✘ fuera',     '#e53935'],
  ['inestable',       '⚡ Inest.',   '#e07b00'],
  ['borroso',         '👁 Borroso',  '#007a72'],
  ['importante',      '⚠ IMP',       '#e53935'],
  ['consideraciones', '📋 CONS',     'var(--text)'],
  ['conclusion',      '★ Concl.',    '#2e9e4e'],
]

// ── HTML conversion ────────────────────────────────────────────────────────────

const CMAP: Record<string, string> = {
  '#e53935': 'red',   '#f44336': 'red',   '#cc0000': 'red',
  '#2e9e4e': 'green', '#4caf50': 'green', '#008000': 'green',
  '#e07b00': 'orange','#fb8c00': 'orange','#ff9800': 'orange',
  '#007a72': 'teal',  '#009688': 'teal',
  '#b8960a': 'goldenrod', '#daa520': 'goldenrod',
  '#005eb8': '#005eb8',
  '#7b2fa0': 'purple','#9c27b0': 'purple',
}

function rgbToHex(rgb: string): string | null {
  const m = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (!m) return null
  return '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('')
}
function rgbToName(rgb: string): string | null {
  const h = rgbToHex(rgb)
  return h ? (CMAP[h.toLowerCase()] ?? null) : null
}

function stripColors(node: Node) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const el = child as Element
    const tag = el.tagName.toLowerCase()
    if (tag === 'font' && (el.getAttribute('color') || el.getAttribute('COLOR'))) {
      while (el.firstChild) node.insertBefore(el.firstChild, el)
      node.removeChild(el)
    } else {
      const hel = el as HTMLElement
      if (tag === 'span' && hel.style.color) {
        hel.style.color = ''
        if (!hel.getAttribute('style')?.trim()) hel.removeAttribute('style')
      }
      stripColors(el)
    }
  }
}

function stripHL(node: Node) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const el = child as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (tag === 'span' && el.style.backgroundColor) {
      el.style.backgroundColor = ''
      if (!el.getAttribute('style')?.trim()) el.removeAttribute('style')
      if (!el.hasAttributes()) {
        while (el.firstChild) node.insertBefore(el.firstChild, el)
        node.removeChild(el)
        continue
      }
    }
    stripHL(el)
  }
}

function nodeToStr(node: Node): string {
  let s = ''
  for (const c of Array.from(node.childNodes)) {
    if (c.nodeType === Node.TEXT_NODE) s += c.textContent
    else if (c.nodeType === Node.ELEMENT_NODE) s += elToStr(c as Element)
  }
  return s
}

function elToStr(el: Element): string {
  const t = el.tagName.toLowerCase()
  const inner = nodeToStr(el)
  switch (t) {
    case 'b': case 'strong': return inner.trim() ? `<b>${inner}</b>` : inner
    case 'u':                return inner.trim() ? `<u>${inner}</u>` : inner
    case 'i': case 'em':     return inner.trim() ? `<i>${inner}</i>` : inner
    case 'br':               return '\n'
    case 'div':              return inner ? inner + '\n' : '\n'
    case 'p':                return inner ? inner + '\n' : '\n'
    case 'font': {
      const col = el.getAttribute('color') || el.getAttribute('COLOR')
      return col && inner.trim() ? `<FONT COLOR="${col}">${inner}</FONT>` : inner
    }
    case 'span': {
      const hel = el as HTMLElement
      const bg  = hel.style.backgroundColor
      const fg  = hel.style.color
      const fw  = hel.style.fontWeight
      if (!inner.trim()) return inner
      let r = inner
      if (bg)       r = `<span style="background-color:${rgbToHex(bg) || bg};">${r}</span>`
      else if (fg)  r = `<FONT COLOR="${rgbToName(fg) || rgbToHex(fg) || fg}">${r}</FONT>`
      if (fw === 'bold' || fw === '700') r = `<b>${r}</b>`
      return r
    }
    case 'table':  return `<table border="1" align="center">\n${inner}</table>\n`
    case 'thead': case 'tbody': return inner
    case 'tr':    return `  <tr>\n${inner}  </tr>\n`
    case 'th':    return `    <th>${inner}</th>\n`
    case 'td':    return `    <td>${inner}</td>\n`
    case 'ul': case 'ol': return inner
    case 'li':    return `- ${inner}\n`
    default:      return inner
  }
}

function getCleanHTML(editor: HTMLElement): string {
  return nodeToStr(editor).trim()
}

function highlightHTML(raw: string): string {
  let s = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  s = s.replace(/(&lt;\/?[A-Za-z][^&\n]*?&gt;)/g, m => `<span style="color:#79b8ff">${m}</span>`)
  return s
}

// ── localStorage helpers ───────────────────────────────────────────────────────

function getPlantillas(): Plantilla[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') }
  catch { return [] }
}
function savePlantillas(list: Plantilla[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function attrEsc(s: string) {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Shared styles ──────────────────────────────────────────────────────────────

function Sep() {
  return <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 5px', flexShrink: 0 }} />
}

function Label({ children }: { children: string }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', fontFamily: 'var(--mono)', padding: '0 2px', flexShrink: 0 }}>
      {children}
    </span>
  )
}

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(10,15,26,.52)',
  backdropFilter: 'blur(3px)', zIndex: 998,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const MODAL: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 16, width: '100%', boxShadow: '0 8px 32px rgba(0,94,184,.14)',
}
const CANCEL_BTN: React.CSSProperties = {
  padding: '7px 18px', border: '1px solid var(--border)', borderRadius: 8,
  background: 'var(--surface2)', color: 'var(--muted)', cursor: 'pointer',
  fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 500,
}
const OK_BTN: React.CSSProperties = {
  padding: '7px 18px', background: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer',
  fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 700,
}
const GHOST_BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
  border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)',
  color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--sans)', fontWeight: 600,
  cursor: 'pointer',
}

// ── EditorPage ─────────────────────────────────────────────────────────────────

export function EditorPage() {
  const editorRef    = useRef<HTMLDivElement>(null)
  const outputRef    = useRef<HTMLDivElement>(null)
  const fileRef      = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [charCount,   setCharCount]   = useState(0)
  const [copied,      setCopied]      = useState(false)
  const [boldActive,  setBoldActive]  = useState(false)
  const [underActive, setUnderActive] = useState(false)
  const [leftPct,     setLeftPct]     = useState(50)

  // Templates
  const [showTpl,    setShowTpl]    = useState(false)
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])

  // Save dialog
  const [showSave, setShowSave] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveCat,  setSaveCat]  = useState('')

  // Table dialog
  const [showTable, setShowTable] = useState(false)
  const [tCols,     setTCols]     = useState(3)
  const [tRows,     setTRows]     = useState(3)
  const [tHeader,   setTHeader]   = useState(true)

  // Resize handle
  const resizing = useRef(false)
  const startX   = useRef(0)
  const startPct = useRef(0)

  // ── Sync output ──────────────────────────────────────────────────────────────
  const syncOutput = useCallback(() => {
    if (!editorRef.current || !outputRef.current) return
    const html = getCleanHTML(editorRef.current)
    outputRef.current.innerHTML = highlightHTML(html)
    setCharCount(html.length)
  }, [])

  const updateToolbar = useCallback(() => {
    try {
      setBoldActive(document.queryCommandState('bold'))
      setUnderActive(document.queryCommandState('underline'))
    } catch { /* ok */ }
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbar)
    return () => document.removeEventListener('selectionchange', updateToolbar)
  }, [updateToolbar])

  // ── Enter: strip formatting on the new line ───────────────────────────────────
  function handleEnter(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Enter') return
    // Let the browser insert the newline, then strip inherited formatting
    setTimeout(() => {
      try { document.execCommand('removeFormat') } catch { /**/ }
      syncOutput()
    }, 0)
  }

  // ── Toolbar actions ───────────────────────────────────────────────────────────
  function execFmt(cmd: string) {
    document.execCommand(cmd, false, undefined)
    editorRef.current?.focus()
    syncOutput()
    updateToolbar()
  }

  function iHTML(html: string) {
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, html)
    syncOutput()
  }

  function applyColor(color: string) {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    if (sel.isCollapsed) { iHTML(`<FONT COLOR="${color}">texto</FONT>`); return }
    const d = document.createElement('div')
    d.appendChild(sel.getRangeAt(0).cloneContents())
    stripColors(d)
    iHTML(`<FONT COLOR="${color}">${d.innerHTML}</FONT>`)
  }

  function applyHL(color: string) {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    if (sel.isCollapsed) { iHTML(`<span style="background-color:${color};">texto</span>`); return }
    const d = document.createElement('div')
    d.appendChild(sel.getRangeAt(0).cloneContents())
    stripHL(d)
    iHTML(`<span style="background-color:${color};">${d.innerHTML}</span>`)
  }

  function removeColor() {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || sel.isCollapsed) return
    const d = document.createElement('div')
    d.appendChild(sel.getRangeAt(0).cloneContents())
    stripColors(d); iHTML(d.innerHTML)
  }

  function removeHL() {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || sel.isCollapsed) return
    const d = document.createElement('div')
    d.appendChild(sel.getRangeAt(0).cloneContents())
    stripHL(d); iHTML(d.innerHTML)
  }

  function clearFormat() {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || sel.isCollapsed) {
      toast.error('Selecciona el texto que quieres limpiar')
      return
    }
    const range = sel.getRangeAt(0)
    const text = range.toString()
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
    editorRef.current?.focus()
    syncOutput()
  }

  function clearAll() {
    if (!editorRef.current?.innerHTML.trim()) return
    if (!confirm('¿Limpiar todo el editor?')) return
    editorRef.current.innerHTML = ''
    syncOutput()
  }

  function copyHTML() {
    if (!editorRef.current) return
    const html = getCleanHTML(editorRef.current)
    if (!html) { toast.error('El editor está vacío'); return }
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true)
      toast.success('HTML copiado al portapapeles')
      setTimeout(() => setCopied(false), 2200)
    })
  }

  function insertTable() {
    let html = '<table border="1" align="center">\n'
    if (tHeader) {
      html += '  <thead><tr>'
      for (let c = 0; c < tCols; c++) html += `<th>Col ${c + 1}</th>`
      html += '</tr></thead>\n'
    }
    html += '  <tbody>'
    for (let r = 0; r < tRows; r++) {
      html += '<tr>'
      for (let c = 0; c < tCols; c++) html += '<td>&nbsp;</td>'
      html += '</tr>'
    }
    html += '</tbody></table><br>'
    iHTML(html)
    setShowTable(false)
  }

  // ── Templates ────────────────────────────────────────────────────────────────
  function openTemplates() {
    setPlantillas(getPlantillas())
    setShowTpl(true)
  }

  function useTemplate(p: Plantilla) {
    if (!editorRef.current) return
    if (editorRef.current.innerHTML.trim() && !confirm('¿Reemplazar el contenido actual con esta plantilla?')) return
    editorRef.current.innerHTML = p.contenido
    syncOutput(); setShowTpl(false)
  }

  function deleteTemplate(id: string) {
    if (!confirm('¿Eliminar esta plantilla?')) return
    const updated = getPlantillas().filter(p => p.id !== id)
    savePlantillas(updated); setPlantillas(updated)
    toast.success('Plantilla eliminada')
  }

  function confirmSave() {
    if (!saveName.trim()) { toast.error('Ingresa un nombre'); return }
    const contenido = editorRef.current?.innerHTML.trim() || ''
    if (!contenido) { toast.error('El editor está vacío'); return }
    const nueva: Plantilla = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      nombre: saveName.trim(), categoria: saveCat.trim() || 'General', contenido,
    }
    const list = [...getPlantillas(), nueva]
    savePlantillas(list); setPlantillas(list)
    toast.success(`Plantilla "${nueva.nombre}" guardada`)
    setShowSave(false); setSaveName(''); setSaveCat('')
  }

  function exportTemplate(p: Plantilla) {
    const html = `<!DOCTYPE html>\n<!-- Plantilla exportada desde Editor de Informes — Hanna Instruments ST -->\n<html lang="es">\n<head>\n  <meta charset="UTF-8">\n  <meta name="hi-nombre" content="${attrEsc(p.nombre)}">\n  <meta name="hi-categoria" content="${attrEsc(p.categoria)}">\n  <title>${attrEsc(p.nombre)}</title>\n</head>\n<body>\n  <div class="hi-content">\n${p.contenido}\n  </div>\n</body>\n</html>`
    download(html, slugify(p.nombre) + '.html')
  }

  function exportLibrary() {
    const list = getPlantillas()
    if (!list.length) { toast.error('No tienes plantillas guardadas'); return }
    const articles = list.map(t =>
      `  <article data-nombre="${attrEsc(t.nombre)}" data-categoria="${attrEsc(t.categoria)}">\n${t.contenido}\n  </article>`
    ).join('\n\n')
    const html = `<!DOCTYPE html>\n<!-- Biblioteca — Hanna Instruments ST -->\n<html lang="es"><head><meta charset="UTF-8"><title>Biblioteca HI</title></head>\n<body>\n${articles}\n</body>\n</html>`
    download(html, 'plantillas-hi.html')
  }

  function download(content: string, filename: string) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/html;charset=utf-8' }))
    a.download = filename; a.click(); URL.revokeObjectURL(a.href)
  }

  function importFromFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const doc    = new DOMParser().parseFromString(e.target?.result as string, 'text/html')
      const found: Plantilla[] = []
      const articles = doc.querySelectorAll('article[data-nombre]')
      if (articles.length > 0) {
        articles.forEach(art => found.push({
          id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          nombre:    art.getAttribute('data-nombre')    || 'Sin nombre',
          categoria: art.getAttribute('data-categoria') || 'General',
          contenido: art.innerHTML.trim(),
        }))
      } else {
        const nombre    = doc.querySelector('meta[name="hi-nombre"]')?.getAttribute('content')
        const categoria = doc.querySelector('meta[name="hi-categoria"]')?.getAttribute('content') || 'General'
        const contenido = (doc.querySelector('.hi-content') || doc.body)?.innerHTML?.trim()
        if (nombre && contenido) found.push({ id: 'c_' + Date.now(), nombre, categoria, contenido })
      }
      if (!found.length) { toast.error('No se encontraron plantillas en el archivo'); return }
      const list = [...getPlantillas(), ...found]
      savePlantillas(list); setPlantillas(list)
      toast.success(`${found.length} plantilla${found.length > 1 ? 's' : ''} importada${found.length > 1 ? 's' : ''}`)
    }
    reader.readAsText(file, 'UTF-8')
  }

  // ── Resize handle ────────────────────────────────────────────────────────────
  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    resizing.current = true
    startX.current   = e.clientX
    startPct.current = leftPct
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current || !containerRef.current) return
      const dx  = ev.clientX - startX.current
      const pct = Math.min(75, Math.max(25, startPct.current + (dx / containerRef.current.offsetWidth) * 100))
      setLeftPct(pct)
    }
    const onUp = () => {
      resizing.current           = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Toolbar button style ──────────────────────────────────────────────────────
  const tbBtn = (active = false): React.CSSProperties => ({
    height: 28, minWidth: 28, padding: '0 8px',
    border: `1px solid ${active ? 'rgba(0,94,184,.35)' : 'transparent'}`,
    borderRadius: 7, cursor: 'pointer', fontSize: 13,
    background: active ? 'rgba(0,94,184,.1)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text)',
    fontFamily: 'var(--sans)', fontWeight: active ? 700 : 500,
    transition: 'background .12s', display: 'flex',
    alignItems: 'center', justifyContent: 'center', gap: 4, whiteSpace: 'nowrap',
    flexShrink: 0,
  })

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', margin: -32, overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '4px 12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        gap: 2, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,94,184,.05)',
      }}>

        <button
          onMouseDown={e => { e.preventDefault(); openTemplates() }}
          style={{ ...tbBtn(), background: 'var(--accent)', color: '#fff', fontWeight: 700, border: '1px solid var(--accent)', padding: '0 14px' }}
        >
          📋 Plantillas
        </button>

        <Sep />
        <Label>Formato</Label>
        <button onMouseDown={e => { e.preventDefault(); execFmt('bold') }}      style={tbBtn(boldActive)}  title="Negrita (Ctrl+B)"><b>N</b></button>
        <button onMouseDown={e => { e.preventDefault(); execFmt('underline') }} style={tbBtn(underActive)} title="Subrayado (Ctrl+U)"><u>S</u></button>

        <Sep />
        <Label>Color texto</Label>
        {COLORS.map(c => (
          <div key={c.value} onMouseDown={e => { e.preventDefault(); applyColor(c.value) }} title={c.label}
            style={{ width: 19, height: 19, borderRadius: '50%', background: c.hex, border: '2px solid rgba(0,0,0,.16)', cursor: 'pointer', flexShrink: 0 }} />
        ))}

        <Sep />
        <Label>Resaltar</Label>
        {HIGHLIGHTS.map(h => (
          <div key={h.value} onMouseDown={e => { e.preventDefault(); applyHL(h.value) }} title={h.label}
            style={{ width: 19, height: 19, borderRadius: 5, background: h.value, border: '2px solid rgba(0,0,0,.13)', cursor: 'pointer', flexShrink: 0 }} />
        ))}
        <button onMouseDown={e => { e.preventDefault(); removeColor() }} style={{ ...tbBtn(), fontSize: 11, color: 'var(--muted)' }}>✕ color</button>
        <button onMouseDown={e => { e.preventDefault(); removeHL() }}    style={{ ...tbBtn(), fontSize: 11, color: 'var(--muted)' }}>✕ resal.</button>
        <button onMouseDown={e => { e.preventDefault(); clearFormat() }} style={{ ...tbBtn(), fontSize: 11, fontWeight: 700, color: '#e53935', border: '1px solid rgba(229,57,53,.25)', background: 'rgba(229,57,53,.06)' }} title="Quitar todos los estilos del texto seleccionado">✕ estilos</button>

        <Sep />
        <Label>Marcadores</Label>
        {MARKER_BTNS.map(([key, label, color]) => (
          <button key={key} onMouseDown={e => { e.preventDefault(); iHTML(MARKERS[key]) }}
            style={{ ...tbBtn(), fontSize: 11, color }} title={key}>
            {label}
          </button>
        ))}

        <Sep />
        <button onMouseDown={e => { e.preventDefault(); setShowTable(true) }} style={tbBtn()} title="Insertar tabla">⊞ Tabla</button>
        <Sep />
        <button onMouseDown={e => { e.preventDefault(); clearAll() }} style={{ ...tbBtn(), color: '#e53935' }} title="Limpiar editor">🗑</button>
      </div>

      {/* ── Split panels ── */}
      <div ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 12, gap: 0 }}>

        {/* Left — WYSIWYG */}
        <div style={{ width: `${leftPct}%`, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.9px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
              Editor visual
            </span>
            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 12 }}>
              WYSIWYG
            </span>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            onInput={syncOutput}
            onKeyDown={handleEnter}
            onKeyUp={updateToolbar}
            data-placeholder="Escribe aquí tu observación, conclusión o tabla…"
            style={{
              flex: 1, padding: '22px 24px', overflowY: 'auto', outline: 'none',
              fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.85, color: 'var(--text)',
            }}
          />
        </div>

        {/* Resize handle */}
        <div onMouseDown={onResizeStart} style={{ width: 12, cursor: 'col-resize', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 4, height: '60%', background: 'var(--border)', borderRadius: 4 }} />
        </div>

        {/* Right — HTML output */}
        <div style={{ flex: 1, background: '#0b1120', border: '1px solid #1d3054', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: '#111c30', borderBottom: '1px solid #1d3054', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#5a7299', letterSpacing: '.9px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
              Código HTML
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: '#5a7299' }}>{charCount} chars</span>
              <button onClick={copyHTML} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px',
                background: copied ? '#1a9650' : 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                fontFamily: 'var(--sans)', transition: 'background .18s',
              }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
          <div ref={outputRef} style={{
            flex: 1, padding: '18px 20px', overflowY: 'auto',
            fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.85,
            color: '#ccd6f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }} />
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".html" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) { importFromFile(f); e.target.value = '' } }} />

      {/* ── Templates modal ── */}
      {showTpl && (
        <div onClick={() => setShowTpl(false)} style={OVERLAY}>
          <div onClick={e => e.stopPropagation()} style={{ ...MODAL, maxWidth: 820, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>📋 Plantillas</span>
              <button onClick={() => setShowTpl(false)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
              {plantillas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)', background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 12, fontSize: '0.875rem', lineHeight: 1.75 }}>
                  Aún no tienes plantillas.<br />
                  Usa <b>Importar .html</b> para cargar una compartida,<br />
                  o escribe en el editor y usa <b>Guardar como plantilla</b>.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                  {plantillas.map(p => {
                    const preview = p.contenido.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 110)
                    return (
                      <div key={p.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <span style={{ fontSize: 9.5, fontFamily: 'var(--mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--accent)', background: 'rgba(0,94,184,.08)', border: '1px solid rgba(0,94,184,.2)', padding: '2px 8px', borderRadius: 8, alignSelf: 'flex-start' }}>
                          {p.categoria}
                        </span>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{p.nombre}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55, flex: 1 }}>{preview}…</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <button onClick={() => useTemplate(p)} style={{ flex: 1, padding: '6px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'var(--sans)' }}>Usar</button>
                          <button onClick={() => exportTemplate(p)} title="Descargar .html" style={{ padding: '6px 9px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>↓</button>
                          <button onClick={() => deleteTemplate(p.id)} title="Eliminar" style={{ padding: '6px 9px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>🗑</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', borderRadius: '0 0 16px 16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => fileRef.current?.click()} style={GHOST_BTN}>📥 Importar .html</button>
                <button onClick={exportLibrary} style={GHOST_BTN}>📤 Exportar todas</button>
              </div>
              <button
                onClick={() => { setShowTpl(false); setShowSave(true) }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'var(--sans)' }}
              >
                + Guardar editor como plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save dialog ── */}
      {showSave && (
        <div onClick={() => setShowSave(false)} style={{ ...OVERLAY, zIndex: 999 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...MODAL, maxWidth: 380 }}>
            <div style={{ padding: '24px 26px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 16, background: 'var(--accent)', borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
                Guardar como plantilla
              </h3>
              {([
                ['Nombre de la plantilla', saveName, setSaveName, 'Ej: Conclusión No Operativo'],
                ['Categoría', saveCat, setSaveCat, 'Ej: Conclusiones, Tablas'],
              ] as [string, string, (v: string) => void, string][]).map(([lbl, val, set, ph]) => (
                <div key={lbl} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 5 }}>{lbl}</label>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    onKeyDown={e => { if (e.key === 'Enter') confirmSave() }}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--sans)', background: 'var(--surface2)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setShowSave(false)} style={CANCEL_BTN}>Cancelar</button>
                <button onClick={confirmSave} style={OK_BTN}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Table dialog ── */}
      {showTable && (
        <div onClick={() => setShowTable(false)} style={{ ...OVERLAY, zIndex: 999 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...MODAL, maxWidth: 300 }}>
            <div style={{ padding: '24px 28px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 16, background: 'var(--accent)', borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
                Insertar tabla
              </h3>
              {([['Columnas:', tCols, setTCols, 12], ['Filas de datos:', tRows, setTRows, 30]] as [string, number, (n: number) => void, number][]).map(([lbl, val, set, max]) => (
                <label key={lbl} style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                  {lbl}
                  <input type="number" value={val} min={1} max={max} onChange={e => set(+e.target.value)}
                    style={{ marginLeft: 8, width: 66, padding: '5px 9px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--mono)', background: 'var(--surface2)', color: 'var(--text)', outline: 'none' }}
                  />
                </label>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', marginBottom: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={tHeader} onChange={e => setTHeader(e.target.checked)} />
                Incluir fila de encabezado (th)
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setShowTable(false)} style={CANCEL_BTN}>Cancelar</button>
                <button onClick={insertTable} style={OK_BTN}>Insertar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
