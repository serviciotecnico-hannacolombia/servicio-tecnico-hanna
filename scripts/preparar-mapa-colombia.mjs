// Genera src/modules/tarifas/mapaColombia.json (mapa SVG de Colombia por
// departamentos + coordenadas de municipios) para Tarifas de Envío.
// Consulta puntual; el resultado se versiona y la app no consulta servicios.
//
//   node scripts/preparar-mapa-colombia.mjs <deptos.geojson> <divipola.csv>
//
// Fuentes:
//   deptos.geojson → https://gist.github.com/john-guerra/43c7656821069d00dcbc (Colombia.geo.json, DANE)
//   divipola.csv   → https://www.datos.gov.co/resource/gdxc-w37w.csv?$limit=5000 (DIVIPOLA geolocalizada, DANE)
import fs from 'node:fs'

const [geoPath, csvPath] = process.argv.slice(2)
if (!geoPath || !csvPath) throw new Error('Uso: node scripts/preparar-mapa-colombia.mjs <deptos.geojson> <divipola.csv>')

// Misma limpieza que limpiarNombre() en src/modules/tarifas/mapaNombres.ts
const limpiar = v => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\bd\.?\s?c\.?$/, '').replace(/\(.*?\)/g, ' ').replace(/[.,'´`-]/g, ' ').replace(/\s+/g, ' ').trim()

const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'))
const filas = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/)
const cab = parseCsv(filas[0])
const municipiosCsv = filas.slice(1).map(l => {
  const c = parseCsv(l)
  const r = Object.fromEntries(cab.map((h, i) => [h, c[i]]))
  return { dep: r.cod_dpto, depNombre: r.dpto, nombre: r.nom_mpio, lng: Number(r.longitud.replace(',', '.')), lat: Number(r.latitud.replace(',', '.')) }
}).filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lng))

function parseCsv(linea) {
  const out = []; let cur = '', q = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]
    if (ch === '"') { if (q && linea[i + 1] === '"') { cur += '"'; i++ } else q = !q }
    else if (ch === ',' && !q) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

// ── Proyección ───────────────────────────────────────────────────────────────
// Equirectangular con corrección por coseno de la latitud media. El territorio
// continental ocupa el lienzo; San Andrés y Providencia (88) van en un
// recuadro arriba a la izquierda, con su propia escala.
const ANCHO = 500
const MARGEN = 8
const SAI = '88'
const continental = { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
for (const f of geo.features) {
  if (f.properties.DPTO === SAI) continue
  for (const [lng, lat] of puntos(f.geometry)) {
    continental.minLng = Math.min(continental.minLng, lng); continental.maxLng = Math.max(continental.maxLng, lng)
    continental.minLat = Math.min(continental.minLat, lat); continental.maxLat = Math.max(continental.maxLat, lat)
  }
}
const cosLat = Math.cos(((continental.minLat + continental.maxLat) / 2) * Math.PI / 180)
const k = (ANCHO - 2 * MARGEN) / ((continental.maxLng - continental.minLng) * cosLat)
const ALTO = Math.ceil((continental.maxLat - continental.minLat) * k + 2 * MARGEN)
const proyContinental = ([lng, lat]) => [MARGEN + (lng - continental.minLng) * cosLat * k, MARGEN + (continental.maxLat - lat) * k]

// Recuadro de San Andrés: lng -81.75..-81.33, lat 12.47..13.42
const RECUADRO = { x: MARGEN, y: MARGEN, w: 46, h: 96 }
const sai = { minLng: -81.75, maxLng: -81.33, minLat: 12.47, maxLat: 13.42 }
const kSai = Math.min(RECUADRO.w / ((sai.maxLng - sai.minLng) * cosLat), RECUADRO.h / (sai.maxLat - sai.minLat))
const proySai = ([lng, lat]) => [RECUADRO.x + (lng - sai.minLng) * cosLat * kSai, RECUADRO.y + (sai.maxLat - lat) * kSai]

function* puntos(g) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  for (const p of polys) for (const ring of p) yield* ring
}

// ── Simplificación (Douglas-Peucker) ─────────────────────────────────────────
function simplificar(pts, tol) {
  if (pts.length < 4) return pts
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1
  const pila = [[0, pts.length - 1]]
  while (pila.length) {
    const [a, b] = pila.pop()
    let max = 0, idx = -1
    const [ax, ay] = pts[a], [bx, by] = pts[b]
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy)
    for (let i = a + 1; i < b; i++) {
      // Anillo cerrado (a == b): se mide la distancia al punto, no a la recta.
      const d = len === 0
        ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay)
        : Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len
      if (d > max) { max = d; idx = i }
    }
    if (max > tol) { keep[idx] = 1; pila.push([a, idx], [idx, b]) }
  }
  return pts.filter((_, i) => keep[i])
}

function area(pts) {
  let s = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1])
  return Math.abs(s / 2)
}

const r1 = n => Math.round(n * 10) / 10

function pathDe(g, proy, tol, areaMin) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  let d = ''
  for (const p of polys) {
    for (const ring of p) {
      const pts = simplificar(ring.map(proy), tol).map(([x, y]) => [r1(x), r1(y)])
      if (pts.length < 4 || area(pts) < areaMin) continue
      d += 'M' + pts.slice(0, -1).map(([x, y]) => `${x} ${y}`).join('L') + 'Z'
    }
  }
  return d
}

// Nombre oficial del departamento (con tildes) tomado de la DIVIPOLA.
const nombreDep = new Map(municipiosCsv.map(m => [m.dep, m.depNombre]))

const departamentos = geo.features.map(f => {
  const cod = f.properties.DPTO
  const esSai = cod === SAI
  return {
    cod,
    nombre: nombreDep.get(cod) || f.properties.NOMBRE_DPT,
    n: limpiar(nombreDep.get(cod) || f.properties.NOMBRE_DPT),
    d: esSai ? pathDe(f.geometry, proySai, 0.15, 0.05) : pathDe(f.geometry, proyContinental, 0.5, 0.3),
  }
}).sort((a, b) => a.cod.localeCompare(b.cod))

const municipios = municipiosCsv.map(m => {
  const [x, y] = (m.dep === SAI ? proySai : proyContinental)([m.lng, m.lat])
  return { c: m.dep, n: limpiar(m.nombre), nombre: m.nombre, x: r1(x), y: r1(y) }
})

const salida = {
  fuente: 'DANE — Colombia.geo.json (departamentos) y DIVIPOLA geolocalizada (datos.gov.co gdxc-w37w)',
  viewBox: `0 0 ${ANCHO} ${ALTO}`,
  recuadroSai: RECUADRO,
  departamentos,
  municipios,
}
const destino = 'src/modules/tarifas/mapaColombia.json'
fs.writeFileSync(destino, JSON.stringify(salida))
console.log(`${destino}: ${departamentos.length} departamentos, ${municipios.length} municipios, ${(fs.statSync(destino).size / 1024).toFixed(0)} KB, viewBox ${salida.viewBox}`)
