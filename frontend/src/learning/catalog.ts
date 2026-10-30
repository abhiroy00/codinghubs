export type CourseTrack = 'ai' | 'development' | 'data' | 'cloud' | 'security' | 'program' | 'design' | 'marketing'

export interface CourseDefinition {
  slug: string
  name: string
  category: string
  track: CourseTrack
  focus: string
  summary: string
  introduction: string
  tools: string[]
  skills: string[]
  careers: string[]
  modules: { title: string; description: string; topics: string[] }[]
  projects: { name: string; description: string; objectives: string[]; requirements: string[]; steps: string[]; outcome: string; skills: string[] }[]
  faqs: { question: string; answer: string }[]
  days: { title: string; module: string; focus: string }[]
  hasCoding: boolean
}

const TRACKS: Record<CourseTrack, { modules: string[]; topics: string[]; tools: string[]; skills: string[]; careers: string[] }> = {
  ai: {
    modules: ['AI foundations', 'Model and prompt workflows', 'Retrieval and grounding', 'Evaluation and safety', 'Product integration', 'Capstone and interview review'],
    topics: ['AI problem framing', 'language-model fundamentals', 'tokens and context windows', 'prompt structure', 'few-shot examples', 'structured outputs', 'tool calling', 'embeddings', 'vector search', 'retrieval pipelines', 'document chunking', 'grounded answers', 'conversation state', 'model selection', 'latency and cost trade-offs', 'output evaluation', 'test-set design', 'hallucination checks', 'prompt injection risks', 'privacy boundaries', 'API integration', 'error handling', 'user feedback loops', 'observability', 'versioned prompts', 'fallback behavior', 'accessibility', 'deployment readiness', 'product measurement', 'portfolio walkthrough'],
    tools: ['Python', 'LLM APIs', 'Jupyter', 'Git', 'REST APIs', 'vector search'],
    skills: ['AI problem framing', 'prompt and context design', 'retrieval workflows', 'evaluation', 'responsible AI integration'],
    careers: ['AI application developer', 'Generative AI engineer', 'AI product analyst', 'LLM application engineer'],
  },
  development: {
    modules: ['Programming foundations', 'Application structure', 'Data and APIs', 'Quality and security', 'Deployment and operations', 'Capstone and interview review'],
    topics: ['problem decomposition', 'data types and validation', 'functions and composition', 'control flow', 'collections and iteration', 'error handling', 'module boundaries', 'dependency management', 'HTTP request lifecycle', 'API contract design', 'database modeling', 'CRUD behavior', 'authentication flow', 'authorization checks', 'input sanitization', 'state management', 'component design', 'form handling', 'loading and error states', 'unit testing', 'integration testing', 'debugging strategy', 'logging and observability', 'performance profiling', 'accessibility checks', 'configuration management', 'secure secrets handling', 'deployment workflow', 'code review', 'portfolio walkthrough'],
    tools: ['Git', 'REST APIs', 'SQL', 'VS Code', 'Docker', 'automated tests'],
    skills: ['programming fundamentals', 'application architecture', 'API and database design', 'testing', 'secure deployment'],
    careers: ['software developer', 'full-stack engineer', 'backend developer', 'application support engineer'],
  },
  data: {
    modules: ['Data foundations', 'Cleaning and exploration', 'Statistics and modeling', 'Communication and dashboards', 'Reliable analytics workflows', 'Capstone and interview review'],
    topics: ['question and metric definition', 'data types and schemas', 'missing-value analysis', 'duplicate detection', 'data quality rules', 'descriptive statistics', 'distribution shape', 'outlier investigation', 'sampling and bias', 'correlation limits', 'SQL filtering', 'joins and grain', 'grouping and aggregation', 'window calculations', 'exploratory analysis', 'feature preparation', 'baseline models', 'train-test separation', 'model evaluation', 'threshold selection', 'chart selection', 'dashboard hierarchy', 'narrative with evidence', 'reproducible notebooks', 'query performance', 'privacy and minimization', 'stakeholder questions', 'monitoring data drift', 'decision recommendations', 'portfolio walkthrough'],
    tools: ['Python', 'pandas', 'SQL', 'Jupyter', 'Power BI', 'Git'],
    skills: ['data cleaning', 'SQL analysis', 'statistics', 'visualization', 'evidence-based communication'],
    careers: ['data analyst', 'business intelligence analyst', 'junior data scientist', 'analytics engineer'],
  },
  cloud: {
    modules: ['Cloud foundations', 'Identity and architecture', 'Networking and compute', 'Reliability and operations', 'Security and cost controls', 'Capstone and interview review'],
    topics: ['shared responsibility', 'regions and availability zones', 'identity boundaries', 'least-privilege policies', 'network segmentation', 'subnets and routes', 'compute selection', 'storage classes', 'managed databases', 'load balancing', 'autoscaling behavior', 'infrastructure as code', 'configuration separation', 'secret management', 'encryption boundaries', 'logging and audit trails', 'health checks', 'backup and recovery', 'high availability', 'disaster recovery objectives', 'container basics', 'deployment pipelines', 'monitoring signals', 'incident response', 'cost allocation', 'capacity planning', 'service limits', 'architecture trade-offs', 'operational runbooks', 'portfolio walkthrough'],
    tools: ['cloud CLI', 'IAM', 'VPC networking', 'Docker', 'Terraform', 'monitoring dashboards'],
    skills: ['cloud architecture', 'identity and access', 'networking', 'automation', 'reliability and cost control'],
    careers: ['cloud engineer', 'cloud developer', 'solutions architect', 'site reliability engineer'],
  },
  security: {
    modules: ['Security foundations', 'Threat modeling and assessment', 'Detection and response', 'Governance and assurance', 'Cloud and AI security', 'Capstone and interview review'],
    topics: ['security goals and assets', 'threat modeling', 'attack surface mapping', 'risk likelihood and impact', 'identity lifecycle', 'authentication factors', 'authorization boundaries', 'secure configuration', 'network segmentation', 'vulnerability triage', 'patch prioritization', 'logging strategy', 'alert quality', 'incident classification', 'evidence preservation', 'containment decisions', 'recovery validation', 'data classification', 'encryption use cases', 'backup protection', 'cloud shared responsibility', 'AI threat surfaces', 'prompt injection scenarios', 'privacy impact review', 'security control mapping', 'audit evidence', 'policy exceptions', 'third-party risk', 'tabletop exercise', 'portfolio walkthrough'],
    tools: ['Linux', 'network analyzers', 'SIEM concepts', 'IAM', 'vulnerability scanners', 'incident runbooks'],
    skills: ['threat analysis', 'security controls', 'incident response', 'risk communication', 'defensive operations'],
    careers: ['security analyst', 'SOC analyst', 'cloud security engineer', 'GRC analyst'],
  },
  program: {
    modules: ['Goals and scope', 'Research and planning', 'Delivery workflows', 'Quality and collaboration', 'Review and presentation', 'Portfolio and next steps'],
    topics: ['goal definition', 'scope boundaries', 'stakeholder mapping', 'success criteria', 'research planning', 'source evaluation', 'work breakdown', 'time estimation', 'risk identification', 'communication cadence', 'version control', 'task prioritization', 'prototype review', 'feedback synthesis', 'quality checklist', 'test planning', 'documentation habits', 'team handoffs', 'decision records', 'progress reporting', 'accessibility review', 'privacy and ethics', 'iteration planning', 'delivery readiness', 'demo narrative', 'evidence collection', 'retrospective method', 'portfolio writing', 'interview storytelling', 'next-step planning'],
    tools: ['GitHub Projects', 'Git', 'shared documentation', 'issue trackers', 'presentation tools', 'portfolio hosting'],
    skills: ['project planning', 'collaboration', 'quality review', 'clear documentation', 'professional presentation'],
    careers: ['project intern', 'technical project assistant', 'junior project coordinator', 'portfolio-ready graduate'],
  },
  design: {
    modules: ['People and problems', 'Research and information design', 'Interaction patterns', 'Prototyping and validation', 'Delivery and measurement', 'Portfolio and interview review'],
    topics: ['problem framing', 'audience definition', 'research questions', 'interview practice', 'survey limitations', 'journey mapping', 'information architecture', 'content hierarchy', 'visual principles', 'layout systems', 'type and readability', 'color contrast', 'interaction states', 'form usability', 'responsive behavior', 'wireframing', 'prototype fidelity', 'design-system tokens', 'component reuse', 'accessibility review', 'usability test planning', 'feedback synthesis', 'iteration rationale', 'handoff specifications', 'analytics signals', 'ethical persuasion', 'brand consistency', 'case-study writing', 'design critique', 'portfolio walkthrough'],
    tools: ['Figma', 'design systems', 'prototype tools', 'accessibility checkers', 'analytics dashboards', 'collaboration boards'],
    skills: ['user research', 'information architecture', 'interaction design', 'prototyping', 'usability evaluation'],
    careers: ['UX designer', 'product designer', 'interaction designer', 'digital marketing analyst'],
  },
  marketing: {
    modules: ['Audience and intent', 'Content and search strategy', 'Campaign planning', 'Measurement and attribution', 'Optimization and privacy', 'Portfolio and interview review'],
    topics: ['audience intent', 'search intent', 'campaign measurement', 'landing page conversion', 'paid search bidding', 'content strategy', 'experimentation and attribution', 'privacy and consent', 'funnel quality', 'reporting and recommendations', 'budget allocation', 'creative testing', 'lead quality', 'retention signals', 'portfolio walkthrough', 'stakeholder communication', 'campaign risk review', 'channel mix', 'conversion definitions', 'marketing ethics', 'analytics instrumentation', 'organic visibility', 'ad relevance', 'audience segmentation', 'marketing automation', 'email deliverability', 'customer journey', 'incrementality', 'return on investment', 'next-step planning'],
    tools: ['Google Analytics', 'Search Console', 'advertising platforms', 'spreadsheet analysis', 'tag management', 'A/B testing tools'],
    skills: ['audience research', 'search and content strategy', 'campaign measurement', 'conversion optimization', 'privacy-aware marketing'],
    careers: ['digital marketing analyst', 'SEO specialist', 'performance marketer', 'content strategist'],
  },
}

