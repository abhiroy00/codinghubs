/**
 * Blog guides that answer common questions about a course's subject, shown on the course page under "Related guides".
 * Slugs must match published posts (seeded from backend/apps/content/seed_data/blog_posts); relatedArticles.test.ts checks them.
 * If a post is renamed in the admin panel its old slug keeps working through a 301, but update the slug here too.
 */
export type RelatedArticle = { slug: string; title: string }

const A = {
  fullStack: { slug: 'full-stack-developer-roadmap', title: 'Full stack developer roadmap' },
  pythonRoadmap: { slug: 'python-developer-roadmap', title: 'Python developer roadmap for beginners' },
  pythonStart: { slug: 'learn-python-for-beginners', title: 'Learn Python: a 30-day plan for beginners' },
  pythonProjects: { slug: 'python-projects-for-beginners', title: '15 Python projects for beginners' },
  pythonInterview: { slug: 'python-interview-questions', title: 'Top 50 Python interview questions' },
  djangoFlask: { slug: 'django-vs-flask', title: 'Django vs Flask vs FastAPI' },
  javaRoadmap: { slug: 'java-full-stack-developer-roadmap', title: 'Java full stack developer roadmap' },
  coreJava: { slug: 'core-java-concepts', title: 'Core Java concepts every fresher must know' },
  springBoot: { slug: 'spring-boot-rest-api-tutorial', title: 'Spring Boot tutorial: build your first REST API' },
  javaInterview: { slug: 'java-interview-questions', title: 'Top 40 Java interview questions' },
  mernRoadmap: { slug: 'mern-stack-developer-roadmap', title: 'MERN stack developer roadmap' },
  mernProject: { slug: 'build-mern-stack-project', title: 'Build a MERN stack project step by step' },
  nodeApi: { slug: 'node-js-express-rest-api', title: 'Node.js and Express REST API tutorial' },
  mongoSql: { slug: 'mongodb-vs-sql', title: 'MongoDB vs SQL: which to learn first' },
  react: { slug: 'react-js-for-beginners', title: 'React JS for beginners' },
  jsBeforeReact: { slug: 'javascript-concepts-before-react', title: 'JavaScript concepts to learn before React' },
  reactInterview: { slug: 'react-interview-questions', title: 'Top 35 React interview questions' },
  deploy: { slug: 'deploy-full-stack-project', title: 'How to deploy a full stack project' },
  genAi: { slug: 'what-is-generative-ai', title: 'What is generative AI?' },
  aiEngineer: { slug: 'how-to-become-an-ai-engineer', title: 'How to become an AI engineer' },
  rag: { slug: 'what-is-rag', title: 'What is RAG (retrieval-augmented generation)?' },
  agents: { slug: 'ai-agents-explained', title: 'AI agents explained' },
  chatbot: { slug: 'build-ai-chatbot', title: 'Build your first AI chatbot with an LLM API' },
  aiInApps: { slug: 'add-ai-to-web-app', title: 'How to add AI features to a web app' },
  prompting: { slug: 'prompt-engineering-for-beginners', title: 'Prompt engineering for beginners' },
  aiTools: { slug: 'ai-tools-for-developers', title: 'AI tools for developers' },
  aiJobs: { slug: 'will-ai-replace-programmers', title: 'Will AI replace programmers?' },
  careers: { slug: 'full-stack-vs-data-science-vs-ai', title: 'Full stack vs data science vs AI careers' },
  automation: { slug: 'python-automation-scripts', title: 'Automate everyday tasks with Python' },
  internships: { slug: 'internships-for-cs-students', title: 'How to find internships as a student' },
  resume: { slug: 'developer-resume-for-freshers', title: 'Write a developer resume that gets shortlisted' },
  github: { slug: 'github-profile-for-developers', title: 'Build a GitHub profile recruiters notice' },
  apiTesting: { slug: 'api-testing-tutorial', title: 'API testing with Postman and code' },
  testCases: { slug: 'how-to-write-test-cases', title: 'Write useful test cases' },
  testingRoadmap: { slug: 'automation-testing-roadmap', title: 'Automation testing learning roadmap' },
  microservices: { slug: 'microservices-spring-boot', title: 'Spring Boot microservices and architecture' },
} satisfies Record<string, RelatedArticle>

const RELATED: Record<string, RelatedArticle[]> = {
  'python-training-course': [A.pythonStart, A.pythonRoadmap, A.pythonProjects, A.pythonInterview],
  'python-full-stack': [A.pythonRoadmap, A.djangoFlask, A.fullStack, A.pythonInterview],
  'java-full-stack-developer-gen-ai': [A.javaRoadmap, A.coreJava, A.springBoot, A.javaInterview],
  'mern-stack': [A.mernRoadmap, A.mernProject, A.nodeApi, A.mongoSql],
  'mern-stack-gen-ai': [A.mernRoadmap, A.mernProject, A.aiInApps, A.nodeApi],
  'mean-stack': [A.nodeApi, A.mongoSql, A.fullStack, A.deploy],
  'react-full-stack': [A.react, A.jsBeforeReact, A.reactInterview, A.deploy],
  'net-full-stack': [A.fullStack, A.deploy, A.mongoSql],
  'ai-integrated-full-stack': [A.aiInApps, A.fullStack, A.chatbot, A.rag],
  'generative-ai': [A.genAi, A.rag, A.chatbot, A.aiEngineer],
  'ai-engineering': [A.aiEngineer, A.rag, A.agents, A.genAi],
  'ai-engineering-diploma': [A.aiEngineer, A.rag, A.agents, A.genAi],
  'agentic-ai': [A.agents, A.rag, A.chatbot, A.aiEngineer],
  'prompt-engineering': [A.prompting, A.genAi, A.aiTools],
  'vibe-coding': [A.aiTools, A.aiJobs, A.prompting],
  'vibe-coding-with-ai': [A.aiTools, A.aiJobs, A.prompting],
  'data-analytics': [A.careers, A.pythonStart, A.automation],
  'data-analytics-using-python': [A.pythonStart, A.automation, A.careers],
  'data-science': [A.careers, A.pythonRoadmap, A.genAi],
  'data-science-pro': [A.careers, A.pythonRoadmap, A.genAi],
  'automation-testing': [A.apiTesting, A.testCases, A.testingRoadmap],
  'python-automation': [A.automation, A.apiTesting, A.pythonStart],
  'cloud-devops': [A.deploy, A.microservices, A.github],
  'ai-ml-cloud-engineering': [A.aiEngineer, A.rag, A.deploy],
  'ai-workflow-automation': [A.agents, A.rag, A.automation],
  internship: [A.internships, A.resume, A.github],
}

export function relatedArticlesFor(courseSlug: string): RelatedArticle[] {
  return RELATED[courseSlug] ?? []
}

export const ALL_RELATED_SLUGS = [...new Set(Object.values(RELATED).flat().map((a) => a.slug))]
export const RELATED_COURSE_SLUGS = Object.keys(RELATED)
