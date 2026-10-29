import type Lenis from 'lenis'
import { createContext, useContext, type ReactNode, type RefObject } from 'react'
import { useLenis as useLenisInstance } from '../hooks/useLenis'

const LenisContext = createContext<RefObject<Lenis | null> | null>(null)

export function LenisProvider({ children }: { children: ReactNode }) {
  const ref = useLenisInstance()
  return <LenisContext.Provider value={ref}>{children}</LenisContext.Provider>
}

/** Returns a ref whose `.current` is the active Lenis instance (or null if reduced-motion). */
export function useLenisRef() {
  const ctx = useContext(LenisContext)
  // Prerender (no provider) and reduced-motion get an empty ref: callers fall back to native scrolling.
  return ctx ?? EMPTY
}

const EMPTY: RefObject<Lenis | null> = { current: null }
