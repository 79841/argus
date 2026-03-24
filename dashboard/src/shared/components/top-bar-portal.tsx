'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

const PortalContext = createContext<{
  target: HTMLDivElement | null
  setTarget: (el: HTMLDivElement | null) => void
}>({ target: null, setTarget: () => {} })

export const useTopBarPortal = () => useContext(PortalContext)

export const TopBarPortalProvider = ({ children }: { children: ReactNode }) => {
  const [target, setTarget] = useState<HTMLDivElement | null>(null)
  return (
    <PortalContext.Provider value={{ target, setTarget }}>
      {children}
    </PortalContext.Provider>
  )
}
