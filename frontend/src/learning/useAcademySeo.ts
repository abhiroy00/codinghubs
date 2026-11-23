import { useMemo } from 'react'
import { useSeo } from '../seo/useSeo'
import { SITE_URL } from '../locations/registry'
import { LOGO_URL } from '../seo/site'
import { getRobotsDirective, type ContentStatus } from '../seo/robots'

/** Client-side twin of backend/apps/learning/ssr.py: the same status gives the same directive. */
export function useAcademySeo(title:string, description:string, path:string, status:ContentStatus='COMPLETE'){
  const seo=useMemo(()=>({title,description,canonical:`${SITE_URL}${path}`,robots:getRobotsDirective({kind:'content',status}),og:{title,description,url:`${SITE_URL}${path}`,image:LOGO_URL,type:'website'},json_ld:{'@context':'https://schema.org','@type':'CollectionPage',name:title,description,url:`${SITE_URL}${path}`}}),[title,description,path,status])
  useSeo(seo)
}
