import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import { GENAI_LEVELS } from './genai-content'
import { COURSE_ROADMAPS } from './course-roadmap-content'
export type ProgressKind='articles'|'questions'|'coding'|'assignments'
export type RoadmapProgress=Record<ProgressKind,string[]>
const empty=():RoadmapProgress=>({articles:[],questions:[],coding:[],assignments:[]})
const kinds:ProgressKind[]=['articles','questions','coding','assignments']
function clean(value:Partial<RoadmapProgress>,slug='generative-ai'):RoadmapProgress {
  const levels=slug==='generative-ai'?GENAI_LEVELS:COURSE_ROADMAPS[slug]?.levels??[]
  return Object.fromEntries(kinds.map(kind=>[kind,[...new Set((Array.isArray(value[kind])?value[kind]:[]).filter(id=>levels.some(level=>level.progressIds[kind].includes(id))))]])) as RoadmapProgress
}
function read(key:string,slug:string) { try {return clean(JSON.parse(localStorage.getItem(key)||'{}'),slug)}catch{return empty()} }
function merge(a:RoadmapProgress,b:RoadmapProgress,slug:string) {return clean(Object.fromEntries(kinds.map(k=>[k,[...a[k],...b[k]]])),slug)}
export function useRoadmapProgress(slug='generative-ai') {
  const {user,loading}=useAuth()
  const key=slug==='generative-ai'?`ch_genai_roadmap_${user?.id??'guest'}_v1`:`ch_course_roadmap_${slug}_${user?.id??'guest'}_v1`
  const endpoint=`/courses/roadmap/${slug}/progress/`
  const [saved,setSaved]=useState<{key:string;value:RoadmapProgress}>({key:'',value:empty()})
  const [error,setError]=useState('')
  const value=saved.key===key?saved.value:empty()
  useEffect(()=>{
    if(loading)return
    let active=true
    const local=read(key,slug);setSaved({key,value:local});setError('')
    const update=()=>setSaved({key,value:read(key,slug)})
    window.addEventListener('storage',update);window.addEventListener('genai-progress',update)
    if(user) api.get<RoadmapProgress>(endpoint).then(async({data})=>{
      if(!active)return
      const next=merge(read(key,slug),clean(data,slug),slug);localStorage.setItem(key,JSON.stringify(next));setSaved({key,value:next})
      await api.put(endpoint,next)
    }).catch(()=>{if(active)setError('Cloud sync unavailable. Your progress remains saved in this browser.')})
    return()=>{active=false;window.removeEventListener('storage',update);window.removeEventListener('genai-progress',update)}
  },[key,user,loading,slug,endpoint])
  const mark=(kind:ProgressKind,id:string)=>{
    const next=merge(read(key,slug),{...empty(),[kind]:[id]},slug);
    try{localStorage.setItem(key,JSON.stringify(next));setError('')}catch{setError('Browser storage is unavailable. Keep this page open to retain progress.')}
    setSaved({key,value:next});window.dispatchEvent(new Event('genai-progress'))
    if(user)api.put(endpoint,{[kind]:[id]}).catch(()=>setError('Cloud sync unavailable. Your progress remains saved in this browser.'))
  }
  return {value,mark,error,loading,label:user?'Saved to your account and this browser':'Saved in this browser'}
}
export function levelProgress(level:number,value:RoadmapProgress,slug='generative-ai') {
  const levels=slug==='generative-ai'?GENAI_LEVELS:COURSE_ROADMAPS[slug]?.levels??[]
  const ids=levels.find(l=>l.level===level)?.progressIds
  if(!ids)return {done:0,total:0,percent:0}
  const total=kinds.reduce((n,k)=>n+ids[k].length,0)
  const done=kinds.reduce((n,k)=>n+ids[k].filter(id=>value[k].includes(id)).length,0)
  return {done,total,percent:Math.round(done/total*100)}
}
