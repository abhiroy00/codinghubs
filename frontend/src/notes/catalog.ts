import catalog from './catalog.json'
import { LOGO_URL, organizationNode, type PageMeta } from '../seo/site'

export const NOTE_SUBJECTS = catalog
export type NoteSubject = (typeof NOTE_SUBJECTS)[number]
export type NoteTopic = NoteSubject['topics'][number]
export type NoteArticle = NoteTopic & { subject: string; html: string; wordCount: number }
export const NOTE_COUNT = NOTE_SUBJECTS.reduce((count, subject) => count + subject.topics.length, 0)

export function notesMeta(subject?: NoteSubject): PageMeta {
  return {
    path: subject ? `/notes/${subject.slug}/` : '/notes/',
    title: subject ? `${subject.title} Notes & Tutorials | Coding Hubs` : 'Free Programming & AI Notes Library | Coding Hubs',
    description: subject
      ? `Read ${subject.topics.length} free ${subject.title} notes from Coding Hubs. Search topics and explore practical explanations and code examples in your subject notebook.`
      : `Explore ${NOTE_COUNT.toLocaleString('en-IN')} free notes across Python, SQL, AI, HTML and more. Open a subject notebook, find a topic and keep learning with Coding Hubs.`,
    image: LOGO_URL,
    indexable: true,
    jsonLd: { '@context': 'https://schema.org', '@graph': [organizationNode()] },
  }
}
