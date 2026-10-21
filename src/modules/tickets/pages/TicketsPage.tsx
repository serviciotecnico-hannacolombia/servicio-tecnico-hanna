import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, Trash2, Plus, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { TicketsTable } from '../components/TicketsTable'
import { ImportTicketsModal } from '../components/ImportTicketsModal'
import { useTickets } from '../hooks/useTickets'
import { Header } from '../../../components/layout/Header'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { supabase } from '../../../lib/supabase'
import { useProfiles } from '../../../hooks/useProfiles'
import { INP, GHOST } from '../../calibraciones/ui'
import { numeroTid } from '../utils/formato'
import {
  ORIGEN_LABEL, ESTADO_LABEL, GRUPO_LABEL, GRUPO_COLOR, GRUPO_ESTADOS, grupoTicket,
  type TicketOrigen, type TicketEstado, type TicketGrupo,
} from '../types'
import type { ParsedTicketRow } from '../utils/parseTicketsExcel'

const CLAVE_ELIMINAR_TODO = '2711'

// 'sin_estado' agrupa los tickets que aún no tienen estado asignado.
type FiltroEstado = TicketEstado | 'sin_estado' | ''

// Ciclo al hacer clic en "Ordenar por TID": por defecto → ascendente → descendente.
type OrdenTid = 'default' | 'asc' | 'desc'
const SIGUIENTE_ORDEN: Record<OrdenTid, OrdenTid> = { default: 'asc', asc: 'desc', desc: 'default' }

// Filtros recordados entre sesiones, igual que en Calibraciones.
interface FiltrosTickets {
  grupo: TicketGrupo | ''
  estado: FiltroEstado
  origen: TicketOrigen | ''
  orden: OrdenTid
}
const FILTROS_VACIOS: FiltrosTickets = { grupo: '', estado: '', origen: '', orden: 'default' }
const FILTROS_KEY = 'tickets_filtros'

function cargarFiltros(): FiltrosTickets {
  try {
    const raw = localStorage.getItem(FILTROS_KEY)
    if (!raw) return FILTROS_VACIOS
    const parsed = JSON.parse(raw)
    return {
      grupo: parsed.grupo && parsed.grupo in GRUPO_LABEL ? parsed.grupo : '',
      estado: parsed.estado || '',
      origen: parsed.origen || '',
      orden: parsed.orden && parsed.orden in SIGUIENTE_ORDEN ? parsed.orden : 'default',
    }
  } catch {
    return FILTROS_VACIOS
  }
}

