import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const dir=path.join(root,'frontend/src/learning/genai-generated')
const localPython=path.join(root,process.platform==='win32'?'backend/.venv/Scripts/python.exe':'backend/.venv/bin/python')
const python=process.env.PYTHON||(fs.existsSync(localPython)?localPython:process.platform==='win32'?'python':'python3')
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'))
const ids=new Set(),titles=new Set(),days=[]
const assert=(ok,message)=>{if(!ok)throw new Error(message)}
let count=0
for(const level of manifest){
 const data=JSON.parse(fs.readFileSync(path.join(dir,`level-${level.level}.json`),'utf8'))
 assert(data.questions.length>=100,'Insufficient questions')
 assert(data.questions.length===level.questionCount&&data.articles.length===level.articleCount,'Misleading counts')
 assert(data.categories.length===10&&new Set(data.questions.map(q=>q.category)).size===10,'Missing categories')
 assert(new Set(data.questions.flatMap(q=>q.companies)).size===16,'Missing company coverage')
 for(const q of data.questions){
  assert(!ids.has(q.id),'Duplicate identifier');ids.add(q.id)
  const normalized=q.title.toLowerCase().replace(/[^a-z0-9]/g,'')
  assert(!titles.has(normalized),'Duplicate question');titles.add(normalized)
  assert(q.answer.split(/\s+/).length>=60,`Short answer: ${q.id}`)
  for(const field of ['conceptual_explanation','example','application'])assert(q[field].length>30,`Missing ${field}`)
  assert(q.follow_ups.length>=2&&q.tags.length>0&&q.sources.length>=2,'Missing question metadata')
  assert(q.provenance==='Research-based','Unexpected company claim')
  for(const source of q.sources)assert(data.sources[source]?.url.startsWith('https://')&&data.sources[source].checked_at,'Invalid source')
  count++
 }
 for(const article of data.articles){
  assert(data.questions.filter(q=>q.article===article.slug).length===10,'Article linkage broken')
  const run=spawnSync(python,['-I','-c',article.code],{encoding:'utf8',timeout:5000})
  assert(!run.error,`Python execution failed: ${run.error?.message}`)
  assert(run.status===0&&run.stdout.trim()===article.expected,`Python output mismatch: ${article.slug}: ${run.stdout} ${run.stderr}; expected ${article.expected}`)
 }
 for(const day of data.days){
  days.push(day.day)
  assert(day.articles.every(slug=>data.articles.some(a=>a.slug===slug)),'Broken daily reading')
  assert(day.assignment.length>100&&day.revision.length>=5&&day.deliverables.length>=4,'Thin daily plan')
 }
}
assert(days.length===30&&new Set(days).size===30&&days.every((d,i)=>d===i+1),'Daily coverage broken')
console.log(`PASS: ${count} unique questions, 40 executable Python examples, 30 daily plans, 16 company lenses per level.`)