type CourseRow = [slug: string, name: string, category: string, track: CourseTrack, focus: string]
const ROWS: CourseRow[] = [
  ['generative-ai', 'Generative AI', 'AI & Data', 'ai', 'generative AI applications'],
  ['agentic-ai', 'Agentic AI', 'AI & Data', 'ai', 'agentic AI systems'],
  ['prompt-engineering', 'Prompt Engineering', 'AI & Data', 'ai', 'prompt engineering'],
  ['ai-engineering-diploma', 'AI Engineering Diploma', 'AI & Data', 'ai', 'AI engineering'],
  ['data-science', 'Data Science', 'AI & Data', 'data', 'data science'],
  ['data-analytics', 'Data Analytics', 'AI & Data', 'data', 'data analytics'],
  ['vibe-coding-with-ai', 'Vibe Coding with AI', 'AI & Data', 'development', 'AI-assisted product development'],
  ['ai-engineering', 'AI Engineering', 'AI & Data', 'ai', 'production AI engineering'],
  ['vibe-coding', 'Vibe Coding', 'AI & Data', 'development', 'AI-assisted application building'],
  ['data-science-pro', 'Data Science Pro', 'AI & Data', 'data', 'end-to-end data science'],
  ['data-analytics-using-python', 'Data Analytics Using Python', 'AI & Data', 'data', 'Python analytics'],
  ['ai-integrated-full-stack', 'AI-Integrated Full Stack', 'Full Stack', 'development', 'AI-integrated full-stack development'],
  ['python-full-stack', 'Python Full Stack', 'Full Stack', 'development', 'Python full-stack applications'],
  ['mern-stack', 'MERN Stack', 'Full Stack', 'development', 'MongoDB, Express, React and Node.js'],
  ['mean-stack', 'MEAN Stack', 'Full Stack', 'development', 'MongoDB, Express, Angular and Node.js'],
  ['react-full-stack', 'React Full Stack', 'Full Stack', 'development', 'React application development'],
  ['net-full-stack', '.NET Full Stack', 'Full Stack', 'development', '.NET full-stack applications'],
  ['java-full-stack-developer-gen-ai', 'Java Full Stack Developer + Gen AI', 'Full Stack', 'development', 'Java full-stack development with generative AI'],
  ['mern-stack-gen-ai', 'MERN Stack + Gen AI', 'Full Stack', 'development', 'MERN applications with generative AI'],
  ['python-training-course', 'Python Training Course', 'Full Stack', 'development', 'Python programming'],
  ['aws-developer-associate', 'AWS Developer Associate', 'Cloud', 'cloud', 'AWS application development'],
  ['aws-certified-solutions-architect', 'AWS Certified Solutions Architect', 'Cloud', 'cloud', 'AWS solutions architecture'],
  ['azure-administrator-az-104', 'Azure Administrator (AZ-104)', 'Cloud', 'cloud', 'Azure administration and AZ-104 objectives'],
  ['azure-solutions-architect-expert-az-305', 'Azure Solutions Architect Expert (AZ-305)', 'Cloud', 'cloud', 'Azure architecture and AZ-305 objectives'],
  ['ai-ml-cloud-engineering', 'AI/ML Cloud Engineering', 'Cloud', 'cloud', 'cloud-hosted AI and ML systems'],
  ['cloud-devops-automation', 'Cloud DevOps & Automation', 'Cloud', 'cloud', 'cloud DevOps and automation'],
  ['cloud-security-compliance', 'Cloud Security & Compliance', 'Cloud', 'security', 'cloud security and compliance'],
  ['google-cloud', 'Google Cloud', 'Cloud', 'cloud', 'Google Cloud architecture and operations'],
  ['aws-solutions-architect', 'AWS Solutions Architect', 'Cloud', 'cloud', 'AWS architecture'],
  ['azure-az-104', 'Azure (AZ-104)', 'Cloud', 'cloud', 'Azure administration'],
  ['azure-az-305', 'Azure AZ-305', 'Cloud', 'cloud', 'Azure solution architecture'],
  ['cloud-devops', 'Cloud DevOps', 'Cloud', 'cloud', 'cloud operations and DevOps'],
  ['internship', 'Internship', 'Programs', 'program', 'a mentored technical internship'],
  ['projects', 'Projects', 'Programs', 'program', 'portfolio projects'],
  ['ethical-hacker-ceh-v13', 'Ethical Hacker (CEH) v13', 'Cyber Security', 'security', 'ethical hacking and CEH v13 objectives'],
  ['ai-genai-for-cybersecurity', 'AI/GenAI for Cybersecurity', 'Cyber Security', 'security', 'AI-assisted cybersecurity'],
  ['cloud-security', 'Cloud Security', 'Cyber Security', 'security', 'cloud security operations'],
  ['cyber-law-grc', 'Cyber Law & GRC', 'Cyber Security', 'security', 'cyber law, governance, risk and compliance'],
  ['cissp', 'CISSP', 'Cyber Security', 'security', 'CISSP security domains'],
  ['ethical-hacker-ceh', 'Ethical Hacker (C|EH)', 'Cyber Security', 'security', 'ethical hacking foundations'],
  ['cyber-security-gen-ai', 'Cyber Security + Gen AI', 'Cyber Security', 'security', 'cybersecurity with generative AI'],
  ['ui-ux-designing', 'UI/UX Designing', 'Design & Digital', 'design', 'user experience and interface design'],
  ['advanced-digital-marketing', 'Advanced Digital Marketing', 'Design & Digital', 'design', 'digital marketing strategy and measurement'],
]

