import manifestData from './course-roadmaps/manifest.json'
import type { Lesson } from './DayLesson'
import type { CourseDefinition } from './catalog'
export type RoadmapIds=Record<'articles'|'questions'|'coding'|'assignments',string[]>
export type CourseRoadmapSummary={slug:string;name:string;primary:string;availableLessons:number;levels:{level:number;title:string;start:number;end:number;articleCount:number;questionCount:number;articles:{slug:string;id:string;title:string;description:string}[];days:{day:number;id:string;title:string;available:boolean}[];progressIds:RoadmapIds}[]}
export const COURSE_ROADMAPS:Record<string,CourseRoadmapSummary>=manifestData
export interface CourseRoadmapQuestion {id:string;day:number;topic:string;difficulty:string;category:string;question:string;answer:string;explanation:string;follow_ups?:string[];provenance:string}
export interface CourseRoadmapDay {day:number;id:string;title:string;available:boolean;focus:string;objectives:string[];assignment:string;steps:string[];revision:string[]}
export interface CourseRoadmapData {slug:string;name:string;focus:string;track:string;tools:string[];projects:CourseDefinition['projects'];hasCoding:boolean;primary:string;levels:{level:number;title:string;start:number;end:number;articles:{id:string;slug:string;lesson:Lesson}[];questions:CourseRoadmapQuestion[];days:CourseRoadmapDay[];progressIds:RoadmapIds}[]}
const modules=import.meta.env.SSR?{}:import.meta.glob<{default:CourseRoadmapData}>(['./course-roadmaps/*.json','!./course-roadmaps/manifest.json'])
const cache=new Map<string,CourseRoadmapData>()
export {courseLevelPath} from './roadmap-paths'
export const getCourseRoadmap=(slug:string)=>cache.get(slug)
export async function loadCourseRoadmap(slug:string){
 if(cache.has(slug))return cache.get(slug)!
 const loader=modules[`./course-roadmaps/${slug}.json`]
 if(!loader)throw new Error('Unknown course roadmap')
 const data=(await loader()).default;cache.set(slug,data);return data
}
