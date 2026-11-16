/**
 * AI Tools directory shown on the home page.
 *
 * Curated starter list of real, widely used tools that come up in Coding Hubs classes. It is a
 * hand-maintained list, not a feed: add, edit or remove entries here and the section, its search
 * and its category filters update automatically.
 *
 * Rules for entries:
 * - `officialUrl` must be the tool's own official site (checked 16 Nov 2026).
 * - Describe what the tool is used for. Do not state prices or call a tool free.
 * - `icon` is a short monogram drawn as a simple tile; no third-party logos are bundled.
 */
export interface AiTool {
  id: string
  name: string
  description: string
  category: AiToolCategory
  officialUrl: string
  icon: string
}

export type AiToolCategory = 'AI assistants' | 'Research' | 'Coding' | 'Data & ML' | 'Build with LLMs'

export const AI_TOOLS: AiTool[] = [
  { id: 'chatgpt', name: 'ChatGPT', category: 'AI assistants', officialUrl: 'https://chatgpt.com/', icon: 'GP',
    description: 'General-purpose assistant from OpenAI for explaining concepts, drafting text and working through code.' },
  { id: 'claude', name: 'Claude', category: 'AI assistants', officialUrl: 'https://claude.ai/', icon: 'Cl',
    description: 'Assistant from Anthropic for long documents, careful writing, analysis and programming help.' },
  { id: 'gemini', name: 'Gemini', category: 'AI assistants', officialUrl: 'https://gemini.google.com/', icon: 'Ge',
    description: 'Google’s assistant for questions, writing and multimodal tasks across text and images.' },
  { id: 'perplexity', name: 'Perplexity', category: 'Research', officialUrl: 'https://www.perplexity.ai/', icon: 'Px',
    description: 'Answer engine that searches the web and shows the sources behind each answer.' },
  { id: 'notebooklm', name: 'NotebookLM', category: 'Research', officialUrl: 'https://notebooklm.google.com/', icon: 'NL',
    description: 'Upload your own notes and documents, then ask questions and build study guides grounded in them.' },
  { id: 'github-copilot', name: 'GitHub Copilot', category: 'Coding', officialUrl: 'https://github.com/features/copilot', icon: 'Co',
    description: 'AI pair programmer inside your editor that suggests code, tests and explanations as you type.' },
  { id: 'cursor', name: 'Cursor', category: 'Coding', officialUrl: 'https://cursor.com/', icon: 'Cu',
    description: 'Code editor built around AI: chat with your codebase and make multi-file edits.' },
  { id: 'hugging-face', name: 'Hugging Face', category: 'Data & ML', officialUrl: 'https://huggingface.co/', icon: 'HF',
    description: 'Hub of open models, datasets and demo apps for machine learning and NLP work.' },
  { id: 'google-colab', name: 'Google Colab', category: 'Data & ML', officialUrl: 'https://colab.research.google.com/', icon: 'Cb',
    description: 'Python notebooks in the browser for data analysis and ML experiments, with nothing to install.' },
  { id: 'kaggle', name: 'Kaggle', category: 'Data & ML', officialUrl: 'https://www.kaggle.com/', icon: 'Kg',
    description: 'Public datasets, notebooks and competitions to practise data science on real problems.' },
  { id: 'ollama', name: 'Ollama', category: 'Build with LLMs', officialUrl: 'https://ollama.com/', icon: 'Ol',
    description: 'Run open large language models on your own computer for private, offline experiments.' },
  { id: 'langchain', name: 'LangChain', category: 'Build with LLMs', officialUrl: 'https://www.langchain.com/', icon: 'LC',
    description: 'Framework for building LLM apps: retrieval (RAG), tool calling and agent workflows.' },
]

export const AI_TOOL_CATEGORIES: AiToolCategory[] = [...new Set(AI_TOOLS.map((t) => t.category))]
