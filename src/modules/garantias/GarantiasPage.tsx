import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, BadgeCheck, Download, Users } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { useUser } from '../../hooks/useUser'
import { useProfiles } from '../../hooks/useProfiles'
import { useAsesores } from '../calibraciones/hooks/useCalibraciones'
import { parseOtstCodes } from '../equipos-sin-formato/hooks/useEquiposSinFormato'
import { useGarantias, ESTADO_LABEL_GAR, fechaObjetivoGarantia, semaforoGarantia, fmtFecha } from './hooks/useGarantias'
import { ResponsablesConfigModal } from './ResponsablesConfigModal'
import { INP, PRI, GHOST, EMPTY, B_ESTADO_GAR, SemaforoGarantia, LinkPNC } from './ui'
import type { EstadoGarantia, Garantia } from '../../types'

type VistaFiltro = 'todas' | 'en_proceso' | 'vencidas' | EstadoGarantia

const FILTROS: [VistaFiltro, string][] = [
  ['todas', 'Todas'], ['en_proceso', 'En proceso'], ['vencidas', 'Vencidas'],
  ['pnc_pendiente', 'PNC pendiente'], ['nv', 'NV'], ['importacion', 'Importación'],
  ['informe', 'Informe'], ['finalizada', 'Finalizadas'],
]

