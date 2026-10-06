// Mant. In Situ — cotizador de mantenimiento en las instalaciones del
// cliente (Bogotá y alrededores). Reemplaza el HTML suelto que guardaba su
// configuración en el navegador: ahora todo vive en la base de datos y solo
// la consulta en curso se recuerda en el navegador de cada usuario.
import { useEffect, useState } from 'react'
import { Header } from '../../components/layout/Header'
import { useUser } from '../../hooks/useUser'
import { ConsultaTab, type ItemConsulta } from './ConsultaTab'
import { ConfiguracionTab } from './ConfiguracionTab'

type Tab = 'consulta' | 'configuracion'

interface ConsultaGuardada { destino: string, items: ItemConsulta[], avisoOmitido: string }

const CLAVE_CONSULTA = 'mant_in_situ_consulta'

// localStorage puede no estar disponible (modo privado, bloqueado): la
// consulta simplemente arranca vacía.
function leerConsulta(): ConsultaGuardada {
  try {
    const raw = JSON.parse(localStorage.getItem(CLAVE_CONSULTA) || 'null')
    if (raw && typeof raw === 'object') {
      return {
        destino: typeof raw.destino === 'string' ? raw.destino : '',
        items: Array.isArray(raw.items)
          ? raw.items.filter((i: unknown): i is ItemConsulta => !!i && typeof (i as ItemConsulta).referencia === 'string' && Number((i as ItemConsulta).cantidad) >= 1)
          : [],
        avisoOmitido: typeof raw.avisoOmitido === 'string' ? raw.avisoOmitido : '',
      }
    }
  } catch { /* sin almacenamiento */ }
  return { destino: '', items: [], avisoOmitido: '' }
}

export function MantInSituPage() {
  const { hasCapability } = useUser()
  const puedeConfigurar = hasCapability('mant_in_situ_editar')
  const [tab, setTab] = useState<Tab>('consulta')
  const [inicial] = useState(leerConsulta)
  const [destino, setDestino] = useState(inicial.destino)
  const [items, setItems] = useState<ItemConsulta[]>(inicial.items)
  const [avisoOmitido, setAvisoOmitido] = useState(inicial.avisoOmitido)

  useEffect(() => {
    try { localStorage.setItem(CLAVE_CONSULTA, JSON.stringify({ destino, items, avisoOmitido })) } catch { /* sin almacenamiento */ }
  }, [destino, items, avisoOmitido])

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
        : <ConsultaTab destino={destino} setDestino={setDestino} items={items} setItems={setItems} avisoOmitido={avisoOmitido} setAvisoOmitido={setAvisoOmitido} />}
    </div>
  )
}
