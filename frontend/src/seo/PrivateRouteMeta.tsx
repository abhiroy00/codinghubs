import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useSeo } from './useSeo'

/** Private app URLs must not inherit indexable metadata after SPA navigation. */
export function PrivateRouteMeta() {
  const { pathname } = useLocation()
  const seo = useMemo(() => {
    const section = pathname.split('/')[1]
    const names: Record<string, string> = { login:'Sign in', register:'Create an account', dashboard:'Your dashboard', enroll:'Course enrollment', cart:'Your cart', checkout:'Checkout', payment:'Payment status', 'my-account':'Your account', ai:'AI practice tools' }
    if (!names[section]) return null
    const title = names[section] + ' | Coding Hubs'
    const description = 'Your Coding Hubs account and application workspace.'
    return { title, description, canonical:'', robots:'noindex, nofollow', og:{ type:'website', title, description, image:'https://codinghubs.in/assets/coding-hubs-school-of-ai-logo.jpeg', url:'https://codinghubs.in' + pathname }, json_ld:null }
  }, [pathname])
  useSeo(seo)
  return null
}
