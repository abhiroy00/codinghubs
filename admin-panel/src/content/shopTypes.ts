import type { Common } from './types'
import { blankBlog } from './types'

export interface ProjectForm extends Common {
  summary: string
  overview: string
  category: string
  difficulty: string
  technologies: string[]
  languages: string[]
  tools: string[]
  problem_statement: string
  objectives: string
  features: { title: string; description: string }[]
  system_requirements: string
  prerequisites: string
  learning_outcomes: string[]
  architecture: string
  database_requirements: string
  setup_overview: string
  screenshots: { src: string; alt: string; caption: string }[]
  demo_url: string
  repo_url: string
  repo_public: boolean
  estimated_time: string
  product: number | ''
  related_project_ids: number[]
  related_blog_ids: number[]
  related_course_ids: number[]
}

export interface GuideSection {
  key: string
  title: string
  html: string
  enabled: boolean
  preview: boolean
}
export interface GuideForm extends Common {
  summary: string
  project: number | ''
  category: string
  difficulty: string
  technologies: string[]
  estimated_time: string
  prerequisites: string
  objectives: string[]
  required_software: string[]
  sections: GuideSection[]
  faq: { q: string; a: string }[]
  related_resources: { label: string; url: string }[]
  access_type: string
  product: number | ''
  related_project_ids: number[]
  related_blog_ids: number[]
  included_course_ids: number[]
}

export interface ProductForm extends Common {
  product_type: string
  item_kind: string
  sku: string
  category: number | ''
  short_description: string
  description: string
  included_materials: string[]
  author: string
  publisher: string
  isbn: string
  language: string
  edition: string
  publication_year: number | ''
  pages: number | ''
  format: string
  topics: string[]
  original_price: string
  price: string
  currency: string
  tax_rate: string
  track_stock: boolean
  stock_quantity: number
  low_stock_threshold: number
  weight_grams: number | ''
  dimensions: string
  download_limit: number | ''
  images: { src: string; alt: string }[]
}

const { excerpt: _e, content: _c, category: _cat, tag_names: _t, search_intent: _s, faq: _f, ...common } = blankBlog
void [_e, _c, _cat, _t, _s, _f]

export const blankProject: ProjectForm = {
  ...common, summary: '', overview: '', category: '', difficulty: 'beginner', technologies: [], languages: [], tools: [], problem_statement: '', objectives: '',
  features: [], system_requirements: '', prerequisites: '', learning_outcomes: [], architecture: '', database_requirements: '', setup_overview: '', screenshots: [],
  demo_url: '', repo_url: '', repo_public: false, estimated_time: '', product: '', related_project_ids: [], related_blog_ids: [], related_course_ids: [],
}

export const GUIDE_SECTIONS: [string, string][] = [
  ['introduction', 'Introduction'], ['overview', 'Project overview'], ['prerequisites', 'Prerequisites'], ['tools', 'Tools and technologies'],
  ['setup', 'Environment setup'], ['implementation', 'Step-by-step implementation'], ['code', 'Code explanation'], ['database', 'Database design'],
  ['api', 'API development'], ['frontend', 'Frontend development'], ['testing', 'Testing'], ['deployment', 'Deployment'], ['errors', 'Common errors'],
  ['result', 'Final result'], ['improvements', 'Further improvements'],
]
export const blankGuide: GuideForm = {
  ...common, summary: '', project: '', category: '', difficulty: 'beginner', technologies: [], estimated_time: '', prerequisites: '', objectives: [], required_software: [],
  sections: GUIDE_SECTIONS.map(([key, title]) => ({ key, title, html: '', enabled: false, preview: false })), faq: [], related_resources: [], access_type: 'free',
  product: '', related_project_ids: [], related_blog_ids: [], included_course_ids: [],
}

export const blankProduct: ProductForm = {
  ...common, product_type: 'digital', item_kind: 'pdf_notes', sku: '', category: '', short_description: '', description: '', included_materials: [], author: '', publisher: '',
  isbn: '', language: '', edition: '', publication_year: '', pages: '', format: '', topics: [], original_price: '', price: '0', currency: 'INR', tax_rate: '', track_stock: true,
  stock_quantity: 0, low_stock_threshold: 5, weight_grams: '', dimensions: '', download_limit: '', images: [],
}
