import { useEffect, useState, type ComponentType } from 'react'

/** The cart drawer is only needed after something is added to the cart, so its code loads on the first 'cart-open' event. */
export function LazyCartDrawer() {
  const [Drawer, setDrawer] = useState<ComponentType | null>(null)
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent).detail
      void import('./CartDrawer').then((m) => {
        setDrawer(() => m.CartDrawer)
        // the drawer registers its own listener after it mounts; replay the event for it
        setTimeout(() => window.dispatchEvent(new CustomEvent('cart-open', { detail })), 60)
      })
    }
    window.addEventListener('cart-open', onOpen, { once: true })
    return () => window.removeEventListener('cart-open', onOpen)
  }, [])
  return Drawer ? <Drawer /> : null
}
