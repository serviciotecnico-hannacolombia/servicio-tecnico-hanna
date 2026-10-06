// Utilidades CSV del módulo Mant. In Situ. Se exporta con ";" y BOM para
// que Excel en español lo abra en columnas y con tildes; al importar se
// detecta el separador solo (sirve también un CSV guardado con ",").
import Papa from 'papaparse'

export interface CsvLeido {
  columnas: string[]                 // nombres normalizados (minúsculas, sin tildes)
  filas: Record<string, string>[]    // claves = columnas normalizadas
}

export function normalizarColumna(c: string): string {
  return c.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, '_')
}

export function descargarCSV(nombre: string, columnas: string[], filas: (string | number | null | undefined)[][]) {
  const csv = Papa.unparse({ fields: columnas, data: filas.map(f => f.map(v => v == null ? '' : String(v))) }, { delimiter: ';' })
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mant-in-situ_${nombre}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function leerCSV(file: File): Promise<CsvLeido> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: normalizarColumna,
      complete: res => {
        if (res.errors.length && !res.data.length) { reject(new Error(res.errors[0].message)); return }
        resolve({ columnas: res.meta.fields ?? [], filas: res.data })
      },
      error: err => reject(err),
    })
  })
}

// Número desde una celda. Vacía → null. Acepta "150000", "150.000",
// "$ 150.000", "1,5" o "1.5". Con `entero`, los puntos y comas se toman
// como separadores de miles. Devuelve NaN si no es un número.
export function leerNumero(v: string | undefined, entero = false): number | null {
  const t = (v ?? '').replace(/[$\s]/g, '')
  if (!t) return null
  if (entero) {
    if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(t)) return NaN
    return Number(t.replace(/[.,]/g, ''))
  }
  const decimal = /^\d+,\d+$/.test(t) ? t.replace(',', '.') : t
  return /^\d+(\.\d+)?$/.test(decimal) ? Number(decimal) : NaN
}

export function leerSiNo(v: string | undefined): boolean | null {
  const t = (v ?? '').trim().toLowerCase()
  if (!t) return null
  if (['si', 'sí', 's', 'true', '1', 'x'].includes(t)) return true
  if (['no', 'n', 'false', '0'].includes(t)) return false
  return null
}

export function texto(v: string | undefined): string {
  return (v ?? '').trim()
}
