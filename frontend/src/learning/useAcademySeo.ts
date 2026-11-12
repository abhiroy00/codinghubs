import { useMemo } from 'react'
import { useSeo } from '../seo/useSeo'
import { SITE_URL } from '../locations/registry'
import { LOGO_URL } from '../seo/site'

export function useAcademySeo(title:string, description:string, path:string, indexable=true){
  const seo=useMemo(()=>({title,description,canonical:`${SITE_URL}${path}`,robots:indexable?'index, follow':'noindex, follow',og:{title,description,url:`${SITE_URL}${path}`,image:LOGO_URL,type:'website'},json_ld:{'@context':'https://schema.org','@type':'CollectionPage',name:title,description,url:`${SITE_URL}${path}`}}),[title,description,path,indexable])
  useSeo(seo)
}