const MODULE_OUTCOMES = ['recognize the core concepts', 'apply a repeatable workflow', 'compare approaches and trade-offs', 'verify quality and handle edge cases', 'communicate decisions with evidence', 'ship a reviewable project outcome']

const PROJECT_OVERRIDES: Record<string, CourseDefinition['projects']> = {
  'generative-ai': [
    { name: 'Grounded AI chatbot', description: 'Build a support chatbot that answers from a small approved knowledge set.', objectives: ['Define supported questions and safe fallback behavior', 'Return source references with answers'], requirements: ['A small versioned document set', 'A relevance and refusal check set'], steps: ['Prepare and chunk source documents.', 'Retrieve relevant evidence for each test query.', 'Generate answers with citations and an abstention path.', 'Evaluate correctness and unsupported claims.'], outcome: 'A demo chatbot with documented grounding limits.', skills: ['prompt and context design', 'retrieval workflows', 'evaluation'] },
    { name: 'Document Q&A workflow', description: 'Create a workflow that extracts and answers questions from uploaded documents.', objectives: ['Validate file types and extraction quality', 'Keep document-level access boundaries'], requirements: ['Sample PDFs or text documents', 'A checklist of expected answers'], steps: ['Extract text and record metadata.', 'Index chunks with access metadata.', 'Retrieve evidence and cite page or section.', 'Test missing evidence and malformed files.'], outcome: 'A reviewable document question-answering prototype.', skills: ['retrieval workflows', 'privacy boundaries', 'error handling'] },
    { name: 'RAG knowledge assistant', description: 'Deliver an end-to-end retrieval-augmented generation capstone.', objectives: ['Compare retrieval configurations', 'Measure grounded answer quality'], requirements: ['Approved corpus', 'Held-out evaluation questions'], steps: ['Build ingestion and retrieval.', 'Add citations, filters and safe abstention.', 'Evaluate relevance, correctness and latency.', 'Present failure cases and next steps.'], outcome: 'A measured RAG application and evaluation report.', skills: ['retrieval workflows', 'evaluation', 'observability'] },
  ],
  'agentic-ai': [
    { name: 'AI research assistant', description: 'Build a bounded assistant that researches a question and returns cited findings.', objectives: ['Use allowlisted tools', 'Cite and verify each claim'], requirements: ['A defined source collection', 'A fixed tool permission list'], steps: ['Plan a small research task.', 'Call approved search and retrieval tools.', 'Verify evidence and generate a cited brief.', 'Test tool failures and unsupported claims.'], outcome: 'A research brief workflow with traceable evidence.', skills: ['tool calling', 'evaluation', 'responsible AI integration'] },
    { name: 'AI workflow automation', description: 'Automate a multi-step task with explicit approvals and recovery paths.', objectives: ['Make side effects idempotent', 'Require confirmation for consequential actions'], requirements: ['A mock workflow API', 'Success and failure scenarios'], steps: ['Define task states and permissions.', 'Implement bounded tool execution.', 'Add confirmation and retry rules.', 'Test duplicate requests and timeouts.'], outcome: 'A safe automation prototype with an audit trail.', skills: ['application architecture', 'tool calling', 'error handling'] },
    { name: 'Multi-agent capstone', description: 'Compare a coordinated specialist workflow with a single-agent baseline.', objectives: ['Separate agent responsibilities', 'Measure quality and orchestration cost'], requirements: ['A reproducible task set', 'A baseline workflow'], steps: ['Define planner and specialist boundaries.', 'Pass structured messages and evidence.', 'Measure completion, latency and failure recovery.', 'Document when a multi-agent design is justified.'], outcome: 'A multi-agent demo backed by a comparative report.', skills: ['agent architecture', 'evaluation', 'observability'] },
  ],
  'data-science': [
    { name: 'Exploratory data analysis', description: 'Investigate a real dataset and explain its quality, patterns and limitations.', objectives: ['Check grain, missingness and outliers', 'Support observations with reproducible analysis'], requirements: ['Documented dataset', 'Question and metric definition'], steps: ['Profile schema and quality.', 'Explore distributions and relationships.', 'Test assumptions and segment results.', 'Present findings, uncertainty and limitations.'], outcome: 'A reproducible notebook and evidence-led analysis.', skills: ['data cleaning', 'statistics', 'visualization'] },
    { name: 'Prediction model', description: 'Train and evaluate a baseline prediction model without leakage.', objectives: ['Use an appropriate split and baseline', 'Explain metric and threshold trade-offs'], requirements: ['Time or entity-aware split plan', 'Metric choice rationale'], steps: ['Prepare features and split data.', 'Train a simple baseline.', 'Evaluate on held-out data and inspect errors.', 'Document threshold, bias and drift risks.'], outcome: 'A validated model report with reproducible evaluation.', skills: ['feature preparation', 'model evaluation', 'sampling and bias'] },
    { name: 'End-to-end data science capstone', description: 'Deliver a repeatable pipeline from business question to measured recommendation.', objectives: ['Keep analysis reproducible', 'Connect model output to a decision'], requirements: ['Stakeholder use case', 'Acceptance criteria and test data'], steps: ['Define the decision and success metric.', 'Build a clean analysis and modeling pipeline.', 'Test performance and limitations.', 'Present a recommendation with next-step monitoring.'], outcome: 'A portfolio-ready data science project and walkthrough.', skills: ['data cleaning', 'model evaluation', 'evidence-based communication'] },
  ],
  'data-science-pro': [
    { name: 'Exploratory data analysis', description: 'Investigate a real dataset and explain its quality, patterns and limitations.', objectives: ['Check grain, missingness and outliers', 'Support observations with reproducible analysis'], requirements: ['Documented dataset', 'Question and metric definition'], steps: ['Profile schema and quality.', 'Explore distributions and relationships.', 'Test assumptions and segment results.', 'Present findings and limitations.'], outcome: 'A reproducible notebook and evidence-led analysis.', skills: ['data cleaning', 'statistics', 'visualization'] },
    { name: 'Prediction model', description: 'Train and evaluate a baseline model with a defensible validation strategy.', objectives: ['Avoid leakage', 'Explain metric selection'], requirements: ['A held-out evaluation plan', 'Baseline comparison'], steps: ['Prepare data and features.', 'Train a baseline.', 'Evaluate error segments.', 'Document limitations and monitoring.'], outcome: 'An evaluated model and decision report.', skills: ['feature preparation', 'model evaluation', 'sampling and bias'] },
    { name: 'End-to-end data science capstone', description: 'Build, evaluate and communicate a reproducible solution to a practical problem.', objectives: ['Connect analysis to a decision', 'Provide repeatable evidence'], requirements: ['A defined use case', 'Acceptance criteria'], steps: ['Frame the problem.', 'Build the pipeline.', 'Validate against held-out evidence.', 'Present trade-offs and next steps.'], outcome: 'A portfolio-ready end-to-end project.', skills: ['data cleaning', 'model evaluation', 'communication'] },
  ],
  'data-analytics': [
    { name: 'SQL and Power BI dashboard', description: 'Build a reliable reporting model and dashboard for a defined business question.', objectives: ['Preserve row grain and metric definitions', 'Make trends and exceptions easy to inspect'], requirements: ['Sample relational dataset', 'Stakeholder metric glossary'], steps: ['Validate keys and join cardinality.', 'Build SQL measures at the correct grain.', 'Create an accessible Power BI layout.', 'Reconcile totals and document refresh behavior.'], outcome: 'A tested dashboard with metric definitions.', skills: ['SQL analysis', 'dashboard design', 'data quality'] },
    { name: 'Business performance analysis', description: 'Explain a performance change with supporting evidence and practical recommendations.', objectives: ['Separate correlation from cause', 'Communicate uncertainty'], requirements: ['Business KPI and time range', 'Comparable segments'], steps: ['Define KPI and baseline.', 'Break down performance by segment.', 'Investigate plausible drivers.', 'Recommend a bounded next action.'], outcome: 'An evidence-based business review.', skills: ['statistics', 'visualization', 'stakeholder communication'] },
    { name: 'Analytics capstone', description: 'Deliver a repeatable SQL and BI workflow from raw data to decision.', objectives: ['Create a reproducible refresh path', 'Validate stakeholder-facing metrics'], requirements: ['Source schema', 'Acceptance test cases'], steps: ['Model the data and define grain.', 'Implement analysis queries.', 'Build a decision-focused dashboard.', 'Document quality checks and limitations.'], outcome: 'A portfolio-ready analytics solution.', skills: ['SQL', 'data quality', 'dashboard design'] },
  ],
  'data-analytics-using-python': [
    { name: 'Python data exploration', description: 'Clean and explore a dataset with pandas and reproducible notebooks.', objectives: ['Profile missingness and outliers', 'Explain findings with charts'], requirements: ['CSV or tabular data', 'Analysis question'], steps: ['Inspect schema and duplicates.', 'Clean values using documented rules.', 'Explore distributions and segments.', 'Summarize evidence and caveats.'], outcome: 'A reproducible analysis notebook.', skills: ['Python', 'pandas', 'visualization'] },
    { name: 'Business metrics dashboard', description: 'Use Python to prepare and validate data for a decision-focused report.', objectives: ['Keep transformations testable', 'Reconcile totals'], requirements: ['Metric definitions', 'Representative edge cases'], steps: ['Load and validate records.', 'Calculate metrics at the proper grain.', 'Create a clear chart or report.', 'Test totals and document refresh steps.'], outcome: 'A repeatable metric report with validation.', skills: ['Python', 'SQL', 'communication'] },
    { name: 'Python analytics capstone', description: 'Create an end-to-end analysis pipeline with documented assumptions.', objectives: ['Make the workflow reproducible', 'Connect results to a decision'], requirements: ['Data source and question', 'Acceptance criteria'], steps: ['Prepare a clean dataset.', 'Analyze and validate measures.', 'Visualize the key findings.', 'Present recommendation and limitations.'], outcome: 'A portfolio-ready Python analytics project.', skills: ['data cleaning', 'analysis', 'evidence-based communication'] },
  ],
  'python-full-stack': [
    { name: 'CRUD application', description: 'Build a full-stack record manager with validation and database persistence.', objectives: ['Define API and schema contracts', 'Handle empty, invalid and duplicate inputs'], requirements: ['Python backend', 'Relational database'], steps: ['Model the domain and constraints.', 'Build create, read, update and delete endpoints.', 'Add validation and ownership checks.', 'Test failure and boundary cases.'], outcome: 'A tested CRUD app with documented API behavior.', skills: ['Python', 'API design', 'database modeling'] },
    { name: 'Authentication system', description: 'Add secure registration, login and per-user resource access.', objectives: ['Separate identity from permissions', 'Protect private endpoints'], requirements: ['User model', 'Credential and session plan'], steps: ['Implement password-safe registration.', 'Add authentication and token/session handling.', 'Enforce object-level ownership.', 'Test unauthorized and cross-user access.'], outcome: 'A secure authentication flow with permission tests.', skills: ['authentication', 'authorization', 'testing'] },
    { name: 'Full-stack web application', description: 'Deliver a Python web app from responsive frontend to production-ready API.', objectives: ['Keep UI and API states consistent', 'Ship with repeatable configuration'], requirements: ['User story and acceptance criteria', 'Deployment environment'], steps: ['Design data model and routes.', 'Build responsive pages and form states.', 'Add tests, logs and secure settings.', 'Deploy and document operations.'], outcome: 'A full-stack app and deployment walkthrough.', skills: ['application architecture', 'API design', 'deployment'] },
  ],
  'vibe-coding-with-ai': [
    { name: 'AI-assisted portfolio website', description: 'Create a responsive portfolio by planning, prompting, inspecting and iterating on AI-generated code.', objectives: ['Keep design decisions intentional', 'Verify accessibility and mobile behavior'], requirements: ['Portfolio goals and reference content', 'Manual review checklist'], steps: ['Write a clear scope and page outline.', 'Generate a small first version with an AI coding assistant.', 'Review code, responsive behavior and keyboard access.', 'Publish and record prompt iterations.'], outcome: 'A responsive portfolio with a documented AI workflow.', skills: ['prompt and context design', 'frontend development', 'quality review'] },
    { name: 'AI-assisted landing page', description: 'Build and measure a landing page with clear audience, offer and conversion goal.', objectives: ['Generate components from precise requirements', 'Test content, layout and form states'], requirements: ['Audience and offer brief', 'Mobile and form acceptance criteria'], steps: ['Define content hierarchy and CTA.', 'Generate the page in reviewable steps.', 'Validate responsive and error states.', 'Measure a test goal and document changes.'], outcome: 'A landing page prototype and iteration log.', skills: ['AI-assisted product development', 'frontend development', 'measurement'] },
    { name: 'AI chatbot and full-stack capstone', description: 'Create an AI-powered app with a frontend, API, persistence and a grounded assistant.', objectives: ['Review generated code and dependencies', 'Add tests and safe fallback behavior'], requirements: ['Scoped product brief', 'Knowledge source and test questions'], steps: ['Plan the UI and backend contract.', 'Build and inspect one feature at a time.', 'Add retrieval, permissions and evaluation.', 'Deploy a tested capstone and explain limitations.'], outcome: 'A full-stack AI app with evidence of human review.', skills: ['AI integration', 'full-stack development', 'testing'] },
  ],
}

