// Nombres de personas: cada palabra con mayúscula inicial, el resto en
// minúscula ("MATEO CAMILO VILLARRAGA" → "Mateo Camilo Villarraga").
// Misma regla que normalizar_nombre() en la BD (migración
// 20261019b_normalizar_nombres.sql), que es la que garantiza el resultado;
// esto solo hace que se guarde ya normalizado desde el formulario.
export function normalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es')
    .replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (_, sep: string, letra: string) => sep + letra.toLocaleUpperCase('es'))
}
