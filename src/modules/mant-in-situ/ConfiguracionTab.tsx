// Configuración (solo con mant_in_situ_editar). Todo se edita en pantalla —
// Equipos en bloque (selección + acciones), Precios base, Jornada, Destinos y
// Tarifas de peajes — y también se puede actualizar por CSV con vista
// previa (importaciones.ts).
import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { EquiposPanel } from './config/EquiposPanel'
import { PreciosPanel } from './config/PreciosPanel'
import { JornadaPanel } from './config/JornadaPanel'
import { DestinosPanel } from './config/DestinosPanel'
import { TarifasPanel } from './config/TarifasPanel'

type SubTab = 'equipos' | 'precios' | 'jornada' | 'destinos' | 'tarifas'

const SUBTABS: [SubTab, string][] = [
  ['equipos', 'Equipos y servicios'], ['precios', 'Precios base'], ['jornada', 'Jornada y vehículo'],
  ['destinos', 'Peajes por destino'], ['tarifas', 'Tarifas de peajes'],
]

export function ConfiguracionTab() {
  const [sub, setSub] = useState<SubTab>('equipos')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', gap: 20, alignItems: 'flex-start' }}>
      <Card bodyStyle={{ padding: 8 }}>
        {SUBTABS.map(([k, label]) => (
          <button key={k} onClick={() => setSub(k)} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: sub === k ? 600 : 500,
            background: sub === k ? 'var(--accent-bg)' : 'transparent', color: sub === k ? 'var(--accent)' : 'var(--text)',
          }}>{label}</button>
        ))}
        <p style={{ fontSize: 11, color: 'var(--muted)', padding: '10px 12px 4px', lineHeight: 1.5 }}>
          Edita en pantalla o en bloque: Descargar CSV → editar → Importar CSV (con vista previa).
        </p>
      </Card>
      {sub === 'equipos' ? <EquiposPanel />
        : sub === 'precios' ? <PreciosPanel />
          : sub === 'jornada' ? <JornadaPanel />
            : sub === 'destinos' ? <DestinosPanel />
              : <TarifasPanel />}
    </div>
  )
}
