import { createContext, useContext, useEffect, useState, type ReactNode, createElement } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../types'

interface UserContextValue {
  user: User | null
  profile: Profile | null
  displayName: string
  role: UserRole
  isAdmin: boolean
  loading: boolean
  signOut: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  user: null,
  profile: null,
  displayName: '',
  role: 'user',
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  updateDisplayName: async () => {},
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

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      if (u) setProfile(await fetchProfileById(u.id))
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        setProfile(await fetchProfileById(u.id))
      } else {
        setProfile(null)
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

  const role: UserRole = profile?.role ?? 'user'
  const isAdmin = role === 'admin'

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const updateDisplayName = async (name: string) => {
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: name } })
    if (error) throw error
    setUser(data.user)
    if (data.user) setProfile(await fetchProfileById(data.user.id))
  }

  const refreshProfile = async () => {
    if (user) setProfile(await fetchProfileById(user.id))
  }

  return createElement(
    UserContext.Provider,
    { value: { user, profile, displayName, role, isAdmin, loading, signOut, updateDisplayName, refreshProfile } },
    children
  )
}

export function useUser(): UserContextValue {
  return useContext(UserContext)
}
