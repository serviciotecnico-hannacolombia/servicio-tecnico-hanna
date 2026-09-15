import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, PackageX } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { useUser } from '../../hooks/useUser'
import { useAsesores } from '../calibraciones/hooks/useCalibraciones'
import { useEquiposSinFormato, ESTADO_LABEL_SF } from './hooks/useEquiposSinFormato'
import { INP, PRI, EMPTY } from './ui'
import type { EquipoSinFormato, EstadoEquipoSinFormato } from '../../types'

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
  const { data: asesores = [] } = useAsesores()

  const [vista, setVista] = useState<VistaFiltro>('todas')
  const [search, setSearch] = useState('')

  const nombrePorCorreo = new Map(asesores.map(a => [a.correo, a.nombre]))

  const filtrados = registros
    .filter(r => vista === 'todas' || r.estado === vista)
    .filter(r => {
      const q = search.toLowerCase().trim()
      if (!q) return true
      return r.razon_social.toLowerCase().includes(q) || `sf-${r.numero}`.includes(q)
    })

  const columns: Column<EquipoSinFormato>[] = [
    { key: 'numero', header: 'N°', width: '90px', render: r => <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>SF-{r.numero}</span> },
    { key: 'razon_social', header: 'Razón social', render: r => <span style={{ fontWeight: 600 }}>{r.razon_social}</span> },
    { key: 'asesor', header: 'Asesor', render: r => <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{nombrePorCorreo.get(r.asesor_correo) || r.asesor_correo}</span> },
    { key: 'fecha_llegada', header: 'Fecha llegada', width: '120px', render: r => <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{fmtFecha(r.fecha_llegada)}</span> },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por razón social o SF-..." style={{ ...INP, paddingLeft: 34 }} />
          </div>
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
