import { createContext, useContext, useEffect, useState, type ReactNode, createElement } from 'react'
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
  refreshProfile: async () => {},
})

async function fetchProfileById(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

async function fetchPermissions(roleId: string | null): Promise<{ modules: Set<ModuleKey>; capabilities: Set<CapabilityKey> }> {
  if (!roleId) return { modules: new Set(), capabilities: new Set() }

  const [{ data: modules }, { data: capabilities }] = await Promise.all([
    supabase.from('role_modules').select('module_key').eq('role_id', roleId),
    supabase.from('role_capabilities').select('capability_key').eq('role_id', roleId),
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

  const loadProfileAndPermissions = async (userId: string) => {
    const p = await fetchProfileById(userId)
    setProfile(p)
    const { modules, capabilities } = await fetchPermissions(p?.role_id ?? null)
    setModules(modules)
    setCapabilities(capabilities)
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      if (u) await loadProfileAndPermissions(u.id)
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await loadProfileAndPermissions(u.id)
      } else {
        setProfile(null)
        setModules(new Set())
        setCapabilities(new Set())
      }
      setLoading(false)
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

  const refreshProfile = async () => {
    if (user) await loadProfileAndPermissions(user.id)
  }

  return createElement(
    UserContext.Provider,
    { value: { user, profile, displayName, isAdmin, hasModule, hasCapability, loading, signOut, updateDisplayName, updateAvatar, refreshProfile } },
    children
  )
}

export function useUser(): UserContextValue {
  return useContext(UserContext)
}
