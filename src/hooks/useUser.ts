import { createContext, useContext, useEffect, useRef, useState, type ReactNode, createElement } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, ModuleKey, CapabilityKey } from '../types'

interface UserContextValue {
  user: User | null
  profile: Profile | null
  displayName: string
  isAdmin: boolean
  hasModule: (key: ModuleKey) => boolean
  hasCapability: (key: CapabilityKey) => boolean
  loading: boolean
  signOut: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
  updateAvatar: (emoji: string | null, color: string | null) => Promise<void>
  updateFavoritos: (favoritos: string[]) => Promise<void>
  refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  user: null,
  profile: null,
  displayName: '',
  isAdmin: false,
  hasModule: () => false,
  hasCapability: () => false,
  loading: true,
  signOut: async () => {},
  updateDisplayName: async () => {},
  updateAvatar: async () => {},
  updateFavoritos: async () => {},
  refreshProfile: async () => {},
})

// Fallos transitorios de red o del gateway de Supabase (el navegador los
// reporta como CORS / ERR_FAILED) no deben dejar al usuario sin permisos:
// se reintenta y, si sigue fallando, se lanza el error en vez de devolver
// listas vacías.
const REINTENTOS_MS = [500, 1500, 4000]

async function conReintentos<T>(
  consulta: () => PromiseLike<{ data: T | null; error: { code?: string; message: string } | null }>,
): Promise<T | null> {
  for (let intento = 0; ; intento++) {
    const { data, error } = await consulta()
    // PGRST116 = .single() sin filas: no es un fallo transitorio.
    if (!error || error.code === 'PGRST116') return data
    if (intento >= REINTENTOS_MS.length) throw new Error(error.message)
    await new Promise(r => setTimeout(r, REINTENTOS_MS[intento]))
  }
}

async function fetchProfileById(userId: string): Promise<Profile | null> {
  return conReintentos<Profile>(() =>
    supabase.from('profiles').select('*').eq('id', userId).single()
  )
}

async function fetchPermissions(roleId: string | null): Promise<{ modules: Set<ModuleKey>; capabilities: Set<CapabilityKey> }> {
  if (!roleId) return { modules: new Set(), capabilities: new Set() }

  const [modules, capabilities] = await Promise.all([
    conReintentos<{ module_key: string }[]>(() =>
      supabase.from('role_modules').select('module_key').eq('role_id', roleId)
    ),
    conReintentos<{ capability_key: string }[]>(() =>
      supabase.from('role_capabilities').select('capability_key').eq('role_id', roleId)
    ),
  ])

  return {
    modules: new Set((modules ?? []).map(m => m.module_key as ModuleKey)),
    capabilities: new Set((capabilities ?? []).map(c => c.capability_key as CapabilityKey)),
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [modules, setModules] = useState<Set<ModuleKey>>(new Set())
  const [capabilities, setCapabilities] = useState<Set<CapabilityKey>>(new Set())
  const [loading, setLoading] = useState(true)
  // Usuario cuyos permisos ya están cargados. Si entra otro (login), hay que
  // volver a loading=true; si no, DefaultRedirect decide con los permisos
  // vacíos y manda a /llamadas ("Sin acceso a este módulo").
  const loadedUserId = useRef<string | null>(null)

  const loadProfileAndPermissions = async (userId: string) => {
    // Si algo falla se lanza antes de tocar el estado: se conservan los
    // permisos que ya hubiera en vez de quedar vacíos.
    const p = await fetchProfileById(userId)
    const { modules, capabilities } = await fetchPermissions(p?.role_id ?? null)
    setProfile(p)
    setModules(modules)
    setCapabilities(capabilities)
  }

  useEffect(() => {
    let mounted = true

    // The callback runs while supabase-js holds its auth lock; awaiting any
    // supabase call inside it deadlocks (e.g. on first load with an expired
    // token). Keep it synchronous and defer the queries out of the lock.
    // INITIAL_SESSION covers the initial load, so no separate getSession().
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)

      if (!u) {
        loadedUserId.current = null
        setProfile(null)
        setModules(new Set())
        setCapabilities(new Set())
        setLoading(false)
        return
      }

      // Token refreshes don't change profile or permissions.
      if (event === 'TOKEN_REFRESHED') return

      if (loadedUserId.current !== u.id) setLoading(true)

      setTimeout(async () => {
        try {
          await loadProfileAndPermissions(u.id)
          loadedUserId.current = u.id
        } catch (err) {
          console.error('Error cargando perfil y permisos', err)
        } finally {
          if (mounted) setLoading(false)
        }
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const displayName =
    profile?.full_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    ''

  const hasModule = (key: ModuleKey) => modules.has(key)
  const hasCapability = (key: CapabilityKey) => capabilities.has(key)
  const isAdmin = hasModule('admin')

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setModules(new Set())
    setCapabilities(new Set())
  }

  const updateDisplayName = async (name: string) => {
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: name } })
    if (error) throw error
    setUser(data.user)
    if (data.user) setProfile(await fetchProfileById(data.user.id))
  }

  const updateAvatar = async (emoji: string | null, color: string | null) => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_emoji: emoji, avatar_color: color })
      .eq('id', user.id)
    if (error) throw error
    setProfile(prev => prev ? { ...prev, avatar_emoji: emoji, avatar_color: color } : null)
  }

  const updateFavoritos = async (favoritos: string[]) => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ favoritos_modulos: favoritos })
      .eq('id', user.id)
    if (error) throw error
    setProfile(prev => prev ? { ...prev, favoritos_modulos: favoritos } : null)
  }

  const refreshProfile = async () => {
    if (user) await loadProfileAndPermissions(user.id)
  }

  return createElement(
    UserContext.Provider,
    { value: { user, profile, displayName, isAdmin, hasModule, hasCapability, loading, signOut, updateDisplayName, updateAvatar, updateFavoritos, refreshProfile } },
    children
  )
}

export function useUser(): UserContextValue {
  return useContext(UserContext)
}
