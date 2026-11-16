/** Projects delivered and shipped, shown on /our-work and in the home page showcase. */
export type Work = {
  name: string
  category: string
  summary: string
  image: string
  /** Live site or case study; cards without one are not links. */
  href?: string
}

const SITE = 'https://innovativeais.com'

export const WORKS: Work[] = [
  {
    name: 'LeadGenPlus.ai',
    category: 'AI Applications',
    summary: 'AI sales engagement platform with a dialer, lead database, call sequences, recordings and an operations dashboard.',
    image: 'leadgenplus-leads-search',
    href: `${SITE}/others/portfolio-leadgenplus.php`,
  },
  {
    name: 'Properly',
    category: 'PropTech',
    summary: 'Property investment platform: a marketing site plus an investor dashboard for loans, income, equity and more.',
    image: 'investview-au',
    href: 'https://investview.com.au/',
  },
  {
    name: 'Shivlal Manpower',
    category: 'HR & Workforce',
    summary: 'Workforce admin console for a manpower agency covering attendance, payroll, PF/ESI, recruitment and leave.',
    image: 'shivlal2',
    href: `${SITE}/others/portfolio-shivlal-manpower.php`,
  },
  {
    name: 'Mimi Learning',
    category: 'AI Applications',
    summary: 'A playful AI learning platform for children, built around engaging activities.',
    image: 'mimiplay-in',
    href: 'https://mimiplay.in/',
  },
  {
    name: 'Innovative AI Labs',
    category: 'Web Development',
    summary: 'Engineering brand website for AI agents, RAG, LLM integration and automation, with a callback lead form.',
    image: 'innovativeaislabs',
    href: 'https://innovativeaislabs.com/',
  },
  {
    name: 'Coding Hub',
    category: 'Web Development',
    summary: 'Coding education website showcasing courses, instructors and student testimonials.',
    image: 'codingnowai-in',
    href: 'https://codingnowai.in/',
  },
  {
    name: 'Designhubs',
    category: 'Web Development',
    summary: 'Creative design studio website presenting its services, work and partners.',
    image: 'designhubs-in',
    href: 'https://designhubs.in/',
  },
  {
    name: 'Loan Mitra',
    category: 'Web Development',
    summary: 'Loan and insurance comparison site with eligibility forms, a free CIBIL check, an EMI calculator and a product catalogue.',
    image: 'loan-mitra',
  },
  {
    name: 'Agarwal Travels',
    category: 'Web Development',
    summary: 'Travel agency website for a Mumbai desk with destination sliders, popular routes and click-to-call booking.',
    image: 'agarwal-travels',
  },
  {
    name: 'RL Secure Home',
    category: 'Web Development',
    summary: 'Website for a safety grill, bird net and hanger installer with product highlights and call/WhatsApp lead capture.',
    image: 'rl-secure-home',
  },
  {
    name: 'Gmart Fresh',
    category: 'E-Commerce',
    summary: 'Grocery delivery platform with category browsing, product badges and an admin dashboard for orders, inventory and analytics.',
    image: 'shop-gmartfresh',
    href: 'https://shop.gmartfresh.com/',
  },
  {
    name: 'Sportswear9',
    category: 'E-Commerce',
    summary: 'Online store for sports and activewear with product listings, reviews and a smooth checkout flow.',
    image: 'sportswear',
    href: `${SITE}/others/portfolio-sportswear9.php`,
  },
  {
    name: 'AI Exam System',
    category: 'AI Applications',
    summary: 'Online examination platform with an admin dashboard for question banks, faculty, courses, evaluation and users.',
    image: 'ai-exam-system',
  },
  {
    name: 'RDPMS',
    category: 'Web Applications',
    summary: 'Secure portal for a remote diagnostics and predictive maintenance system.',
    image: 'rdpms',
    href: `${SITE}/others/portfolio-rdpms.php`,
  },
]

export const WORK_CATEGORIES = [...new Set(WORKS.map((w) => w.category))]
export const workImage = (w: Work) => `/assets/our-work/${w.image}.webp`
