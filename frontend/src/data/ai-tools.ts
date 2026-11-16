/**
 * Tools shown on /ai-tools. Hand-maintained: edit this list and the page, its category filters
 * and its structured data update automatically.
 *
 * - `officialUrl` is the tool's own official site (checked 16 Nov 2026).
 * - Describe what the tool is used for in our own words; no prices or "free" claims.
 * - `icon` is a Simple Icons slug whose SVG lives in /public/assets/ai-tools/ (CC0 icon data;
 *   the marks belong to their owners). Without an icon the card shows `monogram` instead.
 * - `color` is the brand colour used for the logo tile.
 */
export type AiToolCategory = 'AI assistants' | 'Coding' | 'Data & ML' | 'Build & automate' | 'Ship & deploy' | 'Design & product'

export interface AiTool {
  id: string
  name: string
  description: string
  category: AiToolCategory
  officialUrl: string
  icon?: string
  monogram?: string
  color: string
}

export const AI_TOOLS: AiTool[] = [
  { id: 'chatgpt', name: 'ChatGPT', category: 'AI assistants', officialUrl: 'https://chatgpt.com/', monogram: 'GPT', color: '#10A37F', description: 'OpenAI’s assistant for explaining concepts, drafting and debugging code' },
  { id: 'claude', name: 'Claude', category: 'AI assistants', officialUrl: 'https://claude.ai/', icon: 'claude', color: '#D97757', description: 'AI assistant for long documents, careful writing and programming' },
  { id: 'gemini', name: 'Gemini', category: 'AI assistants', officialUrl: 'https://gemini.google.com/', icon: 'googlegemini', color: '#8E75B2', description: 'Google’s multimodal assistant for text, images and research' },
  { id: 'perplexity', name: 'Perplexity', category: 'AI assistants', officialUrl: 'https://www.perplexity.ai/', icon: 'perplexity', color: '#1FB8CD', description: 'Answer engine that searches the web and cites its sources' },
  { id: 'notebooklm', name: 'NotebookLM', category: 'AI assistants', officialUrl: 'https://notebooklm.google.com/', monogram: 'NL', color: '#4285F4', description: 'Ask questions and build study guides from your own documents' },
  { id: 'github-copilot', name: 'GitHub Copilot', category: 'Coding', officialUrl: 'https://github.com/features/copilot', icon: 'githubcopilot', color: '#000000', description: 'AI pair programmer that suggests code and tests in your editor' },
  { id: 'cursor', name: 'Cursor', category: 'Coding', officialUrl: 'https://cursor.com/', icon: 'cursor', color: '#000000', description: 'AI-first code editor for chatting with and editing your codebase' },
  { id: 'vscode', name: 'VS Code', category: 'Coding', officialUrl: 'https://code.visualstudio.com/', monogram: 'VS', color: '#007ACC', description: 'Lightweight, extensible code editor used in every course' },
  { id: 'github', name: 'GitHub', category: 'Coding', officialUrl: 'https://github.com/', icon: 'github', color: '#181717', description: 'Host code, collaborate with Git and publish your portfolio projects' },
  { id: 'bolt', name: 'Bolt.new', category: 'Coding', officialUrl: 'https://bolt.new/', monogram: 'b', color: '#111827', description: 'Prompt, run and edit full-stack web apps right in the browser' },
  { id: 'lovable', name: 'Lovable', category: 'Coding', officialUrl: 'https://lovable.dev/', monogram: 'Lv', color: '#FF5C8A', description: 'Describe an app in plain words and get a working web app' },
  { id: 'python', name: 'Python', category: 'Data & ML', officialUrl: 'https://www.python.org/', icon: 'python', color: '#3776AB', description: 'The language behind most data, AI and automation work' },
  { id: 'jupyter', name: 'Jupyter', category: 'Data & ML', officialUrl: 'https://jupyter.org/', icon: 'jupyter', color: '#F37626', description: 'Interactive notebooks for exploring data step by step' },
  { id: 'google-colab', name: 'Google Colab', category: 'Data & ML', officialUrl: 'https://colab.research.google.com/', icon: 'googlecolab', color: '#F9AB00', description: 'Python notebooks in the browser with nothing to install' },
  { id: 'kaggle', name: 'Kaggle', category: 'Data & ML', officialUrl: 'https://www.kaggle.com/', icon: 'kaggle', color: '#20BEFF', description: 'Datasets, notebooks and competitions to practise data science' },
  { id: 'hugging-face', name: 'Hugging Face', category: 'Data & ML', officialUrl: 'https://huggingface.co/', icon: 'huggingface', color: '#FFD21E', description: 'Open hub for AI models, datasets and demo apps' },
  { id: 'streamlit', name: 'Streamlit', category: 'Data & ML', officialUrl: 'https://streamlit.io/', icon: 'streamlit', color: '#FF4B4B', description: 'Turn Python scripts into shareable data and AI web apps' },
  { id: 'mysql', name: 'MySQL', category: 'Data & ML', officialUrl: 'https://www.mysql.com/', icon: 'mysql', color: '#4479A1', description: 'Reliable relational database for storing and querying data' },
  { id: 'langchain', name: 'LangChain', category: 'Build & automate', officialUrl: 'https://www.langchain.com/', icon: 'langchain', color: '#1C3C3C', description: 'Framework for RAG, tool calling and agent workflows' },
  { id: 'ollama', name: 'Ollama', category: 'Build & automate', officialUrl: 'https://ollama.com/', icon: 'ollama', color: '#000000', description: 'Run open-source language models on your own computer' },
  { id: 'n8n', name: 'n8n', category: 'Build & automate', officialUrl: 'https://n8n.io/', icon: 'n8n', color: '#EA4B71', description: 'Visual workflow automation with AI steps and integrations' },
  { id: 'supabase', name: 'Supabase', category: 'Ship & deploy', officialUrl: 'https://supabase.com/', icon: 'supabase', color: '#3FCF8E', description: 'Postgres backend with auth, storage and APIs out of the box' },
  { id: 'netlify', name: 'Netlify', category: 'Ship & deploy', officialUrl: 'https://www.netlify.com/', icon: 'netlify', color: '#00C7B7', description: 'Deploy and host modern web apps from your Git repository' },
  { id: 'vercel', name: 'Vercel', category: 'Ship & deploy', officialUrl: 'https://vercel.com/', icon: 'vercel', color: '#000000', description: 'Deploy frontend and full-stack apps with preview links' },
  { id: 'postman', name: 'Postman', category: 'Ship & deploy', officialUrl: 'https://www.postman.com/', icon: 'postman', color: '#FF6C37', description: 'Design, test and document the APIs you build' },
  { id: 'figma', name: 'Figma', category: 'Design & product', officialUrl: 'https://www.figma.com/', icon: 'figma', color: '#F24E1E', description: 'Collaborative interface design and prototyping' },
  { id: 'notion', name: 'Notion', category: 'Design & product', officialUrl: 'https://www.notion.com/', icon: 'notion', color: '#000000', description: 'Notes, docs and project planning in one workspace' },
  { id: 'miro', name: 'Miro', category: 'Design & product', officialUrl: 'https://miro.com/', icon: 'miro', color: '#FFD02F', description: 'Online whiteboard for brainstorming and planning together' },
  { id: 'jira', name: 'Jira', category: 'Design & product', officialUrl: 'https://www.atlassian.com/software/jira', icon: 'jira', color: '#0052CC', description: 'Plan sprints and track work the way agile teams do' },
]

export const AI_TOOL_CATEGORIES: AiToolCategory[] = [...new Set(AI_TOOLS.map((t) => t.category))]

/** Dark or white glyph, whichever reads better on the tile colour; near-black brands get a white tile. */
export function logoColors(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (lum < 0.08) return { bg: '#ffffff', fg: '#0b1220' }
  return lum > 0.6 ? { bg: hex, fg: '#0b1220' } : { bg: hex, fg: '#ffffff' }
}
