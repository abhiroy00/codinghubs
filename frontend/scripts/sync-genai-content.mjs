import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
// The same rule that writes the robots tag (src/seo/robots.ts) rates every article.
const rules = ts.transpileModule(fs.readFileSync(path.join(root, 'frontend/src/seo/robots.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { lessonStatus, placeholderPhrases } = await import('data:text/javascript;base64,' + Buffer.from(rules).toString('base64'))
const wordCount = (...texts) => texts.join(' ').split(/\s+/).filter(Boolean).length
const articleStatus = unit => lessonStatus({
  words: wordCount(unit.concept, unit.mechanism, unit.boundary, unit.example, unit.application, unit.code, unit.expected, ...unit.angles.map(a => a.answer)),
  questions: unit.angles.filter(a => a.question?.trim() && a.answer?.trim()).length,
  placeholder: placeholderPhrases(JSON.stringify(unit)).length > 0,
})
const input = path.join(root, 'backend/apps/courses/roadmap_content')
const output = path.join(root, 'frontend/src/learning/genai-generated')
fs.mkdirSync(output, { recursive: true })
const registry = JSON.parse(fs.readFileSync(path.join(input, 'sources.json'), 'utf8'))
const categories = ['Basic conceptual', 'Intermediate technical', 'Advanced deep dive', 'Practical implementation', 'Python coding', 'Architecture and system design', 'Real-world scenario', 'Debugging and problem-solving', 'MNC interview-style', 'Project-based']
const titles = ['Generative AI Foundations', 'LLMs & Transformer Architecture', 'RAG, Fine-tuning & AI Agents', 'Production GenAI & MNC Interviews']
const ranges = [[1,7],[8,14],[15,22],[23,30]]
const manifest = []
const normalized = new Set()
function write(name, value) {
  const target = path.join(output, name)
  const body = JSON.stringify(value, null, 2) + '\n'
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n') !== body) throw new Error('Outdated generated content: '+name)
  } else fs.writeFileSync(target, body)
}
for (let n=1;n<=4;n++) {
  const units = JSON.parse(fs.readFileSync(path.join(input, `units-${n}.json`), 'utf8'))
  if (units.length !== 10) throw new Error('Expected ten authored topics')
  const questions = units.flatMap((unit, topic) => unit.angles.map((angle, category) => {
    const normalizedTitle = angle.question.toLowerCase().replace(/[^a-z0-9]/g,'')
    if (normalized.has(normalizedTitle)) throw new Error('Duplicate question: '+angle.question)
    normalized.add(normalizedTitle)
    const companies = [registry.companies[(topic*2)%16], registry.companies[(topic*2+1)%16]]
    return { id:`genai-l${n}-${String(topic*10+category+1).padStart(3,'0')}`, title:angle.question,
      category:categories[category], answer:[angle.answer, unit.mechanism, unit.boundary].join('\n\n'),
      conceptual_explanation:unit.concept, example:unit.example, application:unit.application,
      follow_ups:[unit.angles[(category+1)%10].question,unit.angles[(category+3)%10].question],
      difficulty:category===0?'Beginner':category===2||category===5?'Advanced':'Intermediate',
      tags:unit.tags, article:unit.slug, companies:companies.map(c=>c.name), provenance:'Research-based',
      sources:[...unit.sources,...companies.map(c=>c.source)], reviewed_at:registry.reviewed_at,
    }
  }))
  const articles=units.map(unit=>({ id:`genai-${unit.slug}`, ...unit, angles:undefined, status:articleStatus(unit) }))
  const [start,end]=ranges[n-1]
  let cursor=0
  const days=Array.from({length:end-start+1},(_,i)=>{
    const count=i<10-(end-start+1)?2:1
    const readings=articles.slice(cursor,cursor+count); cursor+=count
    return {day:start+i,id:`genai-day-${String(start+i).padStart(2,'0')}`,title:readings.map(a=>a.title).join(' + '),
      articles:readings.map(a=>a.slug), objectives:readings.map(a=>'Explain and implement '+a.title.toLowerCase()),
      assignment:`Build a small, reproducible demonstration of ${readings.map(a=>a.title.toLowerCase()).join(' and ')}. Include one normal case, one boundary case, and one failure case. Record expected and observed outputs, explain the tradeoffs, and cite the documentation used.`,
      deliverables:['Runnable Python file or notebook with no embedded credentials','README explaining assumptions, inputs, outputs, and limitations','Three test cases including a failure case','Two-minute interview explanation of your own design decisions'],
      revision:['Explain the concept without reading the answer','Run the example and predict its output','Complete the linked coding exercise before opening its solution','Answer a conceptual, debugging, and architecture question','Record one limitation and one real-world use case'],
    }
  })
  const data={level:n,title:titles[n-1],start,end,categories,articles,questions,days,...registry}
  const summary={level:n,title:titles[n-1],start,end,articleCount:articles.length,questionCount:questions.length,
    articleSlugs:articles.map(a=>({slug:a.slug,title:a.title,id:a.id,summary:a.concept,status:a.status,sources:a.sources.map(id=>registry.sources[id].url)})),
    // Each day is served by its first article (days/<n>/ 301s there); the article page carries the day's assignment.
    days:days.map(d=>({day:d.day,title:d.title,id:d.id,article:d.articles[0]})),
    progressIds:{articles:articles.map(a=>a.id),questions:questions.map(q=>q.id),coding:articles.map(a=>a.id),assignments:days.map(d=>d.id)}}
  manifest.push(summary)
  write(`level-${n}.json`, data)
}
write('manifest.json',manifest)
const backendManifest=path.join(input,'manifest.json')
const manifestBody=JSON.stringify(manifest,null,2)+'\n'
if(process.argv.includes('--check')) { if(fs.readFileSync(backendManifest,'utf8')!==manifestBody) throw new Error('Backend manifest stale') }
else fs.writeFileSync(backendManifest,manifestBody)
console.log('GenAI content: 4 levels, 40 articles, 400 unique questions, 30 days; '+(process.argv.includes('--check')?'synchronized':'generated'))
