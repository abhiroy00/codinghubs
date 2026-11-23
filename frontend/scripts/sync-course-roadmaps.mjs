// Export substantive existing lessons and explicit study plans; never publish placeholders as lessons.
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
const root=path.resolve(import.meta.dirname,'../..')
const learning=path.join(root,'frontend/src/learning')
const source=path.join(root,'backend/apps/courses/prep_content')
const output=path.join(learning,'course-roadmaps')
const catalogText=fs.readFileSync(path.join(learning,'catalog.ts'),'utf8')
const js=ts.transpileModule(catalogText,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {COURSE_CATALOG}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const loadTs=file=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'))
// The same rule that writes the robots tag (src/seo/robots.ts) decides which lessons are COMPLETE.
const {lessonStatus,placeholderPhrases}=await loadTs(path.join(root,'frontend/src/seo/robots.ts'))
const textWords=o=>typeof o==='string'?o.split(/\s+/).filter(Boolean).length:Array.isArray(o)?o.reduce((n,v)=>n+textWords(v),0):o&&typeof o==='object'?Object.values(o).reduce((n,v)=>n+textWords(v),0):0
/** Teaching words (explanation, example, Q&A, practice) and answered questions in a source lesson. */
const evidence=lesson=>({words:['definition','theory','example','use_cases','demonstration','takeaways','interview','practice'].reduce((n,k)=>n+textWords(lesson[k]),0),
 questions:lesson.interview.filter(q=>q.question?.trim()&&q.answer?.trim()).length,placeholder:placeholderPhrases(JSON.stringify(lesson)).length>0})
const sources=JSON.parse(fs.readFileSync(path.join(learning,'prep-generated/manifest.json'),'utf8'))
const schema=fs.readFileSync(path.join(root,'backend/apps/courses/prep_schema.py'),'utf8')
const markers=[...schema.match(/PLACEHOLDER_MARKERS = \(([^\n]+)\)/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1])
const ranges=[[1,7],[8,14],[15,22],[23,30]]
const titles=['Foundations','Applied skills and workflows','Architecture, quality and troubleshooting','Projects, delivery and interview practice']
const trackTitles={
 ai:['AI foundations','Models, prompts and workflows','Retrieval, evaluation and application design','Production projects and interview practice'],
 development:['Programming and application foundations','Data, APIs and application workflows','Quality, security and architecture','Delivery, portfolio and interview practice'],
 data:['Data and analytical foundations','Cleaning, statistics and analysis','Models, dashboards and reliable workflows','Projects, communication and interview practice'],
 cloud:['Cloud foundations and identity','Networking, compute and architecture','Reliability, security and operations','Delivery, architecture review and interviews'],
 security:['Security foundations and risk','Threat analysis and defensive workflows','Controls, response and assurance','Security projects and interview practice'],
 design:['People, problems and design foundations','Research and interaction design','Prototyping, accessibility and validation','Handoff, case studies and interview practice'],
 marketing:['Audience, intent and measurement','Search, content and campaign planning','Attribution, optimization and privacy','Campaign portfolio and interview practice'],
 program:['Goals, scope and professional foundations','Research, planning and delivery','Collaboration, quality and review','Portfolio, presentation and interview practice'],
}
const manifest={}
function write(file,value){
 const text=JSON.stringify(value,null,2)+'\n'
 if(process.argv.includes('--check')){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==text)throw new Error('Outdated roadmap: '+file)}
 else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text)}
}
for(const course of COURSE_CATALOG.filter(c=>c.slug!=='generative-ai')){
 const mapping=sources[course.slug]
 const content=mapping?path.join(source,mapping.curriculum):null
 const lessons=[]
 for(let day=1;day<=30;day++){
  const file=content&&path.join(content,`day-${String(day).padStart(2,'0')}.json`)
  if(!file||!fs.existsSync(file))continue
  const lesson=JSON.parse(fs.readFileSync(file,'utf8'))
  const text=[lesson.title,lesson.definition,...lesson.interview.map(q=>q.answer),...lesson.quiz.flatMap(q=>q.options)].join(' ')
  // Only COMPLETE lessons are published as articles; everything else stays a study brief.
  if(!markers.some(m=>text.includes(m))&&lessonStatus(evidence(lesson))==='COMPLETE')lessons.push(lesson)
 }
 const levels=ranges.map(([start,end],index)=>{
  const articles=lessons.filter(l=>l.day>=start&&l.day<=end).map(lesson=>({id:`${course.slug}:article:${lesson.day}`,slug:`day-${lesson.day}`,lesson}))
  const questions=articles.flatMap(a=>a.lesson.interview.map((q,i)=>({id:`${course.slug}:question:${a.lesson.day}:${i+1}`,day:a.lesson.day,topic:a.lesson.title,difficulty:a.lesson.level,category:a.lesson.practice.kind==='coding'&&/code|implement|function|algorithm|output|program|complexity/i.test(q.question)?'Coding and implementation':'Concepts and technical discussion',...q,provenance:'Original curriculum practice'})))
  const days=Array.from({length:end-start+1},(_,i)=>{
   const day=start+i
   const lesson=lessons.find(l=>l.day===day)
   const topic=course.days[day-1]
   // A day with a published lesson is served by its article URL; days/<n>/ redirects there.
   return {day,id:`${course.slug}:assignment:${day}`,title:lesson?.title??topic.title,available:!!lesson,...(lesson?{article:`day-${day}`}:{}),
    focus:lesson?.definition??topic.focus,
    objectives:lesson?.objectives??[`Explain ${topic.title.toLowerCase()} in the context of ${course.focus}`,`Create a reviewable example using the relevant ${course.tools.slice(0,3).join(', ')} tools`],
    assignment:lesson?.practice.statement??`Create a small ${course.focus} case study focused on ${topic.title.toLowerCase()}. State the input, expected outcome and assumptions. Document one normal case, one boundary case and one failure case. Capture your observations, compare one alternative and explain what you would change next.`,
    steps:lesson?.practice.kind==='exercise'?lesson.practice.steps:lesson?['Read the concept and work through the example','Implement the practice task without opening the solution','Run the provided cases and add an edge case','Explain your result and complete the revision checklist']:[`Define a concrete ${topic.title.toLowerCase()} problem and its acceptance criteria`,`Select a suitable tool from ${course.tools.join(', ')} and record why it fits`,'Build the smallest reproducible example; use synthetic data and a local sandbox','Compare expected and observed behavior on your three cases','Save the artifact and explain limitations; this study brief has no verified reference solution'],
    revision:lesson?.takeaways??['State the problem and assumptions clearly','Show evidence for the expected behavior','Explain one tradeoff and one failure case','Cite the documentation you actually used','Distinguish what you built from what remains untested'],
   }
  })
  return {level:index+1,title:(trackTitles[course.track]??titles)[index],start,end,articles,questions,days,
   progressIds:{articles:articles.map(a=>a.id),questions:questions.map(q=>q.id),coding:articles.filter(a=>a.lesson.practice.kind==='coding').map(a=>`${course.slug}:coding:${a.lesson.day}`),assignments:days.map(d=>d.id)}}
 })
 const data={slug:course.slug,name:course.name,focus:course.focus,track:course.track,tools:course.tools,projects:course.projects,hasCoding:course.hasCoding,primary:mapping?.primary??course.slug,levels}
 manifest[course.slug]={slug:course.slug,name:course.name,primary:data.primary,availableLessons:lessons.length,levels:levels.map(l=>({level:l.level,title:l.title,start:l.start,end:l.end,articleCount:l.articles.length,questionCount:l.questions.length,
  articles:l.articles.map(a=>({slug:a.slug,id:a.id,title:a.lesson.title,description:a.lesson.definition})),days:l.days.map(d=>({day:d.day,id:d.id,title:d.title,available:d.available,...(d.article?{article:d.article}:{})})),progressIds:l.progressIds}))}
 write(path.join(output,`${course.slug}.json`),data)
}
write(path.join(output,'manifest.json'),manifest)
write(path.join(root,'backend/apps/courses/roadmap_content/course-manifest.json'),manifest)
console.log(`${Object.keys(manifest).length} course roadmaps: 4 levels and 30 study days each; only substantive lessons counted as articles.`)
