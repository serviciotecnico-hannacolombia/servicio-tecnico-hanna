// Datos de la Biblioteca (documentos del SGC): carpetas, documentos y sus
// revisiones (PDF en el bucket privado "biblioteca-sgc"). Ver
// supabase/migrations/20261103_modulo_biblioteca.sql. Las revisiones
// obsoletas solo llegan a quien tiene biblioteca_gestionar (RLS).
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import { storageSafe } from '../estilos'
import type { BibliotecaCarpeta, BibliotecaDocumento } from '../../../types'

const BUCKET = 'biblioteca-sgc'

export function useCarpetas() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['biblioteca_carpetas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('biblioteca_carpetas').select('*').order('orden').order('nombre')
      if (error) throw error
      return data as BibliotecaCarpeta[]
    },
    enabled: !!user,
  })
}

export function useDocumentos() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['biblioteca_documentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('biblioteca_documentos')
        .select('*, revisiones:biblioteca_revisiones(*)')
        .order('codigo', { nullsFirst: false }).order('titulo')
      if (error) throw error
      return (data as BibliotecaDocumento[]).map(d => ({
        ...d, revisiones: [...(d.revisiones ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      }))
    },
    enabled: !!user,
  })
}

// ── Editores (personas que gestionan, además de la capability por rol) ──────

export function useEditores() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['biblioteca_editores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('biblioteca_editores').select('user_id, created_at').order('created_at')
      if (error) throw error
      return data as { user_id: string, created_at: string }[]
    },
    enabled: !!user,
  })
}

// Gestiona quien tiene biblioteca_gestionar (rol) o está en la lista de editores.
export function usePuedeGestionar(): boolean {
  const { user, hasCapability } = useUser()
  const { data: editores = [] } = useEditores()
  return hasCapability('biblioteca_gestionar') || (!!user && editores.some(e => e.user_id === user.id))
}

export async function agregarEditor(userId: string) {
  const { error } = await supabase.from('biblioteca_editores').insert({ user_id: userId })
  if (error) throw error
}

export async function quitarEditor(userId: string) {
  const { error } = await supabase.from('biblioteca_editores').delete().eq('user_id', userId)
  if (error) throw error
}

export function useInvalidateBiblioteca() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['biblioteca_carpetas'] })
    qc.invalidateQueries({ queryKey: ['biblioteca_documentos'] })
    qc.invalidateQueries({ queryKey: ['biblioteca_editores'] })
  }
}

// ── Carpetas ─────────────────────────────────────────────────────────────────

export async function crearCarpeta(nombre: string, orden: number) {
  const { error } = await supabase.from('biblioteca_carpetas').insert({ nombre: nombre.trim(), orden })
  if (error) throw error
}

export async function renombrarCarpeta(id: string, nombre: string) {
  const { error } = await supabase.from('biblioteca_carpetas').update({ nombre: nombre.trim() }).eq('id', id)
  if (error) throw error
}

export async function eliminarCarpeta(id: string) {
  const { error } = await supabase.from('biblioteca_carpetas').delete().eq('id', id)
  if (error) throw error
}

// ── Documentos y revisiones ─────────────────────────────────────────────────

export interface DatosRevision {
  revision: string
  fecha_revision: string | null
  vigente: boolean
  fecha_aprobacion: string | null
  notas: string | null
}

async function subirPdf(documentoId: string, file: File): Promise<string> {
  const path = `${documentoId}/${Date.now()}-${storageSafe(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf' })
  if (error) throw error
  return path
}

// Toda revisión entra como pendiente; si se sube como vigente se aprueba con
// el RPC, que pasa la vigente anterior a obsoleta en la misma transacción.
async function registrarRevision(documentoId: string, datos: DatosRevision, file: File) {
  const path = await subirPdf(documentoId, file)
  const { data, error } = await supabase.from('biblioteca_revisiones').insert({
    documento_id: documentoId,
    revision: datos.revision.trim(),
    fecha_revision: datos.fecha_revision || null,
    estado: 'pendiente_aprobacion',
    storage_path: path,
    nombre_archivo: file.name,
    tamano_bytes: file.size,
    notas: datos.notas?.trim() || null,
  }).select('id').single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  if (datos.vigente) await aprobarRevision(data.id, datos.fecha_aprobacion)
}

export async function crearDocumento(
  doc: { carpeta_id: string, titulo: string, codigo: string | null }, datos: DatosRevision, file: File,
) {
  const { data, error } = await supabase.from('biblioteca_documentos').insert({
    carpeta_id: doc.carpeta_id, titulo: doc.titulo.trim(), codigo: doc.codigo?.trim() || null,
  }).select('id').single()
  if (error) throw error
  try {
    await registrarRevision(data.id, datos, file)
  } catch (e) {
    // Sin PDF el documento no sirve: se deshace.
    await supabase.from('biblioteca_documentos').delete().eq('id', data.id)
    throw e
  }
}

export async function subirRevision(documentoId: string, datos: DatosRevision, file: File) {
  await registrarRevision(documentoId, datos, file)
  await supabase.from('biblioteca_documentos').update({ updated_at: new Date().toISOString() }).eq('id', documentoId)
}

export async function aprobarRevision(revisionId: string, fecha: string | null) {
  const { error } = await supabase.rpc('aprobar_revision_biblioteca', { _revision_id: revisionId, _fecha: fecha })
  if (error) throw error
}

export async function editarDocumento(id: string, cambios: { carpeta_id: string, titulo: string, codigo: string | null }) {
  const { error } = await supabase.from('biblioteca_documentos').update({
    carpeta_id: cambios.carpeta_id, titulo: cambios.titulo.trim(), codigo: cambios.codigo?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw error
}

// Primero el registro (las revisiones caen en cascada) y luego los archivos:
// si falla el borrado no quedan registros apuntando a archivos inexistentes.
export async function eliminarDocumento(doc: BibliotecaDocumento) {
  const { error } = await supabase.from('biblioteca_documentos').delete().eq('id', doc.id)
  if (error) throw error
  const paths = doc.revisiones.map(r => r.storage_path)
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
}

export async function eliminarRevision(id: string, storagePath: string) {
  const { error } = await supabase.from('biblioteca_revisiones').delete().eq('id', id)
  if (error) throw error
  await supabase.storage.from(BUCKET).remove([storagePath])
}

// ── Ver y descargar ─────────────────────────────────────────────────────────

export async function urlVer(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600)
  if (error) throw error
  return data.signedUrl
}

export async function descargar(path: string, nombre: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60, { download: nombre })
  if (error) throw error
  const a = document.createElement('a')
  a.href = data.signedUrl
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
