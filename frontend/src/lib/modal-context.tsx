import { createContext, useContext, useState, type ReactNode } from 'react'

interface ModalState {
  open: boolean
  mode?: 'demo'
  course?: string
}

interface ModalContextValue {
  state: ModalState
  openModal: (mode?: 'demo', course?: string) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({ open: false })

  return (
    <ModalContext.Provider
      value={{
        state,
        openModal: (mode, course) => setState({ open: true, mode, course }),
        closeModal: () => setState((s) => ({ ...s, open: false })),
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}
