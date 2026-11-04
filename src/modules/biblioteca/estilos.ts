// Estilos y utilidades de la Biblioteca (aquí y no en los .tsx para no romper Fast Refresh).
import type { BibliotecaDocumento, BibliotecaRevision } from '../../types'

export const INP: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
  borderRadius: 8, padding: '10px 13px', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', width: '100%',
}
export const PRI: React.CSSProperties = { padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
export const GHOST: React.CSSProperties = { padding: '10px 18px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
export const ICON_BTN: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, display: 'inline-flex', alignItems: 'center' }
export const TH: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 10.5, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--muted)', borderBottom: '1px solid var(--border)', fontWeight: 600 }
export const TD: React.CSSProperties = { padding: '10px', fontSize: 13, borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }

const PILL: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }
export const B_VIGENTE: React.CSSProperties = { ...PILL, background: 'var(--green-bg, #dcfce7)', color: 'var(--green, #16a34a)', border: '1px solid var(--green-border, #86efac)' }
export const B_PENDIENTE: React.CSSProperties = { ...PILL, background: 'var(--yellow-bg)', color: 'var(--yellow)', border: '1px solid var(--yellow-border)' }
export const B_OBSOLETA: React.CSSProperties = { ...PILL, background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }

export const ESTADO_LABEL: Record<BibliotecaRevision['estado'], string> = {
  vigente: 'Vigente', pendiente_aprobacion: 'Pendiente de aprobación', obsoleta: 'Obsoleta',
}

export const MAX_PDF_MB = 20

// Storage rechaza claves con tildes, ñ y otros caracteres no ASCII (mismo
// criterio que certificados-calidad); el nombre original queda en nombre_archivo.
export function storageSafe(segmento: string): string {
  return segmento
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'archivo'
}

export function norm(v: string | null | undefined): string {
  return (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function vigenteDe(doc: BibliotecaDocumento): BibliotecaRevision | undefined {
  return doc.revisiones.find(r => r.estado === 'vigente')
}

// La pendiente más reciente (puede convivir con una vigente: "Rev. 2 en aprobación").
export function pendienteDe(doc: BibliotecaDocumento): BibliotecaRevision | undefined {
  return [...doc.revisiones]
    .filter(r => r.estado === 'pendiente_aprobacion')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
}

const ESTADO_ARCHIVO: Record<BibliotecaRevision['estado'], string> = {
  vigente: 'Vigente', pendiente_aprobacion: 'Pendiente', obsoleta: 'Obsoleta',
}

// Nombre del archivo al descargar: código, revisión, fecha y estado, p. ej.
// "PL.ST.01_Rev0_10-10-2024_Vigente.pdf". Solo ASCII y sin espacios: Storage
// codifica tildes y espacios en el nombre (salía "Pol%C3%ADtica…").
// Sin código se usa el título abreviado.
export function nombreDescarga(doc: Pick<BibliotecaDocumento, 'titulo' | 'codigo'>, rev: BibliotecaRevision): string {
  const fecha = rev.fecha_aprobacion ?? rev.fecha_revision
  const partes = [
    storageSafe(doc.codigo?.trim() || doc.titulo.slice(0, 40)),
    `Rev${storageSafe(rev.revision)}`,
    fecha ? fmtFecha(fecha).replace(/\//g, '-') : '',
    ESTADO_ARCHIVO[rev.estado],
  ]
  return partes.filter(Boolean).join('_') + '.pdf'
}
