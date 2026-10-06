// Jornada y vehículo: formulario editable de la configuración única
// (mant_in_situ_config, id = 1). El origen es fijo (HANNA El Dorado).
import { useState } from 'react'
import { toast } from 'sonner'
import { Card } from '../../../components/ui/Card'
import { Spinner } from '../../../components/ui/Spinner'
import { useConfigInSitu, useInvalidarMantInSitu } from '../hooks/useMantInSitu'
import { guardarConfig } from '../acciones'
import { leerNumero } from '../csv'
import { EncabezadoPanel } from './EncabezadoPanel'
import { FG, INP, PRI } from '../ui'
import type { MantInSituConfig } from '../../../types'

type CampoNum = 'jornada_horas' | 'costo_km' | 'rendimiento_km_galon' | 'precio_galon' | 'margen_recorrido_pct'

const CAMPOS: { campo: CampoNum, label: string, ayuda: string, min: number, max?: number, entero?: boolean }[] = [
  { campo: 'jornada_horas', label: 'Jornada laboral (horas/día)', ayuda: 'Horas disponibles por día, incluyendo ida y regreso.', min: 1, max: 24 },
  { campo: 'costo_km', label: 'Uso y desgaste del vehículo (COP/km)', ayuda: '', min: 0, entero: true },
  { campo: 'rendimiento_km_galon', label: 'Rendimiento del vehículo (km/galón)', ayuda: 'Ajusta con el consumo medido del vehículo.', min: 1, max: 200 },
  { campo: 'precio_galon', label: 'Precio del combustible (COP/galón)', ayuda: '', min: 0, entero: true },
  { campo: 'margen_recorrido_pct', label: 'Margen del recorrido por sentido (%)', ayuda: 'Se aplica a cada trayecto, en distancia y duración.', min: 0, max: 50 },
]

export function JornadaPanel() {
  const { data: config, isLoading } = useConfigInSitu()
  if (isLoading) return <Card><Spinner size={24} /></Card>
  if (!config) return <Card><p style={{ color: 'var(--muted)' }}>Falta la configuración inicial — aplica la migración del módulo.</p></Card>
  // key: si otro usuario guarda, el formulario se reinicia con los datos nuevos.
  return <FormularioJornada key={config.updated_at} config={config} />
}

function FormularioJornada({ config }: { config: MantInSituConfig }) {
  const invalidar = useInvalidarMantInSitu()
  const [valores, setValores] = useState<Record<CampoNum, string>>(() =>
    Object.fromEntries(CAMPOS.map(c => [c.campo, String(config[c.campo])])) as Record<CampoNum, string>)
  const [descripcion, setDescripcion] = useState(config.descripcion_servicio)
  const [guardando, setGuardando] = useState(false)

  const cambiado = CAMPOS.some(c => valores[c.campo] !== String(config[c.campo])) || descripcion !== config.descripcion_servicio

  async function guardar() {
    const datos: Partial<Record<CampoNum, number>> = {}
    for (const c of CAMPOS) {
      const n = leerNumero(valores[c.campo], c.entero)
      if (n == null || isNaN(n) || n < c.min || (c.max != null && n > c.max)) {
        toast.error(`${c.label}: valor no válido${c.max != null ? ` (entre ${c.min} y ${c.max})` : ''}`)
        return
      }
      datos[c.campo] = n
    }
    setGuardando(true)
    const error = await guardarConfig({ ...datos, descripcion_servicio: descripcion.trim() })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error); return }
    toast.success('Configuración guardada')
    invalidar()
  }

  return (
    <Card>
      <EncabezadoPanel titulo="Jornada y desplazamiento" subtitulo="La ida y el regreso se reservan cada día antes de asignar horas de mantenimiento." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {CAMPOS.map(c => (
          <FG key={c.campo} label={c.label}>
            <input value={valores[c.campo]} onChange={e => setValores(v => ({ ...v, [c.campo]: e.target.value }))} inputMode="decimal" style={INP} />
            {c.ayuda && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.ayuda}</span>}
          </FG>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12.5, lineHeight: 1.6 }}>
        <strong>Origen fijo: {config.origen_nombre}</strong><br />
        {config.origen_direccion}<br />
        <span style={{ color: 'var(--muted)' }}>
          Dentro de Bogotá se cobra únicamente el servicio. Fuera de Bogotá se suman vehículo, combustible y peajes por visita.
          {config.rutas_consultadas_at && <> Distancias a la cabecera municipal consultadas en OSRM el {new Date(config.rutas_consultadas_at).toLocaleDateString('es-CO')}; no incluyen tráfico en tiempo real.</>}
        </span>
      </div>
      <div style={{ marginTop: 16 }}>
        <FG label="Descripción general del servicio (para el cliente)">
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={8} style={{ ...INP, resize: 'vertical', lineHeight: 1.55 }} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Se usa en todas las referencias sin descripción personalizada.</span>
        </FG>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={guardar} disabled={!cambiado || guardando} style={{ ...PRI, opacity: !cambiado || guardando ? .5 : 1 }}>
          {guardando ? 'Guardando…' : '✓ Guardar configuración'}
        </button>
      </div>
    </Card>
  )
}
