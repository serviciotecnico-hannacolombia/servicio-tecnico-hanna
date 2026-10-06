// Mant. In Situ — cotizador de mantenimiento en las instalaciones del
// cliente (Bogotá y alrededores). Reemplaza el HTML suelto que guardaba su
// configuración en el navegador. Fase 1: estructura + datos migrados; el
// cálculo de desplazamiento (días, combustible, vehículo, peajes) llega en
// la fase 2.
import { useState } from 'react'
import { Header } from '../../components/layout/Header'
import { useUser } from '../../hooks/useUser'
import { ConsultaTab, type ItemConsulta } from './ConsultaTab'
import { ConfiguracionTab } from './ConfiguracionTab'

type Tab = 'consulta' | 'configuracion'

export function MantInSituPage() {
  const { hasCapability } = useUser()
  const puedeConfigurar = hasCapability('mant_in_situ_editar')
  const [tab, setTab] = useState<Tab>('consulta')
  // La consulta vive aquí para no perderla al pasar a Configuración y volver.
  const [destino, setDestino] = useState('')
  const [items, setItems] = useState<ItemConsulta[]>([])

  const tabStyle = (activa: boolean): React.CSSProperties => ({
    padding: '7px 14px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, fontFamily: 'var(--sans)',
    fontWeight: activa ? 600 : 500, background: activa ? 'var(--accent)' : 'transparent', color: activa ? '#fff' : 'var(--muted)',
  })

  return (
    <div>
      <Header
        title="Mant. In Situ"
        subtitle="Precio del mantenimiento en las instalaciones del cliente — Bogotá y alrededores"
        actions={puedeConfigurar ? (
          <div style={{ display: 'inline-flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 }}>
            <button onClick={() => setTab('consulta')} style={tabStyle(tab === 'consulta')}>Consulta</button>
            <button onClick={() => setTab('configuracion')} style={tabStyle(tab === 'configuracion')}>⚙ Configuración</button>
          </div>
        ) : undefined}
      />

      {tab === 'configuracion' && puedeConfigurar
        ? <ConfiguracionTab />
        : <ConsultaTab destino={destino} setDestino={setDestino} items={items} setItems={setItems} />}
    </div>
  )
}
