export interface ProgramDay {
  title: string
  desc: string
}

export interface Program {
  slug: string
  title: string
  tagline: string
  image: string
  days: ProgramDay[]
}

export const PROGRAMS: Program[] = [
  {
    slug: 'vibe-coding-with-ai',
    title: 'Vibe Coding with AI',
    tagline: 'Build real, working apps by pairing with AI coding assistants — describe, generate, test and ship.',
    image: '/fs-assets/img/Modern Virtual Classroom Studio.png',
    days: [
      { title: 'Welcome & your AI coding setup', desc: 'Meet your trainer, install your AI coding assistant (Claude / Copilot / Cursor), and understand how the 15 days are structured.' },
      { title: 'How AI understands code', desc: 'Learn how LLMs read and write code, and how to prompt them clearly for programming tasks instead of vague requests.' },
      { title: 'Your first AI-built app', desc: 'Build a small working app end to end with an AI pair programmer, from a blank folder to running code.' },
      { title: 'Frontend basics with AI help', desc: 'HTML, CSS and JavaScript fundamentals, using AI to explain and speed up everyday frontend work.' },
      { title: 'React fundamentals', desc: 'Components, props and state — and how to get AI to scaffold and explain React code you can actually understand.' },
      { title: 'Connecting to a backend', desc: 'Wire your frontend to a real API, with AI helping you read docs and write the integration code.' },
      { title: 'Debugging with AI', desc: 'Turn cryptic error messages into fixes — how to ask AI the right follow-up questions when something breaks.' },
      { title: 'Working with databases', desc: 'Use AI to write and check database queries safely, and understand what the generated code is actually doing.' },
      { title: 'Auth & basic security', desc: 'Add login to your app and learn the security basics AI tools often skip if you do not ask for them.' },
      { title: 'Shipping your first app', desc: 'Deploy what you have built so far to a live URL you can share.' },
      { title: 'Project: AI-powered to-do app', desc: 'Build a complete to-do application with AI assistance, start to finish, in one guided session.' },
      { title: 'Adding an AI feature', desc: 'Bolt a simple AI feature — like a chatbot or smart search — onto your own project.' },
      { title: 'Code review & refactoring', desc: 'Use AI to review your code, catch issues, and clean up what you have built so far.' },
      { title: 'Portfolio project', desc: 'Build and ship a complete project you can show in interviews and on your portfolio.' },
      { title: 'Interview prep & next steps', desc: 'Common interview questions on AI-assisted development, best practices, and your roadmap after the program.' },
    ],
  },
  {
    slug: 'data-analytics-with-ai',
    title: 'Data Analytics with AI',
    tagline: 'Go from spreadsheets to real analysis — Python, SQL, dashboards and AI-assisted insights.',
    image: '/fs-assets/img/Live Python Class Studio.png',
    days: [
      { title: 'Welcome to data analytics', desc: 'What a data analyst actually does day to day, and how AI tools are changing the job.' },
      { title: 'Spreadsheets + AI', desc: 'Faster analysis in Excel / Google Sheets using AI-assisted formulas and summaries.' },
      { title: 'Python basics for data', desc: 'Get comfortable with Python, pandas and numpy for working with real datasets.' },
      { title: 'Cleaning messy data', desc: 'Handle missing values, duplicates and inconsistent data — with AI help spotting what to fix.' },
      { title: 'Exploratory Data Analysis', desc: 'A structured approach to understanding a new dataset before you draw any conclusions from it.' },
      { title: 'Data visualization', desc: 'Build clear charts with matplotlib/seaborn that actually communicate your findings.' },
      { title: 'SQL for analysts', desc: 'Query real tables with SQL — joins, filters, aggregations, the queries you will use constantly.' },
      { title: 'AI-assisted SQL', desc: 'Use AI to write, explain and optimise SQL queries, and learn to verify what it gives you.' },
      { title: 'Statistics fundamentals', desc: 'The core statistics concepts analysts actually use: averages, distributions, correlation.' },
      { title: 'Building dashboards', desc: 'Turn an analysis into a dashboard stakeholders can actually read, using Power BI / Tableau basics.' },
      { title: 'AI-assisted reporting', desc: 'Use AI to help summarise findings into a clear report or presentation, fast.' },
      { title: 'Intro to prediction', desc: 'A gentle introduction to simple predictive models and when analysts reach for them.' },
      { title: 'Real-world case study', desc: 'Work through a full analysis on a real-world style dataset, start to finish.' },
      { title: 'Capstone project', desc: 'Analyse a dataset of your own and prepare it to present.' },
      { title: 'Present & next steps', desc: 'Present your capstone, get feedback, and leave with a portfolio piece and a career roadmap.' },
    ],
  },
  {
    slug: 'ai-for-all',
    title: 'AI for All',
    tagline: 'No coding background needed — practical AI skills for students, professionals and business owners.',
    image: '/fs-assets/img/banner.png',
    days: [
      { title: 'What is AI, really?', desc: 'Demystifying AI, machine learning and large language models in plain language — no jargon.' },
      { title: 'Getting started with ChatGPT/Claude', desc: 'Prompting basics: how to ask AI for what you actually want, and get useful answers.' },
      { title: 'AI for writing', desc: 'Use AI for emails, documents and content — faster, without losing your own voice.' },
      { title: 'AI for everyday productivity', desc: 'Scheduling, note-taking and research — practical ways AI saves you time every day.' },
      { title: 'AI for your work or business', desc: 'Automate repetitive tasks in your job or business using tools you already have access to.' },
      { title: 'AI image & design tools', desc: 'A hands-on look at AI image and design tools like Midjourney and Canva AI.' },
      { title: 'AI for students', desc: 'Study smarter — using AI to summarise, quiz yourself and understand difficult topics.' },
      { title: 'Your first no-code automation', desc: 'Build a simple automation that saves you a repetitive task, with no coding required.' },
      { title: 'AI voice & video tools', desc: 'An overview of what today’s AI voice and video tools can and cannot do.' },
      { title: 'Using AI safely', desc: 'AI ethics, limitations, and how to spot when an AI answer cannot be trusted.' },
      { title: 'AI for your job search', desc: 'Use AI to improve your resume, LinkedIn profile and interview preparation.' },
      { title: 'Intro to AI agents', desc: 'What AI agents are, and simple ways they can start doing tasks for you.' },
      { title: 'Choosing the right AI tool', desc: 'A practical framework for picking the right AI tool for a given task instead of guessing.' },
      { title: 'Hands-on project', desc: 'Solve one real problem from your own work or life using what you have learned.' },
      { title: 'Your AI toolkit', desc: 'Leave with a personal AI toolkit and a clear roadmap for what to learn next.' },
    ],
  },
]

export function getProgram(slug: string | undefined) {
  return PROGRAMS.find((p) => p.slug === slug)
}
