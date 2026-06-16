import { createContext, useContext, useEffect, useState, type ReactNode, createElement } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UserContextValue {
  user: User | null
  displayName: string
  loading: boolean
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  user: null,
  displayName: '',
  loading: true,
  signOut: async () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const displayName = user?.email?.split('@')[0] ?? ''

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return createElement(UserContext.Provider, { value: { user, displayName, loading, signOut } }, children)
}

export function useUser(): UserContextValue {
  return useContext(UserContext)
}
