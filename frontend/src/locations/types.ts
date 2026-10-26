export type LocationGroup = 'delhi' | 'noida' | 'gurugram' | 'faridabad' | 'other'

export interface LocationMeta {
  slug: string
  /** Name as used in headings, e.g. "Laxmi Nagar, Delhi". */
  label: string
  /** Short name for menus and cards, e.g. "Laxmi Nagar". */
  short: string
  group: LocationGroup
  /** One-line audience angle shown on the index cards. */
  blurb: string
  /** Slugs of other locations to link to as "related". */
  related: string[]
}

export interface ContentSection {
  id: string
  heading: string
  paragraphs: string[]
  subsections?: { heading: string; paragraphs: string[] }[]
}

export interface Faq {
  q: string
  a: string
}

export interface LocationContent {
  slug: string
  metaTitle: string
  metaDescription: string
  h1: string
  /** Hero lead paragraphs (section A). */
  hero: string[]
  sections: ContentSection[]
  faqs: Faq[]
  conclusion: string[]
}
