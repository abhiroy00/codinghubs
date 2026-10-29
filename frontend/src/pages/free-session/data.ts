export const INSTITUTE = {
  name: 'Coding Hubs School of AI',
  phone: '+91 84488 11320',
  phoneHref: 'tel:+918448811320',
  email: 'info@codingnowai.in',
  address: '904, 9th Floor, Pearls Best Heights-I, Netaji Subhash Place, Delhi – 110034',
  website: 'codingnowai.in',
  websiteHref: 'https://codingnowai.in/',
  social: {
    instagram: 'https://www.instagram.com/codinghubschoolofai',
    linkedin: 'https://www.linkedin.com/in/codinghub-school-of-ai-a4934843b',
    youtube: 'https://www.youtube.com/channel/UCs9KndvnhsYtoy2OCHsmf5g',
    facebook: 'https://www.facebook.com/profile.php?id=61595114751548',
  },
}

export const SESSION = { date: 'To Be Announced', time: 'To Be Announced' }

export const WHATSAPP = {
  number: '918448811320',
  message: 'Hi! I just registered for the free 2-hour live session for "{course}". My name is {name}. Please share the session details.',
  genericMessage: 'Hi! I have a question about the free 2-hour live session.',
}

export interface VideoItem {
  src: string
  title: string
  duration: string
}

export const VIDEOS: VideoItem[] = [
  { src: '/fs-assets/img/videos/demo-1.mp4', title: 'AI Challenge: Day 3', duration: '1:06' },
  { src: '/fs-assets/img/videos/demo-2.mp4', title: 'Multi-Agent Systems', duration: '0:44' },
  { src: '/fs-assets/img/videos/demo-3.mp4', title: 'Claude vs Codex', duration: '0:53' },
  { src: '/fs-assets/img/videos/demo-4.mp4', title: 'AI Concept Challenge', duration: '0:40' },
  { src: '/fs-assets/img/videos/demo-5.mp4', title: 'ChatGPT for Developers', duration: '1:06' },
  { src: '/fs-assets/img/videos/demo-6.mp4', title: 'End-to-End AI Solutions', duration: '0:30' },
]

export const COURSE_OPTIONS = [
  { group: 'Software Development & Programming', items: ['Java Full Stack Developer + Gen AI', 'MERN Stack + Gen AI', 'Python Training Course'] },
  { group: 'Artificial Intelligence & Cyber Security', items: ['Generative AI', 'Agentic AI', 'AI Engineering', 'Vibe Coding', 'Cyber Security + Gen AI'] },
  { group: 'Data Analytics & Business Intelligence', items: ['Data Analytics Using Python', 'Data Science Pro'] },
  { group: 'Design & Digital Marketing', items: ['UI/UX Designing', 'Advanced Digital Marketing'] },
]

export const EDUCATION_OPTIONS = [
  'Class 12 (pursuing / completed)', 'Diploma', 'Graduation (pursuing)', 'Graduate', 'Postgraduate', 'Working professional', 'Other',
]

export interface CourseCard {
  cat: 'ai' | 'dev' | 'data' | 'design'
  icon: string
  iconColor: 'ic-blue' | 'ic-yellow'
  catLabel: string
  title: string
  desc: string
}

export const COURSES: CourseCard[] = [
  { cat: 'ai', icon: 'i-shield', iconColor: 'ic-blue', catLabel: 'AI & Cyber Security', title: 'Cyber Security + Gen AI', desc: 'Learn how systems and networks are protected from cyber threats, and how Gen AI tools are used in modern security work.' },
  { cat: 'dev', icon: 'i-code', iconColor: 'ic-yellow', catLabel: 'Software Development', title: 'Java Full Stack Developer + Gen AI', desc: 'Build web applications with Java on the backend and modern frontend tools, with an introduction to using Gen AI in development.' },
  { cat: 'design', icon: 'i-mega', iconColor: 'ic-yellow', catLabel: 'Digital Marketing', title: 'Advanced Digital Marketing', desc: 'Explore SEO, social media, paid ads and content strategy used to grow brands and businesses online.' },
  { cat: 'data', icon: 'i-line', iconColor: 'ic-blue', catLabel: 'Data & BI', title: 'Data Analytics Using Python', desc: 'Clean, analyse and visualise data using Python and its popular data libraries.' },
  { cat: 'dev', icon: 'i-term', iconColor: 'ic-yellow', catLabel: 'Programming', title: 'Python Training Course', desc: 'Start programming with Python — from core concepts to writing practical, useful programs.' },
  { cat: 'design', icon: 'i-pen', iconColor: 'ic-yellow', catLabel: 'Design', title: 'UI/UX Designing', desc: 'Learn to understand users, design clean interfaces and create prototypes for apps and websites.' },
  { cat: 'data', icon: 'i-atom', iconColor: 'ic-blue', catLabel: 'Data & BI', title: 'Data Science Pro', desc: 'Explore statistics, machine learning and the data workflows used in real data science projects.' },
  { cat: 'ai', icon: 'i-atom', iconColor: 'ic-blue', catLabel: 'AI & Agents', title: 'Agentic AI', desc: 'Build AI agents that plan, use tools and complete multi-step tasks on their own, using modern agent frameworks.' },
  { cat: 'ai', icon: 'i-spark', iconColor: 'ic-yellow', catLabel: 'AI Engineering', title: 'AI Engineering', desc: 'Learn to build real AI-powered products: working with LLM APIs, RAG, prompt design, evaluation and deployment.' },
  { cat: 'ai', icon: 'i-code', iconColor: 'ic-blue', catLabel: 'AI & Development', title: 'Vibe Coding', desc: 'Turn ideas into working apps by building with AI coding assistants — describe, generate, test and ship faster.' },
  { cat: 'dev', icon: 'i-layers', iconColor: 'ic-yellow', catLabel: 'Software Development', title: 'MERN Stack + Gen AI', desc: 'Build full stack web apps with MongoDB, Express, React and Node.js, plus Gen AI integrations.' },
  { cat: 'ai', icon: 'i-spark', iconColor: 'ic-blue', catLabel: 'AI & Cyber Security', title: 'Generative AI', desc: 'Discover how Gen AI models work and how to use them through prompts, tools and practical use-cases.' },
]

export const CATEGORY_TABS: { filter: string; label: string }[] = [
  { filter: 'all', label: 'All' },
  { filter: 'dev', label: 'Software Development & Programming' },
  { filter: 'ai', label: 'AI & Cyber Security' },
  { filter: 'data', label: 'Data Analytics & BI' },
  { filter: 'design', label: 'Design & Digital Marketing' },
]

export const FAQS = [
  { q: 'Is the live session free?', a: 'Yes, registration for the 2-hour demo session is free.' },
  { q: 'Will the session be online?', a: 'Yes, the session will be conducted online.' },
  { q: 'Which courses are available?', a: 'Students can choose from the 12 courses listed on the website.' },
  { q: 'Do I need prior experience?', a: 'Requirements depend on the selected course. Contact the institute for guidance.' },
  { q: 'Will I get access to the complete course for free?', a: 'No. The session is a free demonstration and introduction to the course. After the demo, you can join the paid 15-day training program.' },
  { q: 'How will I receive the session details?', a: 'Registered students will receive the confirmed session details through the contact method they have provided.' },
  { q: 'How can I enroll in the complete course?', a: 'After the demo session, students can contact the institute to learn about the full course curriculum, fees, and admission process.' },
]
