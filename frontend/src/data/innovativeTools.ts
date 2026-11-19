/**
 * Innovative AI Tools (https://tools.innovativeais.com), our free online toolkit, shown on the homepage and /ai-tools.
 * Counts and links mirror the site's category list (checked 19 Nov 2026). Update them here when the toolkit grows.
 */
export const TOOLS_SITE = 'https://tools.innovativeais.com'

export type ToolIcon = 'pdf' | 'image' | 'seo' | 'code' | 'text' | 'calc' | 'spark' | 'video' | 'convert' | 'board' | 'social' | 'invoice'

export interface ToolCategory {
  name: string
  count: number
  href: string
  icon: ToolIcon
  /** Brand colour for the icon tile. */
  color: string
  /** The tool the site features for this category. */
  featured: { name: string; href: string }
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  { name: 'Image Tools', count: 63, href: '/categories/image-tools/', icon: 'image', color: '#7c3aed', featured: { name: 'Compress Image', href: '/tools/image-compressor/' } },
  { name: 'SEO & AEO', count: 29, href: '/categories/seo-tools/', icon: 'seo', color: '#059669', featured: { name: 'SEO & AEO Audit', href: '/tools/site-seo-aeo-audit/' } },
  { name: 'PDF & Documents', count: 24, href: '/categories/pdf-tools/', icon: 'pdf', color: '#dc2626', featured: { name: 'PDF Merger', href: '/tools/pdf-merger/' } },
  { name: 'Video & Audio', count: 12, href: '/categories/video-audio-tools/', icon: 'video', color: '#db2777', featured: { name: 'Video Editor', href: '/tools/video-editor/' } },
  { name: 'AI Productivity', count: 10, href: '/categories/ai-tools/', icon: 'spark', color: '#9333ea', featured: { name: 'Prompt Brief Builder', href: '/tools/prompt-brief-builder/' } },
  { name: 'Calculators', count: 10, href: '/categories/calculators/', icon: 'calc', color: '#0891b2', featured: { name: 'Percentage Calculator', href: '/tools/percentage-calculator/' } },
  { name: 'Business & Finance', count: 10, href: '/categories/business-tools/', icon: 'invoice', color: '#b45309', featured: { name: 'Invoice Maker', href: '/tools/invoice-maker/' } },
  { name: 'Social Media', count: 10, href: '/categories/social-media-tools/', icon: 'social', color: '#2563eb', featured: { name: 'Campaign URL Builder', href: '/tools/campaign-url-builder/' } },
  { name: 'Developer Tools', count: 5, href: '/categories/developer-tools/', icon: 'code', color: '#1d4ed8', featured: { name: 'JSON Formatter', href: '/tools/json-formatter/' } },
  { name: 'File & Data', count: 5, href: '/categories/converters/', icon: 'convert', color: '#16a34a', featured: { name: 'CSV to JSON', href: '/tools/csv-to-json/' } },
  { name: 'Text Tools', count: 3, href: '/categories/text-tools/', icon: 'text', color: '#ea580c', featured: { name: 'Word Counter', href: '/tools/word-counter/' } },
  { name: 'Everyday Utilities', count: 3, href: '/categories/utilities/', icon: 'board', color: '#475569', featured: { name: 'Online Whiteboard', href: '/tools/whiteboard/' } },
]

export const TOOLS_TOTAL = TOOL_CATEGORIES.reduce((sum, c) => sum + c.count, 0)
export const toolUrl = (path: string) => `${TOOLS_SITE}${path}`
