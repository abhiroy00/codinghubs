export const parts = ['concept', 'practice', 'industry', 'assessment'] as const
export type Part = typeof parts[number]
export const labels: Record<Part, string> = { concept: 'Deep concept learning', practice: 'Practical examples & code', industry: 'Industry implementation', assessment: 'Assessments & tasks' }
export interface Module { number: number; title: string; slug: string; objectives: string[]; chapters: { title: string; concepts: { slug: string; title: string; available: boolean; status: string; difficulty: string }[] }[] }
export interface Question { question: string; answer: string }
export interface Block { type: 'text' | 'code' | 'diagram'; title?: string; body: string; expected_output?: string }
export interface LessonPart { blocks: Block[]; quiz?: { question: string; options: string[] }[]; beginner?: Question[]; technical?: Question[]; scenarios?: Question[]; advanced?: Question[]; design?: Question[]; interview?: Question[]; tasks?: Question[]; assignment?: Record<string, string>; self_assessment?: string[] }
export interface Lesson { slug: string; title: string; module: string; version: number; preview: boolean; minutes: number; difficulty: string; outcomes: string[]; prerequisites: string[]; references: { title: string; url: string }[]; content: Record<Part, LessonPart>; seo_description: string }
export interface Progress { slug: string; version: number; parts: Part[]; bookmark: boolean; notes: string; best_score: number; completed: boolean; assignment_score: number | null; assignment_passed: boolean; mastered: boolean }
