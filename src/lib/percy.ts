// Percy es el gato del favicon/logo de la app — este saludo alimenta el
// globo de texto que aparece al pasar el mouse sobre él (ver PercyBubble.tsx).
export function saludoPercy(nombre?: string): string {
  const hora = new Date().getHours()
  const momento = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  return nombre ? `¡${momento}, ${nombre}! Soy Percy 🐱` : `¡${momento}! Soy Percy 🐱`
}

export function primerNombre(nombreCompleto: string): string {
  return nombreCompleto.trim().split(/\s+/)[0] || ''
}