function GrupoCard({ label, detalle, value, color, activo, onClick }: { label: string, detalle?: string, value: number, color: string, activo: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={detalle ? `${detalle}\n\n${activo ? 'Clic para quitar el filtro' : 'Clic para filtrar'}` : undefined}
      style={{
        textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--sans)',
        background: activo ? 'var(--accent-bg)' : 'var(--surface)',
        border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: activo ? '0 0 0 1px var(--accent)' : undefined,
        borderRadius: 12, padding: '16px 20px', transition: 'all .15s',
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.8px' }}>{label}</div>
    </button>
  )
}

export function TicketsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: tickets = [], isLoading } = useTickets()
  const { data: profiles = [] } = useProfiles()
  const [importOpen, setImportOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [search, setSearch] = useState('')
  const [filtros, setFiltros] = useState<FiltrosTickets>(cargarFiltros)

  useEffect(() => { localStorage.setItem(FILTROS_KEY, JSON.stringify(filtros)) }, [filtros])

  const actualizarFiltro = (parcial: Partial<FiltrosTickets>) => setFiltros(f => ({ ...f, ...parcial }))
  const hayFiltrosActivos = !!(filtros.grupo || filtros.estado || filtros.origen || search)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tickets_fabrica'] })

  const conteoPorGrupo = useMemo(() => {
    const conteo = new Map<TicketGrupo, number>()
    for (const t of tickets) {
      const g = grupoTicket(t.estado)
      conteo.set(g, (conteo.get(g) ?? 0) + 1)
    }
    return conteo
  }, [tickets])

  const filtrados = useMemo(() => {
    const nombrePorId = new Map(profiles.map(p => [p.id, (p.full_name || p.email || '').toLowerCase()]))
    const q = search.toLowerCase().trim()
    const lista = tickets.filter(t => {
      if (filtros.grupo && grupoTicket(t.estado) !== filtros.grupo) return false
      if (filtros.estado === 'sin_estado') { if (t.estado) return false }
      else if (filtros.estado && t.estado !== filtros.estado) return false
      if (filtros.origen && t.origen !== filtros.origen) return false
      if (!q) return true
      return [
        t.nombre, t.codigo, t.serial, t.equipo_nombre, t.otst,
        t.equipo_madre_codigo, t.equipo_madre_serial,
        t.creado_por ? nombrePorId.get(t.creado_por) : null,
      ].some(v => (v || '').toLowerCase().includes(q))
    })
    if (filtros.orden === 'default') return lista
    // Comparación "numeric" para que TID 9 quede antes de TID 10.
    return [...lista].sort((a, b) => {
      const cmp = numeroTid(a.nombre).localeCompare(numeroTid(b.nombre), 'es', { numeric: true, sensitivity: 'base' })
      return filtros.orden === 'asc' ? cmp : -cmp
    })
  }, [tickets, profiles, filtros, search])

  // La card y el select de estado son excluyentes: elegir uno limpia el otro.
  const toggleGrupo = (g: TicketGrupo) => actualizarFiltro({ grupo: filtros.grupo === g ? '' : g, estado: '' })

  const handleImport = async (rows: ParsedTicketRow[], userMap: Record<string, string | null>) => {
    // El Excel de Notion trae las filas del ticket más nuevo al más antiguo.
    // Se insertan en orden cronológico (antiguo → nuevo) para que el ID
    // consecutivo de la intranet quede alineado con la fecha real: el
    // ticket más antiguo recibe el ID más bajo y el más reciente el más alto.
    const rowsOrdenadas = [...rows].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : Infinity
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : Infinity
      return ta - tb
    })

    // nota_estado se convierte en el primer avance de la bitácora por trigger
    // (ver migración 20261021c_tickets_fabrica_detalle_avances.sql).
    const toInsert = rowsOrdenadas.map(r => ({
      nombre: r.nombre,
      codigo: r.codigo || null,
      serial: r.serial || null,
      origen: r.origen || null,
      estado: r.estado || null,
      nota_estado: r.notaEstado || null,
      creado_por: r.creadoPorRaw ? (userMap[r.creadoPorRaw] ?? null) : null,
      es_equipo_hijo: false,
      // Siempre se envía una fecha: si se omitiera en algunas filas del lote,
      // Supabase manda NULL explícito en vez de aplicar el DEFAULT now() de la
      // columna cuando otras filas del mismo insert sí traen la columna.
      created_at: r.createdAt || new Date().toISOString(),
    }))

    const CHUNK = 200
    let inserted = 0
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK)
      const { error } = await supabase.from('tickets_fabrica').insert(chunk)
      if (error) { toast.error('Error importando lote: ' + error.message); break }
      inserted += chunk.length
    }

    invalidate()
    toast.success(`Importación completada: ${inserted} tickets registrados`)
    return { inserted }
  }

  const handleDeleteAll = async () => {
    const clave = window.prompt('Esta acción eliminará TODOS los tickets a fábrica registrados.\n\nEscribe la clave de seguridad para continuar:')
    if (clave === null) return
    if (clave !== CLAVE_ELIMINAR_TODO) { toast.error('Clave incorrecta'); return }
    if (!window.confirm(`¿Confirmas eliminar los ${tickets.length} tickets registrados? Esta acción NO se puede deshacer.`)) return

    setDeletingAll(true)
    const { error } = await supabase.from('tickets_fabrica').delete().not('id', 'is', null)
    if (error) {
      setDeletingAll(false)
      toast.error('Error al eliminar: ' + error.message)
      return
    }

    // El ID de la intranet (columna "numero") es un secuencial que no se
    // reinicia solo al borrar filas; se reinicia aparte para que el próximo
    // ticket vuelva a empezar en 1.
    const { error: errReset } = await supabase.rpc('reset_tickets_fabrica_numero')
    setDeletingAll(false)

    if (errReset) toast.error('Se eliminaron los tickets, pero no se pudo reiniciar el ID: ' + errReset.message)
    else toast.success('Todos los tickets fueron eliminados')
    invalidate()
  }

  const OrdenIcon = filtros.orden === 'asc' ? ArrowUp : filtros.orden === 'desc' ? ArrowDown : ArrowUpDown

  return (
    <div>
      <Header
        title="Tickets a Fábrica"
        subtitle="Reporte de fallas y novedades de equipos ante fábrica"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
              <Upload size={14} /> Importar Excel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteAll} disabled={deletingAll}>
              <Trash2 size={14} /> {deletingAll ? 'Eliminando…' : 'Eliminar todos'}
            </Button>
            <Button size="sm" onClick={() => navigate('/tickets/nuevo')}>
              <Plus size={14} /> Nuevo ticket
            </Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
        <GrupoCard label="Total" value={tickets.length} color="var(--text)" activo={!filtros.grupo && !filtros.estado} onClick={() => actualizarFiltro({ grupo: '', estado: '' })} />
        {(Object.keys(GRUPO_LABEL) as TicketGrupo[]).map(g => (
          <GrupoCard
            key={g}
            label={GRUPO_LABEL[g]}
            detalle={GRUPO_ESTADOS[g]}
            value={conteoPorGrupo.get(g) ?? 0}
            color={GRUPO_COLOR[g]}
            activo={filtros.grupo === g}
            onClick={() => toggleGrupo(g)}
          />
        ))}
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por TID, código, serial, OTST, equipo madre o creador..."
              style={{ ...INP, paddingLeft: 34 }}
            />
          </div>
          <select value={filtros.origen} onChange={e => actualizarFiltro({ origen: e.target.value as TicketOrigen | '' })} style={{ ...INP, width: 'auto', minWidth: 170 }}>
            <option value="">Origen: todos</option>
            {(Object.keys(ORIGEN_LABEL) as TicketOrigen[]).map(o => <option key={o} value={o}>{ORIGEN_LABEL[o]}</option>)}
          </select>
          <select value={filtros.estado} onChange={e => actualizarFiltro({ estado: e.target.value as FiltroEstado, grupo: '' })} style={{ ...INP, width: 'auto', minWidth: 170 }}>
            <option value="">Estado: todos</option>
            {(Object.keys(ESTADO_LABEL) as TicketEstado[]).map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            <option value="sin_estado">Sin estado</option>
          </select>
          <button
            type="button"
            onClick={() => actualizarFiltro({ orden: SIGUIENTE_ORDEN[filtros.orden] })}
            style={{ ...GHOST, display: 'flex', alignItems: 'center', gap: 6, color: filtros.orden === 'default' ? 'var(--text)' : 'var(--accent)' }}
          >
            <OrdenIcon size={13} /> {filtros.orden === 'default' ? 'Más recientes' : filtros.orden === 'asc' ? 'TID ascendente' : 'TID descendente'}
          </button>
          {hayFiltrosActivos && (
            <button type="button" onClick={() => { setSearch(''); actualizarFiltro({ grupo: '', estado: '', origen: '' }) }} style={GHOST}>Limpiar filtros</button>
          )}
        </div>

        <TicketsTable
          tickets={filtrados}
          isLoading={isLoading}
          resetKey={`${filtros.grupo}|${filtros.estado}|${filtros.origen}|${filtros.orden}|${search}`}
        />
      </Card>

      <ImportTicketsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        profiles={profiles}
        onImport={handleImport}
      />
    </div>
  )
}

export default TicketsPage
