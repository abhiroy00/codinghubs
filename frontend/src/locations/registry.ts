import type { LocationGroup, LocationMeta } from './types'

export const SITE_URL = 'https://codinghubs.in'

export const GROUP_LABELS: Record<LocationGroup, string> = {
  delhi: 'Delhi',
  noida: 'Noida',
  gurugram: 'Gurugram',
  faridabad: 'Faridabad',
  other: 'Other NCR & nearby',
}

export const GROUP_ORDER: LocationGroup[] = ['delhi', 'noida', 'gurugram', 'faridabad', 'other']

export const HEAD_OFFICE = {
  line: '904, 9th Floor, Pearls Best Heights-I, Netaji Subhash Place, Delhi – 110034',
  street: '904, 9th Floor, Pearls Best Heights-I, Netaji Subhash Place',
  locality: 'Delhi',
  postalCode: '110034',
  country: 'IN',
}

export const LOCATIONS: LocationMeta[] = [
  { slug: 'ai-course-in-south-extension-delhi', label: 'South Extension, Delhi', short: 'South Extension', group: 'delhi', blurb: 'For students and professionals in South Delhi comparing AI learning options.', related: ['ai-course-in-lajpat-nagar-delhi', 'ai-course-in-connaught-place-delhi', 'ai-course-in-nsp-delhi'] },
  { slug: 'ai-course-in-pitampura-delhi', label: 'Pitampura, Delhi', short: 'Pitampura', group: 'delhi', blurb: 'For North-West Delhi learners, close to the Netaji Subhash Place head office.', related: ['ai-course-in-nsp-delhi', 'ai-course-in-tagore-garden-delhi', 'ai-course-in-patel-nagar-delhi'] },
  { slug: 'ai-course-in-rohini-delhi', label: 'Rohini, Delhi', short: 'Rohini', group: 'delhi', blurb: 'For Rohini students and professionals planning AI learning around a busy routine.', related: ['ai-course-in-pitampura-delhi', 'ai-course-in-nsp-delhi', 'ai-course-in-tagore-garden-delhi'] },
  { slug: 'ai-course-in-tagore-garden-delhi', label: 'Tagore Garden, Delhi', short: 'Tagore Garden', group: 'delhi', blurb: 'For West Delhi students and early-career professionals starting with AI.', related: ['ai-course-in-patel-nagar-delhi', 'ai-course-in-uttam-nagar-delhi', 'ai-course-in-aya-nagar-delhi'] },
  { slug: 'ai-course-in-connaught-place-delhi', label: 'Connaught Place, Delhi', short: 'Connaught Place', group: 'delhi', blurb: 'For working professionals in central Delhi planning AI upskilling around office hours.', related: ['ai-course-in-nsp-delhi', 'ai-course-in-south-extension-delhi', 'ai-course-in-lajpat-nagar-delhi'] },
  { slug: 'ai-course-in-lajpat-nagar-delhi', label: 'Lajpat Nagar, Delhi', short: 'Lajpat Nagar', group: 'delhi', blurb: 'For South-East Delhi learners comparing coaching, college and online routes into AI.', related: ['ai-course-in-south-extension-delhi', 'ai-course-in-laxmi-nagar-delhi', 'ai-course-in-connaught-place-delhi'] },
  { slug: 'ai-course-in-laxmi-nagar-delhi', label: 'Laxmi Nagar, Delhi', short: 'Laxmi Nagar', group: 'delhi', blurb: 'For East Delhi students building programming foundations before AI.', related: ['ai-course-in-lajpat-nagar-delhi', 'ai-course-in-noida-sector-62', 'ai-course-in-connaught-place-delhi'] },
  { slug: 'ai-course-in-patel-nagar-delhi', label: 'Patel Nagar, Delhi', short: 'Patel Nagar', group: 'delhi', blurb: 'For central-west Delhi learners, including civil-services and commerce students pivoting to tech.', related: ['ai-course-in-nsp-delhi', 'ai-course-in-tagore-garden-delhi', 'ai-course-in-connaught-place-delhi'] },
  { slug: 'ai-course-in-uttam-nagar-delhi', label: 'Uttam Nagar, Delhi', short: 'Uttam Nagar', group: 'delhi', blurb: 'For West Delhi learners planning a longer commute and a structured study routine.', related: ['ai-course-in-tagore-garden-delhi', 'ai-course-in-aya-nagar-delhi', 'ai-course-in-nsp-delhi'] },
  { slug: 'ai-course-in-nsp-delhi', label: 'Netaji Subhash Place (NSP), Delhi', short: 'NSP (Netaji Subhash Place)', group: 'delhi', blurb: 'The official head office: how to enquire, plan a visit and ask the right questions.', related: ['ai-course-in-pitampura-delhi', 'ai-course-in-patel-nagar-delhi', 'ai-course-in-tagore-garden-delhi'] },
  { slug: 'ai-course-in-aya-nagar-delhi', label: 'Aya Nagar, Delhi', short: 'Aya Nagar', group: 'delhi', blurb: 'For South Delhi border-area learners balancing distance with the online option.', related: ['ai-course-in-gurugram', 'ai-course-in-south-extension-delhi', 'ai-course-in-faridabad'] },
  { slug: 'ai-course-in-noida-sector-62', label: 'Noida Sector 62', short: 'Noida Sector 62', group: 'noida', blurb: 'For technology-oriented students and professionals in Noida’s institutional belt.', related: ['ai-course-in-noida-sector-2', 'ai-course-in-noida-sector-3', 'ai-course-in-greater-noida'] },
  { slug: 'ai-course-in-noida-sector-2', label: 'Noida Sector 2', short: 'Noida Sector 2', group: 'noida', blurb: 'For early-sector Noida residents and professionals exploring part-time AI learning.', related: ['ai-course-in-noida-sector-3', 'ai-course-in-noida-sector-62', 'ai-course-in-laxmi-nagar-delhi'] },
  { slug: 'ai-course-in-noida-sector-3', label: 'Noida Sector 3', short: 'Noida Sector 3', group: 'noida', blurb: 'For Noida learners from small businesses and industrial-area workplaces.', related: ['ai-course-in-noida-sector-2', 'ai-course-in-noida-sector-62', 'ai-course-in-greater-noida'] },
  { slug: 'ai-course-in-gurugram', label: 'Gurugram', short: 'Gurugram', group: 'gurugram', blurb: 'For Gurugram students and professionals comparing formats and schedules.', related: ['ai-course-in-gurugram-cyber-hub', 'ai-course-in-aya-nagar-delhi', 'ai-course-in-faridabad'] },
  { slug: 'ai-course-in-gurugram-cyber-hub', label: 'Gurugram Cyber Hub', short: 'Gurugram Cyber Hub', group: 'gurugram', blurb: 'For corporate professionals near Cyber Hub exploring practical AI skills.', related: ['ai-course-in-gurugram', 'ai-course-in-connaught-place-delhi', 'ai-course-in-aya-nagar-delhi'] },
  { slug: 'ai-course-in-faridabad', label: 'Faridabad', short: 'Faridabad', group: 'faridabad', blurb: 'For Faridabad students and professionals comparing delivery formats and travel.', related: ['ai-course-in-greater-noida', 'ai-course-in-aya-nagar-delhi', 'ai-course-in-lajpat-nagar-delhi'] },
  { slug: 'ai-course-in-greater-noida', label: 'Greater Noida', short: 'Greater Noida', group: 'other', blurb: 'For university and engineering students in Greater Noida.', related: ['ai-course-in-noida-sector-62', 'ai-course-in-faridabad', 'ai-course-in-noida-sector-3'] },
  { slug: 'ai-course-in-panipat', label: 'Panipat', short: 'Panipat', group: 'other', blurb: 'For learners outside Delhi confirming which learning formats are available.', related: ['ai-course-in-pitampura-delhi', 'ai-course-in-nsp-delhi', 'ai-course-in-faridabad'] },
]

export function getLocation(slug: string | undefined) {
  return LOCATIONS.find((l) => l.slug === slug)
}

export function locationPath(slug: string) {
  return `/locations/${slug}/`
}

/** Course names shown in the Courses marquee (same list as the home page ticker). */
export const COURSE_NAMES = [
  'Generative AI', 'Agentic AI', 'AI Engineering', 'Vibe Coding', 'Cyber Security + Gen AI', 'Java Full Stack + Gen AI',
  'MERN Stack + Gen AI', 'Data Science Pro', 'Data Analytics Using Python', 'Python', 'UI/UX Designing', 'Advanced Digital Marketing',
]
