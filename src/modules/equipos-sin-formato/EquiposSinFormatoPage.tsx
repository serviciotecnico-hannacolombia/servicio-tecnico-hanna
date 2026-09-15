import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, PackageX, Download } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { useUser } from '../../hooks/useUser'
import { useAsesores } from '../calibraciones/hooks/useCalibraciones'
import { useEquiposSinFormato, useEquiposSinFormatoItems, ESTADO_LABEL_SF, parseOtstCodes } from './hooks/useEquiposSinFormato'
import { INP, PRI, GHOST, EMPTY } from './ui'
import type { EquipoSinFormato, EquipoSinFormatoItem, EstadoEquipoSinFormato } from '../../types'

type VistaFiltro = 'todas' | EstadoEquipoSinFormato

const B_ESTADO: Record<EstadoEquipoSinFormato, React.CSSProperties> = {
  recibido: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' },
  pendiente: { background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)' },
  preingresado: { background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)' },
  ingresado: { background: 'var(--green-bg, #dcfce7)', border: '1px solid var(--green-border, #86efac)', color: 'var(--green, #16a34a)' },
}

function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function EquiposSinFormatoPage() {
  const navigate = useNavigate()
  const { hasCapability } = useUser()
  const puedeEditar = hasCapability('equipos_sin_formato_editar')
  const { data: registros = [], isLoading } = useEquiposSinFormato()
  const { data: allItems = [] } = useEquiposSinFormatoItems()
  const { data: asesores = [] } = useAsesores()

  const [vista, setVista] = useState<VistaFiltro>('todas')
  const [search, setSearch] = useState('')

  const nombrePorCorreo = new Map(asesores.map(a => [a.correo, a.nombre]))
  const itemsPorRegistro = new Map<string, EquipoSinFormatoItem[]>()
  for (const it of allItems) {
    if (!itemsPorRegistro.has(it.equipo_sf_id)) itemsPorRegistro.set(it.equipo_sf_id, [])
    itemsPorRegistro.get(it.equipo_sf_id)!.push(it)
  }

  const filtrados = registros
    .filter(r => vista === 'todas' || r.estado === vista)
    .filter(r => {
      const q = search.toLowerCase().trim()
      if (!q) return true
      if (r.razon_social.toLowerCase().includes(q) || `sf-${r.numero}`.includes(q)) return true
      const items = itemsPorRegistro.get(r.id) || []
      return items.some(it => it.referencia.toLowerCase().includes(q) || (it.serial || '').toLowerCase().includes(q))
    })

  function exportarCSV() {
    const headers = ['N°', 'Razón social', 'Asesor', 'Fecha llegada', 'Estado', 'Número de preingreso', 'OTST', 'Referencias', 'Seriales']
    const rows = filtrados.map(r => {
      const items = itemsPorRegistro.get(r.id) || []
      return [
        `SF-${r.numero}`, r.razon_social, nombrePorCorreo.get(r.asesor_correo) || r.asesor_correo,
        fmtFecha(r.fecha_llegada), ESTADO_LABEL_SF[r.estado],
        r.numero_pre_ingreso || '', parseOtstCodes(r.otst).join(', '),
        items.map(it => it.referencia).join(', '), items.map(it => it.serial || '').filter(Boolean).join(', '),
      ]
    })
    const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `equipos-sin-formato_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const columns: Column<EquipoSinFormato>[] = [
    { key: 'numero', header: 'N°', width: '90px', render: r => <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>SF-{r.numero}</span> },
    { key: 'razon_social', header: 'Razón social', render: r => <span style={{ fontWeight: 600 }}>{r.razon_social}</span> },
    { key: 'asesor', header: 'Asesor', render: r => <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{nombrePorCorreo.get(r.asesor_correo) || r.asesor_correo}</span> },
    { key: 'fecha_llegada', header: 'Fecha llegada', width: '120px', render: r => <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{fmtFecha(r.fecha_llegada)}</span> },
    {
      key: 'equipos', header: 'Equipos', width: '260px',
      render: r => {
        const items = itemsPorRegistro.get(r.id) || []
        if (!items.length) return <span style={{ color: 'var(--muted)' }}>—</span>
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(it => (
              <div key={it.id} style={{ fontSize: 12 }}>
                <strong>{it.referencia}</strong>{it.serial && <> — <span style={{ fontFamily: 'var(--mono)' }}>{it.serial}</span></>}
                {it.observaciones && <div style={{ color: 'var(--muted)', fontSize: 11 }}>{it.observaciones}</div>}
              </div>
            ))}
          </div>
        )
      },
    },
    {
      key: 'estado', header: 'Estado', width: '130px',
      render: r => (
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, ...B_ESTADO[r.estado] }}>
          {ESTADO_LABEL_SF[r.estado]}
        </span>
      ),
    },
  ]

  return (
    <div>
      <Header
        title="Equipos Sin Formato"
        subtitle="Registro y seguimiento de equipos recibidos sin formato de ingreso"
        actions={puedeEditar ? <button onClick={() => navigate('/equipos-sin-formato/nueva')} style={PRI}><Plus size={14} /> Nuevo registro</button> : undefined}
      />

      <Card>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, flexWrap: 'wrap' }}>
            {([['todas', 'Todas'], ['recibido', 'Recibido'], ['pendiente', 'Pendiente'], ['preingresado', 'Preingresado'], ['ingresado', 'Ingresado']] as [VistaFiltro, string][]).map(([v, label]) => (
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por razón social, SF-, referencia o serial..." style={{ ...INP, paddingLeft: 34 }} />
          </div>
          <button onClick={exportarCSV} disabled={filtrados.length === 0} style={{ ...GHOST, opacity: filtrados.length === 0 ? .5 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> CSV
          </button>
        </div>

        {isLoading ? (
          <div style={EMPTY}><p>Cargando…</p></div>
        ) : filtrados.length === 0 ? (
          <div style={EMPTY}><PackageX size={32} strokeWidth={1.5} /><p>No hay registros para este filtro</p></div>
        ) : (
          <Table columns={columns} data={filtrados} keyExtractor={r => r.id} onRowClick={r => navigate(`/equipos-sin-formato/${r.id}`)} />
        )}
      </Card>
    </div>
  )
}
