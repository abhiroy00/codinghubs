export const PARTS = ['concept', 'practice', 'industry', 'assessment'] as const
export type Part = typeof PARTS[number]
export const PART_LABELS = ['Deep concept learning', 'Practical examples and code', 'Industry implementation', 'Assessments and tasks']
export interface Block { type: 'text' | 'code' | 'diagram'; title?: string; body: string; expected_output?: string }
export interface Question { question: string; answer: string }
export interface Quiz { question: string; options: string[]; answer: number; explanation: string }
export const CATEGORIES = ['beginner', 'technical', 'scenarios', 'advanced', 'design', 'interview', 'tasks'] as const
export const ASSIGNMENT_FIELDS = ['problem', 'requirements', 'input_output', 'constraints', 'acceptance_criteria', 'rubric', 'hints', 'bonus'] as const
export interface ContentPart { blocks: Block[]; quiz?: Quiz[]; beginner?: Question[]; technical?: Question[]; scenarios?: Question[]; advanced?: Question[]; design?: Question[]; interview?: Question[]; tasks?: Question[]; assignment?: Record<string, string>; self_assessment?: string[] }
export interface Quality { words: Record<Part, number>; minimum_words: Record<Part, number>; issues: string[]; ready_for_review: boolean; code_verified: boolean; reviewed: boolean }
export interface Lesson { public_url: string; id: number; title: string; slug: string; difficulty: string; seo_description: string; outcomes: string[]; references: { title: string; url: string }[]; prerequisites: number[]; content: Record<Part, ContentPart>; status: string; edit_version: number; published_version: number; quality: Quality; can_edit: boolean; can_publish: boolean; updated_at: string }
export interface Row { id: number; title: string; slug: string; module: string; status: string; published_version: number; edit_version: number }
export interface Metadata { modules: { id: number; title: string; number: number }[]; concepts: { id: number; title: string; slug: string }[] }
export interface HistoryRow { id: number; edit_version: number; reason: string; editor: string; created_at: string }
