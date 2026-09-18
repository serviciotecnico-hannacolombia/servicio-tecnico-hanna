import type { MedicionBloque } from '../types';

export function buildBloqueHtml(bloque: MedicionBloque): string {
  const partes: string[] = [];
  if (bloque.notas.trim()) partes.push(bloque.notas.trim());
  if (bloque.filas.length > 0) {
    const filasHtml = bloque.filas
      .map(f => `  <tr><td>${f.valor}</td><td>${f.estandar}</td><td>${f.tolerancia}</td></tr>`)
      .join('\n');
    partes.push(
      `<table border="1" align="center">\n  <tr><th>${bloque.titulo}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>\n${filasHtml}\n</table>`
    );
  }
  return partes.join('\n\n');
}

export function buildAllBloquesHtml(bloques: MedicionBloque[]): string {
  return bloques.map(buildBloqueHtml).filter(Boolean).join('\n\n');
}
