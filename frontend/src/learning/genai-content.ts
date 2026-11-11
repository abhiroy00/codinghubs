import manifest from './genai-generated/manifest.json'
export const GENAI_LEVELS = manifest
export const genaiPath = (level: number) => `/interview-prep/generative-ai/levels/${level}/`
export interface GenAIArticle { id:string; slug:string; title:string; concept:string; mechanism:string; boundary:string; example:string; application:string; code:string; expected:string; sources:string[]; tags:string[] }
export interface GenAIQuestion { id:string; title:string; category:string; answer:string; conceptual_explanation:string; example:string; application:string; follow_ups:string[]; difficulty:string; tags:string[]; article:string; companies:string[]; provenance:string; sources:string[]; reviewed_at:string }
export interface GenAIDay { day:number; id:string; title:string; articles:string[]; objectives:string[]; assignment:string; deliverables:string[]; revision:string[] }
export interface GenAILevel { level:number; title:string; start:number; end:number; categories:string[]; articles:GenAIArticle[]; questions:GenAIQuestion[]; days:GenAIDay[]; reviewed_at:string; sources:Record<string,{id:string;title:string;url:string;checked_at:string}>; companies:{name:string;source:string;focus:string}[] }
const modules=import.meta.glob<{default:GenAILevel}>('./genai-generated/level-*.json')
const cache=new Map<number,GenAILevel>()
export const getGenAILevel=(n:number)=>cache.get(n)
export async function loadGenAILevel(n:number) {
  if(cache.has(n)) return cache.get(n)!
  const loader=modules[`./genai-generated/level-${n}.json`]
  if(!loader) throw new Error('Unknown learning level')
  const data=(await loader()).default; cache.set(n,data); return data
}
