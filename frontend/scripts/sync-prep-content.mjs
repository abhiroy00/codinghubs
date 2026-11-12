// Public excerpts are derived from the same checked-in lessons seeded into Django.
// Export selected public excerpts and the opening lesson, not the whole 600-lesson corpus.
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
const root = path.resolve(import.meta.dirname, '../..')
const source = path.join(root, 'backend/apps/courses/prep_content')
const target = path.join(root, 'frontend/src/learning/prep-generated')
const check = process.argv.includes('--check')
const selected = new Set([1, 6, 12, 18, 24, 30])
// Keep the export gate in sync with the backend's existing placeholder detector.
const schema = await readFile(path.join(root, 'backend/apps/courses/prep_schema.py'), 'utf8')
const markerLine = schema.match(/PLACEHOLDER_MARKERS = \(([^\n]+)\)/)?.[1]
if (!markerLine) throw new Error('Cannot read the source placeholder policy')
const markers = [...markerLine.matchAll(/'([^']+)'/g)].map(m => m[1])
const placeholder = lesson => {
  const text = [lesson.title, lesson.definition, ...lesson.interview.map(i => i.answer), ...lesson.quiz.flatMap(q => q.options)].join(' ')
  return markers.some(marker => text.includes(marker))
}
const manifest = {}
const rows = await readFile(path.join(root, 'frontend/src/learning/catalog.ts'), 'utf8')
const slugs = new Set([...rows.matchAll(/^  \['([^']+)',/gm)].map(m => m[1]))
async function output(name, value) {
  const content = JSON.stringify(value, null, 2) + '\n'
  const file = path.join(target, name)
  if (check) {
    if ((await readFile(file, 'utf8').catch(() => '')).replace(/\r\n/g, '\n') !== content) throw new Error('Stale generated prep content: ' + name)
  } else { await mkdir(target, { recursive: true }); await writeFile(file, content) }
}
for (const dir of (await readdir(source, { withFileTypes: true })).filter(d => d.isDirectory()).sort((a,b) => a.name.localeCompare(b.name))) {
  const base = path.join(source, dir.name)
  const metaText = await readFile(path.join(base, '_meta.json'), 'utf8').catch(() => null)
  if (!metaText) continue
  const meta = JSON.parse(metaText)
  if (!meta.courses?.length || meta.courses.some(s => !slugs.has(s))) throw new Error('Unknown catalog course in ' + dir.name)
  const lessons = []
  const hash = createHash('sha256').update(metaText.replace(/\r\n/g, '\n'))
  for (let day=1; day<=30; day++) {
    const text = await readFile(path.join(base, 'day-' + String(day).padStart(2, '0') + '.json'), 'utf8')
    hash.update(text.replace(/\r\n/g, '\n'))
    const lesson = JSON.parse(text)
    if (lesson.day !== day || !lesson.definition || !lesson.interview?.length || !lesson.practice?.statement || !lesson.objectives?.length) throw new Error('Incomplete source: ' + dir.name + ' day ' + day)
    lessons.push(lesson)
  }
  const available = lessons.filter(l => !placeholder(l))
  if (!available.length || available[0].day !== 1) throw new Error('No substantive opening lesson: ' + dir.name)
  const complete = available.length === 30
  const samples = complete ? available.filter(l => selected.has(l.day)) : available.filter((_, i) => i < 6)
  const guide = {
    curriculum: meta.curriculum,
    summary: complete ? meta.summary : 'Available lessons cover ' + available.map(l => l.title).join('; ') + '.',
    complete,
    missingDays: lessons.filter(placeholder).map(l => l.day),
    roadmap: available.map(({ day, title, module, level }) => ({ day, title, module, level })),
    samples: samples.map(l => ({
      day:l.day, title:l.title, level:l.level, definition:l.definition, objectives:l.objectives,
      interview:l.interview, example:l.example,
      practice:{ title:l.practice.title, statement:l.practice.statement, objective:l.practice.objective },
      takeaways:l.takeaways,
    })),
    firstLesson: available[0],
  }
  await output(meta.curriculum + '.json', guide)
  for (const slug of meta.courses) {
    if (manifest[slug]) throw new Error('Duplicate source mapping for ' + slug)
    manifest[slug] = { curriculum:meta.curriculum, primary:meta.courses[0], availableDays:available.length, complete, sourceHash:hash.copy().digest('hex') }
  }
}
await output('manifest.json', manifest)
console.log((check ? 'Verified' : 'Generated') + ' source excerpts for ' + Object.keys(manifest).length + ' course routes; ' + new Set(Object.values(manifest).map(m => m.curriculum)).size + ' curricula.')