function makeCourse([slug, name, category, track, focus]: CourseRow): CourseDefinition {
  const source = TRACKS[track]
  const topics = source.topics.map((topic) => `${topic[0].toUpperCase()}${topic.slice(1)} for ${focus}`)
  const modules = source.modules.map((title, index) => {
    const moduleTopics = topics.slice(index * 5, index * 5 + 5)
    return {
      title,
      description: `Build a practical understanding of ${focus} through structured examples, focused practice and review. By the end, you should be able to ${MODULE_OUTCOMES[index]} in this area.`,
      topics: moduleTopics,
    }
  })
  const summary = `A practical learning path for ${focus}, from core concepts to a reviewable portfolio outcome.`
  const projects = PROJECT_OVERRIDES[slug] ?? [
    ['Foundations case study', `Investigate a focused ${focus} scenario and document a sound baseline.`, 'Frame the problem', 'Record assumptions', 'Present evidence'],
    ['Applied workflow', `Build a small, end-to-end ${focus} workflow that addresses a realistic user or operational need.`, 'Translate requirements into steps', 'Validate important edge cases', 'Document trade-offs'],
    ['Portfolio capstone', `Deliver and explain a complete ${focus} capstone with evidence of quality, safety and iteration.`, 'Plan a scoped milestone', 'Review the result against criteria', 'Prepare a concise walkthrough'],
  ].map(([name, description, ...objectives]) => ({
    name: `${focus}: ${name}`,
    description,
    objectives,
    requirements: [`A clearly stated ${focus} use case`, 'A short plan with measurable acceptance criteria', 'A final result with evidence and limitations'],
    steps: ['Define the audience, goal and constraints.', 'Create a small baseline and test it.', 'Improve the result using feedback and evidence.', 'Document decisions, limitations and next steps.'],
    outcome: `A reviewable ${focus} artifact with a short explanation of its design and evidence.`,
    skills: source.skills.slice(0, 3),
  }))
  return {
    slug, name, category, track, focus, summary,
    introduction: `${name} develops practical skills for ${focus}. Work through core ideas, guided exercises, responsible quality checks and projects that help you explain not only what you built, but why it works.`,
    tools: source.tools,
    skills: source.skills,
    careers: source.careers,
    modules,
    projects,
    faqs: [
      { question: `Who should study ${name}?`, answer: `Learners interested in ${focus} can start with the foundations and progress through the guided modules. Review the course prerequisites with an advisor if you are unsure where to begin.` },
      { question: `What will I practise?`, answer: `You will work through structured exercises, quality checks and practical projects connected to ${focus}.` },
      { question: `How can I prepare for interviews?`, answer: `Use the linked 30-day roadmap to practise one topic, a short interview response and a daily knowledge check at a time.` },
    ],
    days: topics.map((title, index) => ({ title, module: source.modules[Math.floor(index / 5)], focus })),
    hasCoding: !['program', 'design', 'marketing'].includes(track),
  }
}

export const COURSE_CATALOG = ROWS.map(makeCourse)
export const COURSE_CATEGORIES = [...new Set(ROWS.map((row) => row[2]))].map((name) => ({
  name,
  courses: COURSE_CATALOG.filter((course) => course.category === name),
}))
export const COURSE_BY_SLUG = new Map(COURSE_CATALOG.map((course) => [course.slug, course]))
export const COURSE_NAMES = COURSE_CATALOG.map((course) => course.name)
