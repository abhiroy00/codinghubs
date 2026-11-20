import { COURSE_ROADMAPS,courseLevelPath } from './course-roadmap-content'
import { SITE_URL } from '../locations/registry'
import { LOGO_URL,ORG_ID,organizationNode } from '../seo/site'
import type { Seo } from '../content-pages/api'
const truncate=(text:string,max:number)=>text.length<=max?text:text.slice(0,max-1).replace(/\s+\S*$/,'')+'…'
/** Article title with its course as a suffix when it fits; otherwise the article title alone, never cut mid-suffix. */
const fitTitle=(article:string,course:string)=>`${article} | ${course}`.length<=65?`${article} | ${course}`:truncate(article,65)
export function courseRoadmapMeta(slug:string,number:number,article?:string,day?:number):Seo {
 const course=COURSE_ROADMAPS[slug],level=course?.levels.find(l=>l.level===number)
 const reading=level?.articles.find(a=>a.slug===article),daily=level?.days.find(d=>d.day===day)
 const valid=!!level&&(!article||!!reading)&&(day===undefined||!!daily)
 const primary=course?.primary??slug
 const path=courseLevelPath(primary,number)+(article?`articles/${article}/`:day!==undefined?`days/${day}/`:'')
 const canonical=SITE_URL+path
 const name=reading?.title??daily?.title??`${course?.name??'Course'}: ${level?.title??'Page unavailable'}`
 const title=reading?fitTitle(reading.title,course.name):truncate(daily?`${course.name}: Day ${day} Study Guide | Coding Hubs`:`${course?.name??'Course'}: Level ${number} Interview | Coding Hubs`,65)
 const description=truncate(reading?.description??`${course?.name??'Course'} ${daily?'day '+day:level?.title.toLowerCase()??'study plan'}: ${daily?'objectives, practical tasks and revision':`${level?.articleCount??0} available lessons, ${level?.questionCount??0} questions and a daily plan`}. Read freely and save practice progress.`,165)
 const indexable=valid&&primary===slug&&(reading!==undefined||daily?.available===true||(!article&&day===undefined&&(level?.articleCount??0)>0))
 const trail=[['Home','/'],['Interview','/interview/'],[course?.name??'Course',`/interview/${primary}/`],[`Level ${number}`,courseLevelPath(primary,number)],...(article||day!==undefined?[[name,path]]:[])]
 const graph:Record<string,unknown>[]=[organizationNode(),{'@type':'WebPage','@id':canonical+'#webpage',url:canonical,name:title,description,inLanguage:'en-IN',about:{'@id':ORG_ID}},{'@type':'BreadcrumbList',itemListElement:trail.map(([name,url],i)=>({'@type':'ListItem',position:i+1,name,item:SITE_URL+url}))}]
 if(indexable)graph.push({'@type':'LearningResource','@id':canonical+'#learning-resource',name,url:canonical,description,inLanguage:'en-IN',isAccessibleForFree:true,publisher:{'@id':ORG_ID},learningResourceType:reading?'Concept lesson':daily?'Daily lesson and practice':'Interview preparation guide',isPartOf:{'@type':'LearningResource',name:course.name,url:SITE_URL+`/interview/${primary}/`}})
 return {title,description,canonical,robots:indexable?'index, follow, max-image-preview:large':'noindex, follow',og:{type:'website',title,description,url:canonical,image:LOGO_URL,alt:'Coding Hubs School of AI'},json_ld:{'@context':'https://schema.org','@graph':graph}}
}
