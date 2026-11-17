import { mkdir,readFile,writeFile } from 'node:fs/promises'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'../..')
const read=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'))
const guides=await read('frontend/src/interview/guides.json')
const courses=await read('frontend/src/learning/course-roadmaps/manifest.json')
const genai=await read('frontend/src/learning/genai-generated/manifest.json')
const rows=[]
const plain=v=>typeof v==='string'?v.replace(/<[^>]+>/g,' '):JSON.stringify(v)
const add=(url,title,category,difficulty,summary,content,kind)=>rows.push({url,title,category,difficulty,summary:summary.slice(0,320),search:plain(content),kind})
for(const g of guides)add(`/interview/guides/${g.slug}/`,g.title,g.category,g.difficulty,g.summary,g,'guide')
for(const course of Object.values(courses)){
 if(course.primary!==course.slug||!course.availableLessons)continue
 const category=/cloud|aws|azure|security|cyber/i.test(course.name)?'Cloud & Security':/data|analytics|sql/i.test(course.name)?'SQL & Data':/full.stack|java|python|react|developer|coding/i.test(course.name)?'Languages':'AI & Technology'
 add(`/interview/${course.slug}/`,course.name,category,'Mixed levels',`Subject-specific interview questions, examples and available lessons for ${course.name}.`,course.name,'course')
 const detail=await read(`frontend/src/learning/course-roadmaps/${course.slug}.json`)
 for(const level of detail.levels){
  const difficulty=level.level===1?'Beginner':level.level===4?'Advanced':'Intermediate'
  if(level.articles.length)add(`/interview/${course.slug}/levels/${level.level}/`,`${course.name}: ${level.title}`,category,difficulty,level.title,level.title,'level')
  for(const a of level.articles)add(`/interview/${course.slug}/levels/${level.level}/articles/${a.slug}/`,a.lesson.title,category,difficulty,a.lesson.definition||a.lesson.title,a.lesson,'article')
  for(const d of level.days.filter(d=>d.available))add(`/interview/${course.slug}/levels/${level.level}/days/${d.day}/`,`${course.name} day ${d.day}: ${d.title}`,category,difficulty,d.title,d,'day')
 }
}
add('/interview/generative-ai/','Generative AI','AI & Technology','Beginner','A four-level Generative AI study roadmap with substantive articles and original interview questions.','Generative AI','course')
for(const level of genai){
 const difficulty=level.level===1?'Beginner':level.level===4?'Advanced':'Intermediate'
 const data=await read(`frontend/src/learning/genai-generated/level-${level.level}.json`)
 add(`/interview/generative-ai/levels/${level.level}/`,level.title,'AI & Technology',difficulty,level.title,level.title,'level')
 for(const a of level.articleSlugs){const questions=data.questions.filter(q=>q.article===a.slug);add(`/interview/generative-ai/levels/${level.level}/articles/${a.slug}/`,a.title,'AI & Technology',difficulty,a.summary,{article:data.articles?.find(x=>x.slug===a.slug),questions},'article')}
 for(const d of level.days)add(`/interview/generative-ai/levels/${level.level}/days/${d.day}/`,d.title,'AI & Technology',difficulty,`Generative AI day ${d.day}: ${d.title}`,d,'day')
}
const serialized=JSON.stringify(rows.sort((a,b)=>a.url.localeCompare(b.url)))+'\n'
const destination=path.join(root,'backend/apps/accounts/interview_catalog.json')
if(process.argv.includes('--check')){if(await readFile(destination,'utf8')!==serialized)throw Error('Interview index is stale. Run npm run interview:sync.')}else {
 await mkdir(path.dirname(destination),{recursive:true})
 await writeFile(destination,serialized)
}
console.log(`Interview catalog: ${rows.length} existing/new resource URLs; full text stays on the server.`)

const summariesPath=path.join(root,"frontend/src/interview/summaries.json")
const summaries=JSON.stringify(rows.filter(r=>r.kind==="guide").map(({search,...r})=>r),null,2)+"\n"
if(process.argv.includes("--check")){if(JSON.stringify(JSON.parse(await readFile(summariesPath,"utf8")))!==JSON.stringify(JSON.parse(summaries)))throw Error("Interview summaries are stale.")}else await writeFile(summariesPath,summaries)

const seoPath=path.join(root,"frontend/src/seo/roadmap-summary.json")
const seo=Object.fromEntries(Object.entries(courses).map(([slug,row])=>[slug,{primary:row.primary,levels:row.levels.map(({level,title})=>({level,title}))}]))
if(process.argv.includes("--check")){if(JSON.stringify(JSON.parse(await readFile(seoPath,"utf8")))!==JSON.stringify(seo))throw Error("Roadmap SEO summary is stale")}else await writeFile(seoPath,JSON.stringify(seo)+"\n")