export function GarantiasPage() {
  const navigate = useNavigate()
  const { user, hasCapability, isAdmin } = useUser()
  const [configResponsables, setConfigResponsables] = useState(false)
  const puedeEditar = hasCapability('garantias_editar')
  const { data: garantias = [], isLoading } = useGarantias()
  const { data: asesores = [] } = useAsesores()
  const { data: profiles = [] } = useProfiles()

  const [vista, setVista] = useState<VistaFiltro>('en_proceso')
  const [search, setSearch] = useState('')
  const [soloMias, setSoloMias] = useState(false)

  const nombreAsesor = new Map(asesores.map(a => [a.correo, a.nombre]))
  const nombrePerfil = new Map(profiles.map(p => [p.id, p.full_name || p.email]))
  const responsablesTexto = (g: Garantia) => g.responsables.map(r => nombrePerfil.get(r) || 'Usuario').join(', ')

  const filtrados = garantias
    .filter(g => {
      if (vista === 'todas') return true
      if (vista === 'en_proceso') return g.estado !== 'finalizada' && !g.anulada
      if (vista === 'vencidas') return semaforoGarantia(g) === 'vencida'
      return g.estado === vista
    })
    .filter(g => !soloMias || (user?.id && g.responsables.includes(user.id)))
    .filter(g => {
      const q = search.toLowerCase().trim()
      if (!q) return true
      return [g.cliente, g.referencia, g.otst, g.numero_nv, g.numero_pnc, `gar-${g.numero}`, nombreAsesor.get(g.asesor_correo)]
        .some(v => (v || '').toLowerCase().includes(q))
    })
    // Lo del asesor logueado primero (sort estable, conserva el orden por fecha).
    .sort((a, b) => {
      const aMio = user?.email && a.asesor_correo === user.email ? 0 : 1
      const bMio = user?.email && b.asesor_correo === user.email ? 0 : 1
      return aMio - bMio
    })

  function exportarCSV() {
    const headers = ['N°', 'Cliente', 'Referencia', 'OTST', 'Asesor', 'Responsables', 'Hay stock', 'Estado', 'NV', 'Fecha seguimiento', 'PNC', 'Fecha límite entrega', 'Anulada']
    const rows = filtrados.map(g => [
      `GAR-${g.numero}`, g.cliente, g.referencia, parseOtstCodes(g.otst).join(', '),
      nombreAsesor.get(g.asesor_correo) || g.asesor_correo, responsablesTexto(g),
      g.hay_stock ? 'Sí' : 'No', ESTADO_LABEL_GAR[g.estado], g.numero_nv || '',
      g.fecha_seguimiento ? fmtFecha(g.fecha_seguimiento) : '', g.numero_pnc || '',
      g.fecha_limite_entrega ? fmtFecha(g.fecha_limite_entrega) : '', g.anulada ? 'Sí' : 'No',
    ])
    const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `garantias_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const columns: Column<Garantia>[] = [
    { key: 'numero', header: 'N°', width: '90px', render: g => <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>GAR-{g.numero}</span> },
    {
      key: 'cliente', header: 'Cliente',
      render: g => (
        <div>
          <span style={{ fontWeight: 600, textDecoration: g.anulada ? 'line-through' : undefined }}>{g.cliente}</span>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            {g.referencia}{g.otst ? ` · OTST ${parseOtstCodes(g.otst).join(', ')}` : ''}
            {g.numero_pnc && <> · PNC <LinkPNC numero={g.numero_pnc} /></>}
          </div>
        </div>
      ),
    },
    { key: 'asesor', header: 'Asesor', render: g => <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{nombreAsesor.get(g.asesor_correo) || g.asesor_correo}</span> },
    {
      key: 'responsables', header: 'Responsables',
      render: g => g.responsables.length
        ? <span style={{ fontSize: 12.5 }}>{responsablesTexto(g)}</span>
        : <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Sin asignar</span>,
    },
    {
      key: 'estado', header: 'Estado', width: '130px',
      render: g => g.anulada ? (
        <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>Anulada</span>
      ) : (
        <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, ...B_ESTADO_GAR[g.estado] }}>
          {ESTADO_LABEL_GAR[g.estado]}
        </span>
      ),
    },
    { key: 'semaforo', header: 'Semáforo', width: '170px', render: g => fechaObjetivoGarantia(g) ? <SemaforoGarantia garantia={g} /> : <span style={{ color: 'var(--muted)' }}>—</span> },
  ]

  return (
    <div>
      <Header
        title="Garantías"
        subtitle="Registro y seguimiento de garantías — con stock (PNC) o por importación (NV)"
        actions={(isAdmin || puedeEditar) ? (
          <>
            {isAdmin && <button onClick={() => setConfigResponsables(true)} style={{ ...GHOST, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Responsables</button>}
            {puedeEditar && <button onClick={() => navigate('/garantias/nueva')} style={PRI}><Plus size={14} /> Nueva garantía</button>}
          </>
        ) : undefined}
      />

      <Card>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, flexWrap: 'wrap' }}>
            {FILTROS.map(([v, label]) => (
              <button key={v} onClick={() => setVista(v)} style={{
                padding: '6px 12px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                fontWeight: vista === v ? 600 : 500, fontFamily: 'var(--sans)',
                background: vista === v ? 'var(--accent)' : 'transparent',
                color: vista === v ? '#fff' : 'var(--muted)',
              }}>{label}</button>
            ))}
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente, GAR-, referencia, OTST, NV o PNC..." style={{ ...INP, paddingLeft: 34 }} />
          </div>
          {puedeEditar && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={soloMias} onChange={e => setSoloMias(e.target.checked)} /> Asignadas a mí
            </label>
          )}
          <button onClick={exportarCSV} disabled={filtrados.length === 0} style={{ ...GHOST, opacity: filtrados.length === 0 ? .5 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> CSV
          </button>
        </div>

        {isLoading ? (
          <div style={EMPTY}><p>Cargando…</p></div>
        ) : filtrados.length === 0 ? (
          <div style={EMPTY}><BadgeCheck size={32} strokeWidth={1.5} /><p>No hay garantías para este filtro</p></div>
        ) : (
          <Table columns={columns} data={filtrados} keyExtractor={g => g.id} onRowClick={g => navigate(`/garantias/${g.id}`)} />
        )}
      </Card>

      {configResponsables && <ResponsablesConfigModal onClose={() => setConfigResponsables(false)} />}
    </div>
  )
}
