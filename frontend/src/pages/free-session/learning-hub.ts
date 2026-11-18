/**
 * Homepage learning content. Every entry is copied from an existing, published source so the
 * homepage stays small (no roadmap/catalogue JSON in the home bundle) while remaining truthful.
 * `learning-hub.test.ts` fails the build's test step if a value drifts from its source.
 *
 * Editing: change the source lesson/roadmap/catalogue first, then mirror the change here.
 */
import { COURSES } from './data'

/** Source: src/learning/genai-generated/manifest.json (Generative AI interview roadmap). */
export const HOME_ROADMAP = {
  title: 'Generative AI in 30 days',
  href: '/interview/generative-ai/',
  levels: [
    { level: 1, title: 'Generative AI Foundations', start: 1, end: 7, articles: 10 },
    { level: 2, title: 'LLMs & Transformer Architecture', start: 8, end: 14, articles: 10 },
    { level: 3, title: 'RAG, Fine-tuning & AI Agents', start: 15, end: 22, articles: 10 },
    { level: 4, title: 'Production GenAI & MNC Interviews', start: 23, end: 30, articles: 10 },
  ],
} as const

export const roadmapLevelHref = (level: number) => `/interview/generative-ai/levels/${level}/`

/** Source: genai-generated/level-1.json, article `nlp-tokenization` (code, expected output and concept). */
export const HOME_CHALLENGE = {
  topic: 'AI · Tokens and text encoding',
  question: 'What does this Python program print?',
  code: "def sizes(text):return len(text),len(text.encode('utf-8'))\nassert sizes('')==(0,0)\nassert sizes('AI')==(2,2)\nprint(sizes('café'))",
  options: ['(4, 4)', '(4, 5)', '(5, 5)'],
  answer: '(4, 5)',
  explanation:
    "len() counts characters, so 'café' has 4. Encoded as UTF-8, 'é' needs two bytes, so the byte length is 5. Tokenizers are different again: a token is not necessarily a word, character or fixed byte count, so count an LLM prompt with the model's own tokenizer.",
  lesson: { title: 'NLP, tokens and tokenization', href: '/interview/generative-ai/levels/1/articles/nlp-tokenization/' },
} as const

/** Source: src/learning/catalog.ts, PROJECT_OVERRIDES['data-analytics-using-python'][0]. */
export const HOME_PROJECT = {
  name: 'Python data exploration',
  course: { name: 'Data Analytics Using Python', href: '/courses/data-analytics-using-python/' },
  description: 'Clean and explore a dataset with pandas and reproducible notebooks.',
  steps: ['Inspect schema and duplicates.', 'Clean values using documented rules.', 'Explore distributions and segments.', 'Summarize evidence and caveats.'],
  outcome: 'A reproducible analysis notebook.',
  skills: ['Python', 'pandas', 'visualization'],
} as const

/** Course detail slugs for the existing homepage course list (`COURSES` in data.ts). */
const COURSE_SLUGS: Record<string, string> = {
  'Cyber Security + Gen AI': 'cyber-security-gen-ai',
  'Java Full Stack Developer + Gen AI': 'java-full-stack-developer-gen-ai',
  'Advanced Digital Marketing': 'advanced-digital-marketing',
  'Data Analytics Using Python': 'data-analytics-using-python',
  'Python Training Course': 'python-training-course',
  'UI/UX Designing': 'ui-ux-designing',
  'Data Science Pro': 'data-science-pro',
  'Agentic AI': 'agentic-ai',
  'AI Engineering': 'ai-engineering',
  'Vibe Coding': 'vibe-coding',
  'MERN Stack + Gen AI': 'mern-stack-gen-ai',
  'Generative AI': 'generative-ai',
  'Vibe Coding with AI': 'vibe-coding-with-ai',
}

export const HOME_COURSES = COURSES.map((course) => ({ ...course, slug: COURSE_SLUGS[course.title] }))
export const HOME_COURSE_SLUGS = COURSE_SLUGS
