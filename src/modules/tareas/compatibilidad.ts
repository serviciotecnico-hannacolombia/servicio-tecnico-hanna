// Reintentar solo ante la ausencia explícita de la columna, nunca ante
// problemas de permisos o red: esas respuestas no garantizan un rechazo sin escritura.
export function faltaColumnaPrivada(error: { code?: string; message?: string } | null): boolean {
  return !!error && ['PGRST204', '42703'].includes(error.code ?? '') &&
    /\bprivada\b/i.test(error.message ?? '')
}
