import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'..'),dir=path.join(root,'src/learning/course-roadmaps'),dist=path.join(root,'dist')
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'))
const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8')
const redirects=fs.readFileSync(path.join(dist,'..','dist-nginx','lesson-days.map'),'utf8')
const assert=(ok,message)=>{if(!ok)throw new Error(message)}
const catalog=fs.readFileSync(path.join(root,'src/learning/catalog.ts'),'utf8')
const slugs=[...catalog.matchAll(/^  \['([^']+)',/gm)].map(m=>m[1]).filter(s=>s!=='generative-ai')
assert(slugs.length===Object.keys(manifest).length&&slugs.every(s=>manifest[s]),'Missing catalog course roadmap')
let pages=0,articles=0,questions=0
const allIds=new Set()
for(const course of Object.values(manifest)){
 const data=JSON.parse(fs.readFileSync(path.join(dir,course.slug+'.json'),'utf8'))
 assert(data.levels.length===4&&data.levels.flatMap(l=>l.days).length===30,'Incomplete roadmap: '+course.slug)
 const landing=fs.readFileSync(path.join(dist,'interview',course.slug,'index.html'),'utf8')
 // Public HTML links only levels that have a published lesson (signed-in learners also get the rest client-side).
 assert((landing.match(/class="genai-arrow"/g)??[]).length===course.levels.filter(l=>l.articleCount>0).length,'Roadmap arrows must match levels with lessons: '+course.slug)
 const daySet=new Set()
 for(const level of data.levels){
  const summary=course.levels.find(l=>l.level===level.level)
  assert(summary.articleCount===level.articles.length&&summary.questionCount===level.questions.length,'Misleading counts')
  assert(summary.progressIds.articles.length===level.articles.length,'Progress count mismatch')
  for(const kind of Object.keys(level.progressIds))for(const id of level.progressIds[kind]){
   const scoped=kind+':'+id
   assert(id.startsWith(course.slug+':')&&!allIds.has(scoped),'Duplicate or unscoped ID: '+id);allIds.add(scoped)
  }
  for(const day of level.days){assert(!daySet.has(day.day),'Duplicate day');daySet.add(day.day)}
  for(const article of level.articles){assert(article.lesson.definition.length>60&&article.lesson.interview.length>0,'Empty article');articles++}
  questions+=level.questions.length
  const base=`/interview/${course.slug}/levels/${level.level}/`
  // A day with a published lesson is not a page: nginx 301s it to the article (dist-nginx/lesson-days.map).
  for(const d of level.days.filter(d=>d.article)){
   assert(!fs.existsSync(path.join(dist,base.slice(1),`days/${d.day}/index.html`)),'Duplicate day still prerendered: '+base+`days/${d.day}/`)
   assert(redirects.includes(`${base}days/${d.day}/ ${base}articles/${d.article}/;`),'Missing day redirect: '+base+`days/${d.day}/`)
  }
  const routes=[{suffix:'',ready:level.articles.length>0},...level.articles.map(a=>({suffix:`articles/${a.slug}/`,ready:true})),...level.days.filter(d=>!d.article).map(d=>({suffix:`days/${d.day}/`,ready:false}))]
  for(const route of routes){
   const url=base+route.suffix,html=fs.readFileSync(path.join(dist,url.slice(1),'index.html'),'utf8')
   // Alias courses keep the robots status of their content and consolidate via rel=canonical; only primaries are in the sitemap.
   const shouldIndex=route.ready,inSitemap=course.primary===course.slug&&route.ready
   assert((html.match(/<h1[\s>]/g)??[]).length===1,'H1 mismatch: '+url)
   assert((html.match(/<main[\s>]/g)??[]).length===1,'Main landmark mismatch: '+url)
   assert(html.includes('class="breadcrumb"'),'Missing breadcrumbs: '+url)
   assert(sitemap.includes(`<loc>https://codinghubs.in${url}</loc>`)===inSitemap,'Sitemap gate mismatch: '+url)
   assert(!/<a [^>]*href="[^"]*\/days\/\d+\/"/.test(html),'Public HTML links a day page: '+url)
   assert(html.includes(`content="${shouldIndex?'index':'noindex'}, follow`),'Robots mismatch: '+url)
   if(route.suffix.startsWith('days/')&&!route.ready){
    assert(level.questions.every(q=>!html.includes(`id="${q.id}"`)),'Unrelated questions on an unpublished day: '+url)
    assert(html.includes('Self-guided study brief'),'Unlabeled incomplete day: '+url)
   }
   pages++
  }
 }
 assert(daySet.size===30&&Math.min(...daySet)===1&&Math.max(...daySet)===30,'Wrong day range')
}
console.log(`PASS: ${slugs.length} additional courses, ${pages} routes, ${articles} existing lesson articles and ${questions} source questions; accurate counts, isolated IDs and gated sitemap inclusion.`)
