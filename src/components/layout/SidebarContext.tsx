import { createContext, useContext, useState, createElement, type ReactNode } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue>({ collapsed: false, toggle: () => {} })

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return createElement(
    SidebarContext.Provider,
    { value: { collapsed, toggle: () => setCollapsed(c => !c) } },
    children
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
