// Cruce de RMV pendientes por facturar: Facturación entrega un CSV con las
// RMV que aún no se han cobrado (una por línea). Se cruza contra las órdenes
// de calibración para saber en qué estado está cada una y, si ya terminó,
// desde cuándo — así se sabe qué se puede cobrar ya.
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Table, type Column } from '../../components/ui/Table'
import { Stat, PRI, GHOST, B_INFO, fechaLocalISO, fmtFecha } from './ui'
import { ESTADO_LABEL, hoyISO } from './hooks/useCalibraciones'
import { tokensNumericos } from './vistas/CamposCompartidos'
import type { OrdenCalibracion } from '../../types'

const NO_ENCONTRADA = 'No encontrada en calibraciones'

interface FilaCruce {
  rmv: string
  orden: OrdenCalibracion | null
  estado: string
  fechaFin: string | null
}

// Primera celda de cada línea, solo dígitos — ignora el encabezado ("RM"),
// líneas vacías y duplicados, conservando el orden del archivo.
function leerRmvs(texto: string): string[] {
  const vistas = new Set<string>()
  for (const linea of texto.split(/\r?\n/)) {
    const rmv = (linea.split(/[,;]/)[0] || '').replace(/\D/g, '')
    if (rmv) vistas.add(rmv)
  }
  return [...vistas]
}

// Fecha de finalización de órdenes terminadas: el cambio de estado registrado
// en el historial es lo más fiel; las órdenes históricas sembradas no lo
// tienen, y su estado_desde quedó con la fecha de la migración que creó la
// columna, así que antes de usarlo se prefiere la entrega del certificado.
async function fechasTerminado(ordenes: OrdenCalibracion[]): Promise<Map<string, string>> {
  const fechas = new Map<string, string>()
  const terminadas = ordenes.filter(o => o.estado === 'terminado')
  if (!terminadas.length) return fechas

  const { data, error } = await supabase
    .from('ordenes_calibracion_historial')
    .select('orden_id, created_at')
    .in('orden_id', terminadas.map(o => o.id))
    .eq('campo', 'estado')
    .eq('valor_nuevo', 'terminado')
    .order('created_at', { ascending: true })
  if (error) toast.error('No se pudo leer el historial: ' + error.message)

  // Orden ascendente: si se terminó más de una vez, gana la última.
  for (const h of data || []) fechas.set(h.orden_id, fechaLocalISO(h.created_at))
  for (const o of terminadas) {
    if (fechas.has(o.id)) continue
    fechas.set(o.id, o.fecha_entrega_certificado || fechaLocalISO(o.estado_desde))
  }
  return fechas
}

function exportarCruce(filas: FilaCruce[]) {
  const headers = ['RMV', 'Estado', 'Fecha de finalización']
  const rows = filas.map(f => [f.rmv, f.estado, f.fechaFin || ''])
  const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rmv_pendientes_facturar_${hoyISO()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function CruceRmvCard({ ordenes }: { ordenes: OrdenCalibracion[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState('')
  const [filas, setFilas] = useState<FilaCruce[]>([])
  const [procesando, setProcesando] = useState(false)

  async function cargar(file: File) {
    setProcesando(true)
    try {
      const rmvs = leerRmvs(await file.text())
      if (!rmvs.length) { toast.error('El archivo no tiene números de RMV'); return }

      // rmv_fv es texto libre ("RMV 123 / FV 456") — se compara por token.
      const coincidencias = rmvs.map(rmv => ({
        rmv,
        ordenes: ordenes.filter(o => tokensNumericos(o.rmv_fv).includes(rmv)),
      }))
      const fechas = await fechasTerminado(coincidencias.flatMap(c => c.ordenes))

      const resultado: FilaCruce[] = []
      for (const { rmv, ordenes: encontradas } of coincidencias) {
        if (!encontradas.length) {
          resultado.push({ rmv, orden: null, estado: NO_ENCONTRADA, fechaFin: null })
          continue
        }
        for (const o of encontradas) {
          resultado.push({
            rmv,
            orden: o,
            estado: ESTADO_LABEL[o.estado] + (o.anulada ? ' (anulada)' : ''),
            fechaFin: fechas.get(o.id) || null,
          })
        }
      }
      setArchivo(file.name)
      setFilas(resultado)
    } finally {
      setProcesando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const totalRmv = new Set(filas.map(f => f.rmv)).size
  const noEncontradas = filas.filter(f => !f.orden).length
  const terminadas = new Set(filas.filter(f => f.orden?.estado === 'terminado' && !f.orden.anulada).map(f => f.rmv)).size

  const columnas: Column<FilaCruce>[] = [
    { key: 'rmv', header: 'RMV', width: '100px', render: f => <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{f.rmv}</span> },
    {
      key: 'orden', header: 'Orden',
      render: f => f.orden ? (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.orden.cliente}</div>
          {f.orden.numero_oc && <span style={{ ...B_INFO, marginTop: 3 }}>{f.orden.numero_oc}</span>}
        </div>
      ) : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      key: 'estado', header: 'Estado', width: '200px',
      render: f => <span style={{ fontSize: 12, color: f.orden ? 'var(--text)' : 'var(--red)' }}>{f.estado}</span>,
    },
    {
      key: 'fecha', header: 'Fecha de finalización', width: '160px',
      render: f => f.fechaFin
        ? <span style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>{fmtFecha(f.fechaFin)}</span>
        : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
  ]

  return (
    <Card>
      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>
        Cruce de RMV pendientes por facturar
      </h4>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 14px' }}>
        Carga el CSV de Facturación (una RMV por línea). Cada RMV de la lista está sin cobrar: aquí ves el estado de su orden y, si ya terminó, desde cuándo.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) cargar(f) }}
        />
        <button onClick={() => inputRef.current?.click()} disabled={procesando} style={GHOST}>
          <Upload size={14} style={{ verticalAlign: -2 }} /> {procesando ? 'Procesando…' : archivo ? 'Cargar otro archivo' : 'Cargar CSV'}
        </button>
        {archivo && <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{archivo}</span>}
        <button onClick={() => exportarCruce(filas)} disabled={!filas.length} style={{ ...PRI, marginLeft: 'auto' }}>
          <Download size={14} style={{ verticalAlign: -2 }} /> Descargar CSV
        </button>
      </div>

      {filas.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, margin: '16px 0' }}>
            <Stat label="RMV en la lista" value={totalRmv} color="var(--accent)" />
            <Stat label="Terminadas (por cobrar)" value={terminadas} color="var(--green, #16a34a)" />
            <Stat label="No encontradas" value={noEncontradas} color="var(--red)" />
          </div>
          <Table columns={columnas} data={filas} keyExtractor={(f, i) => `${f.rmv}-${f.orden?.id ?? i}`} />
        </>
      )}
    </Card>
  )
}
