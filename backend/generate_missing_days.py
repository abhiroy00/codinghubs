#!/usr/bin/env python3
"""Generator for missing prep_content days (up to 30) for every curriculum."""
import json
from pathlib import Path

ROOT = Path("apps/courses/prep_content")


def level_for(day):
    if day <= 10:
        return "Beginner"
    if day <= 20:
        return "Intermediate"
    return "Advanced"


def module_for(day, modules):
    per = max(1, 30 // len(modules))
    return modules[min(len(modules) - 1, (day - 1) // per)]


def dump_json(obj, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def exercise_practice(title, difficulty, objective, statement, deliverable, steps, checklist, sample_answer):
    return {
        "kind": "exercise",
        "title": title,
        "difficulty": difficulty,
        "objective": objective,
        "statement": statement,
        "deliverable": deliverable,
        "steps": steps,
        "checklist": checklist,
        "sample_answer": sample_answer,
    }


def quiz_q(qtype, question, options, answer, explanation, code=None):
    q = {"type": qtype, "question": question, "options": options, "answer": answer, "explanation": explanation}
    if code:
        q["code"] = code
    return q


def build_lesson(course_name, day, topic, module, level, practice, quiz):
    return {
        "day": day,
        "title": topic,
        "module": module,
        "level": level,
        "objectives": [
            f"Explain the key ideas behind {topic}.",
            f"Describe why {topic} matters in {course_name}.",
            f"Apply {topic} to a realistic scenario.",
            f"Identify common pitfalls and how to avoid them.",
            f"Answer interview questions about {topic}.",
        ],
        "definition": f"{topic} is a core concept in {course_name}. It refers to the techniques, principles and practices that let a practitioner work effectively with this topic in real systems.",
        "theory": [
            {
                "heading": f"What {topic} is",
                "body": f"{topic} describes the methods and patterns used within {course_name} to achieve reliable, maintainable results. Understanding it is the foundation for everything built later in this course.",
                "points": [f"{topic} is a named, repeatable concept.", "It has a clear purpose and scope.", "It connects to other course topics."],
            },
            {
                "heading": f"Why {topic} matters",
                "body": f"Without {topic}, systems built with {course_name} are harder to debug, extend and operate. Teams that master this topic ship fewer defects and communicate more clearly about design decisions.",
                "points": [f"Improves reliability and maintainability.", "Reduces debugging time.", "Supports team alignment."],
            },
            {
                "heading": f"How {topic} works",
                "body": f"The mechanism behind {topic} follows a repeatable sequence: understand the requirement, apply the principle, verify the result and refine based on feedback. Each step has checks that keep the work on track.",
                "points": [f"Start from the requirement.", f"Apply the core principle of {topic}.", "Verify the outcome.", "Refine using feedback."],
            },
            {
                "heading": f"Advantages and limitations of {topic}",
                "body": f"{topic} offers structure, clarity and consistency, but it also adds overhead and may be overkill for trivial tasks. Use it when the benefit in reliability outweighs the added effort.",
                "points": [f"Advantages: structure, clarity, consistency.", f"Limitations: added overhead, not always needed.", "Apply judiciously."],
            },
        ],
        "example": {
            "title": f"{topic} in practice",
            "body": f"A concrete illustration of {topic} shows the principle applied to a small, realistic input so the learner can see cause and effect before scaling up.",
            "code": {"language": "python", "source": f"# Example illustrating {topic}\nprint('See the worked walk-through above.')"},
        },
        "use_cases": [
            {"title": "Production systems", "description": f"Applied in real {course_name} systems to keep behaviour predictable."},
            {"title": "Debugging", "description": f"Helps identify where {topic}-related assumptions break down."},
            {"title": "Interviews", "description": f"A common topic for {course_name} interview questions."},
        ],
        "demonstration": {
            "description": f"A short walk-through of {topic} with expected input and output, showing the principle end to end.",
            "code": {"language": "python", "source": f"# Demonstration of {topic}\nprint('walkthrough output')"},
            "output": "expected demonstration output",
        },
        "takeaways": [
            f"{topic} is a foundational concept in {course_name}.",
            f"It follows a clear, repeatable mechanism.",
            f"It improves reliability when applied appropriately.",
            f"Know the advantages and limitations before using it.",
        ],
        "interview": [
            {
                "question": f"What is {topic}?",
                "answer": f"{topic} is a core concept in {course_name} that describes the techniques used to work effectively with this area.",
                "explanation": "Give a concise, accurate definition and one example.",
            },
            {
                "question": f"Why is {topic} important?",
                "answer": f"It improves reliability, maintainability and clarity in {course_name} systems.",
                "explanation": "Connect to a concrete benefit.",
            },
            {
                "question": f"What are the limitations of {topic}?",
                "answer": f"It adds overhead and may be unnecessary for simple cases; apply it judiciously.",
                "explanation": "Show balanced judgment.",
            },
            {
                "question": f"How would you explain {topic} to a junior teammate?",
                "answer": f"Start with the definition, show a small example, then walk through a realistic use case and its trade-offs.",
                "explanation": "Structure the explanation from simple to applied.",
            },
        ],
        "practice": practice,
        "quiz": quiz,
    }


def quiz_list(qs):
    return qs


COURSE_TOPICS = {
    "agentic-ai": [
        "Memory Systems for Agents", "Short-Term vs Long-Term Memory", "Vector Memory and Retrieval", "Conversation Summarisation", "Memory Pruning and Decay",
        "Tool Design and Schemas", "Safe Tool Execution", "Tool Composition and Chaining", "Tool Failure Handling", "MCP Protocol Basics",
        "MCP Client and Server", "MCP Resource and Tool Discovery", "MCP Security Boundaries", "Graph Workflows", "State Machines for Agents",
        "Conditional Branching in Agents", "Loops and Retries in Graphs", "Multi-Agent Orchestration", "Planner-Executor Pattern", "Critic-Reviser Pattern",
        "Debate and Consensus Patterns", "Handoffs Between Agents", "Shared Blackboard Communication", "Prompt Injection Defence", "Input Sanitisation for Agents",
        "Output Sanitisation and Allowlisting", "Rate Limiting and Cost Guards", "Agent Evaluation Metrics", "Tracing and Observability", "Agent System Design and Capstone",
    ],
    "ai-engineering": [
        "MLOps for AI Systems", "Model Packaging and Serialisation", "Containerising AI Models", "Model Serving with Batching", "Canary Deployment for Models",
        "A/B Testing Model Versions", "Feature Store Basics", "Online vs Offline Feature Serving", "Data Drift Detection", "Model Drift Monitoring",
        "Alerting on Model Performance", "Rollback Strategies for AI", "Cost Tracking per Inference", "Latency SLAs for AI Endpoints", "Auto-scaling AI Workers",
        "GPU vs CPU Workload Placement", "Quantisation for Inference", "Distillation of Large Models", "Edge Deployment of AI", "Model Governance and Compliance",
        "Audit Logs for AI Decisions", "Data Lineage for AI Pipelines", "Reproducible Model Training", "Experiment Tracking", "AI System Design and Capstone",
    ],
    "ai-full-stack": [
        "Frontend Integration with AI APIs", "Streaming AI Responses to UI", "Handling AI Loading States", "Optimistic UI for AI Actions", "Error Boundaries for AI",
        "AI-First Form Design", "Client-Side Model Caching", "Offline-First AI Interfaces", "Accessibility in AI UIs", "Responsive AI Dashboards",
        "Full-Stack AI Authentication", "Per-User AI Quotas", "AI Usage Billing Integration", "API Gateway for AI Services", "Webhook Handling for AI",
        "Background Jobs for AI Tasks", "Task Queues for Heavy Models", "Result Caching for AI", "CDN for Model Assets", "Full-Stack AI Testing",
        "End-to-End AI Flows", "AI Feature Flags", "Gradual Rollout of AI", "AI Incident Response", "AI Full-Stack Capstone Project",
    ],
    "aws-developer": [
        "AWS IAM Roles and Policies", "AWS Lambda Basics", "AWS API Gateway Integration", "AWS DynamoDB Basics", "AWS S3 Storage",
        "AWS CloudWatch Monitoring", "AWS X-Ray Tracing", "AWS Step Functions", "AWS Secrets Manager", "AWS Parameter Store",
        "AWS SQS and SNS", "AWS EventBridge", "AWS CodeDeploy Basics", "AWS CloudFormation Basics", "AWS CDK Basics",
        "AWS Well-Architected Framework", "AWS Cost Optimisation", "AWS Security Best Practices", "AWS High Availability Design", "AWS Developer Associate Capstone",
    ],
    "aws-solutions-architect": [
        "AWS VPC Design", "AWS Subnets and Routing", "AWS Load Balancers", "AWS Auto Scaling Groups", "AWS RDS Basics",
        "AWS Aurora vs RDS", "AWS ElastiCache", "AWS CloudFront", "AWS Route 53", "AWS Shield and WAF",
        "AWS Organisations and Control Tower", "AWS Multi-Account Strategy", "AWS Disaster Recovery", "AWS Backup Strategies", "AWS Migration Strategies",
        "AWS Well-Architected Pillars", "AWS Cost Allocation Tags", "AWS Compute Optimiser", "AWS Trusted Advisor", "AWS Solutions Architect Capstone",
    ],
    "azure-administrator": [
        "Azure Identity and Access", "Azure Role-Based Access Control", "Azure Virtual Networks", "Azure Subnets and NSGs", "Azure Storage Accounts",
        "Azure Virtual Machines", "Azure VM Scale Sets", "Azure App Service", "Azure Functions", "Azure Container Instances",
        "Azure Kubernetes Service Basics", "Azure SQL Database", "Azure Cosmos DB Basics", "Azure Monitor", "Azure Alerts",
        "Azure Backup", "Azure Site Recovery", "Azure Policy", "Azure Blueprints", "Azure Administrator AZ-104 Capstone",
    ],
    "data-analytics-python": [
        "pandas DataFrames Basics", "Data Cleaning with pandas", "Handling Missing Values", "Data Type Conversion", "Filtering and Querying",
        "GroupBy and Aggregation", "Merging and Joining Data", "Pivot Tables and Crosstabs", "Time Series Basics", "Resampling and Rolling Windows",
        "Data Visualisation with Matplotlib", "Seaborn Statistical Plots", "Interactive Plots with Plotly", "Exploratory Data Analysis", "SQL with Python",
        "Reading Multiple File Formats", "Data Validation Rules", "Profiling Data Quality", "Automating Reports", "Python Analytics Capstone",
    ],
    "data-analytics": [
        "SQL Advanced Joins", "Window Functions in SQL", "CTEs and Temporary Tables", "Data Modelling Basics", "Star Schema Design",
        "Snowflake Schema Design", "Slowly Changing Dimensions", "ETL vs ELT", "Data Pipeline Scheduling", "Data Quality Checks",
        "Dashboard Design Principles", "KPI Definition", "Metric Granularity", "Drill-Through Reports", "Data Storytelling",
        "Executive Dashboards", "Self-Service Analytics", "Data Governance Basics", "Data Lineage Documentation", "Data Analytics Capstone",
    ],
    "data-science": [
        "Probability Basics for Data Science", "Distributions and Sampling", "Hypothesis Testing", "P-Values and Significance", "Correlation vs Causation",
        "Linear Regression Basics", "Logistic Regression", "Decision Trees", "Random Forests", "Gradient Boosting",
        "Model Evaluation Metrics", "Cross-Validation", "Overfitting and Underfitting", "Feature Selection", "Feature Engineering",
        "Handling Imbalanced Data", "Pipeline Construction", "Model Serialisation", "Model Deployment Basics", "Data Science Capstone",
    ],
    "dotnet-full-stack": [
        "ASP.NET Core Basics", "Middleware Pipeline", "Dependency Injection", "Entity Framework Core", "Code-First Migrations",
        "Repository Pattern", "Unit of Work", "ASP.NET Core Web API", "API Versioning", "Authentication with JWT",
        "Authorization Policies", "Blazor Basics", "SignalR Real-Time", "Background Services", "Health Checks",
        "Logging with Serilog", "Configuration Management", "Secret Management", "Docker for .NET", ".NET Full-Stack Capstone",
    ],
    "generative-ai": [],  # already complete (30 days)
    "java-full-stack-genai": [
        "Spring Boot Basics", "REST Controllers in Spring", "Spring Data JPA", "Database Migrations with Flyway", "Spring Security Basics",
        "JWT Authentication in Java", "Integrating Java with LLM APIs", "Spring AI Basics", "Prompt Templates in Java", "Streaming Responses in Java",
        "Vector Store with Spring AI", "RAG in Java", "Function Calling in Java", "Testing Spring AI Apps", "Java Full-Stack GenAI Capstone",
    ],
    "mean-stack": [
        "Angular Components", "Angular Services", "Angular Routing", "Angular Forms", "Angular HTTP Client",
        "Node.js Express Basics", "Express Middleware", "MongoDB Basics", "Mongoose ODM", "REST API Design",
        "JWT Auth in MEAN", "MEAN File Upload", "MEAN Image Processing", "MEAN Real-Time with Socket.io", "MEAN Testing",
        "MEAN Deployment", "MEAN Performance", "MEAN Security", "MEAN Capstone Project",
    ],
    "mern-genai": [
        "React with GenAI", "MERN Backend for AI", "MongoDB Vector Search", "LangChain in Node.js", "RAG with MERN",
        "Streaming AI in React", "GenAI Authentication", "AI API Routes in Express", "Prompt Management", "AI Caching in MERN",
        "MERN GenAI Testing", "MERN GenAI Deployment", "MERN GenAI Capstone",
    ],
    "mern-stack": [
        "React Components", "React Hooks", "React Routing", "Node.js Express", "MongoDB Basics",
        "Mongoose Schemas", "REST APIs with Express", "JWT Auth in MERN", "File Upload", "Image Processing",
        "MERN Testing", "MERN Deployment", "MERN Capstone",
    ],
    "prompt-engineering": [
        "System Prompt Design", "Few-Shot Prompting Patterns", "Chain-of-Thought Prompting", "ReAct Prompting", "Prompt Chaining",
        "Role Prompting", "Delimiter Use", "Output Format Constraints", "Prompt Versioning", "Prompt A/B Testing",
        "Prompt Injection Defence", "Prompt Templates", "Dynamic Prompt Construction", "Multilingual Prompting", "Prompt Engineering Capstone",
    ],
    "python-full-stack": [
        "Django Basics", "Django Models", "Django Views and URLs", "Django Templates", "Django Forms",
        "Django REST Framework", "DRF Serialisers", "DRF Authentication", "DRF Permissions", "PostgreSQL with Django",
        "Django Admin Customisation", "Django Signals", "Django Caching", "Django Background Tasks", "Django Testing",
        "Django Deployment", "Docker for Django", "CI/CD for Python", "Python Full-Stack Capstone",
    ],
    "python-programming": [
        "Functions and Modules", "Object-Oriented Programming", "Classes and Objects", "Inheritance and Polymorphism", "Dunder Methods",
        "Iterators and Generators", "Context Managers", "Decorators", "Exception Handling", "File I/O",
        "Working with JSON and CSV", "Virtual Environments", "pip and Package Management", "Testing with unittest", "pytest Basics",
        "Type Hinting", "Logging in Python", "Concurrency with threading", "Concurrency with asyncio", "Python Programming Capstone",
    ],
    "react-full-stack": [
        "React Hooks Deep Dive", "Context API", "React Router", "State Management", "Forms in React",
        "React Testing Library", "React Performance", "React Deployment", "Next.js Basics", "API Routes in Next.js",
        "Server-Side Rendering", "Static Site Generation", "Authentication in React", "Protected Routes", "React Full-Stack Capstone",
    ],
    "vibe-coding": [
        "AI Code Generation Basics", "Prompting for Code", "Reviewing AI-Generated Code", "Refactoring AI Output", "Testing AI Code",
        "AI-Assisted Debugging", "AI Pair Programming", "AI for Documentation", "AI for Commit Messages", "AI Code Review",
        "AI Security Review", "AI Dependency Analysis", "AI Performance Tuning", "AI Deployment Assistance", "Vibe Coding Capstone",
    ],
}


def course_topics(slug, name, n):
    base = COURSE_TOPICS.get(slug, [])
    if not base:
        base = [f"{name} topic {i}" for i in range(1, n + 1)]
    while len(base) < n:
        base.append(f"{name} advanced topic {len(base) + 1}")
    return base[:n]


def make_practice(day, topic, level, course_name):
    diff = "Basic" if day <= 10 else ("Intermediate" if day <= 20 else "Advanced")
    return exercise_practice(
        f"Apply: {topic}",
        diff,
        f"Apply {topic} through a practical exercise.",
        f"Complete a practical exercise that demonstrates {topic}. Describe your approach, the steps you took and how you verified the result.",
        f"A short written answer or artefact showing your work on {topic}.",
        [
            f"Restate the goal of {topic} in your own words.",
            f"List the inputs, steps and expected outputs for {topic}.",
            f"Work through one concrete example by hand or with code.",
            f"Note one edge case and how you handle it.",
            f"Write a one-paragraph summary of what you learned.",
        ],
        [
            "The deliverable addresses the stated goal.",
            "Steps are concrete and reproducible.",
            "At least one edge case is identified and handled.",
            "The summary reflects genuine understanding.",
        ],
        f"Sample answer: Explain {topic} with a definition, one worked example, an edge case and a real-world use case. The answer shows the learner can apply {topic} in {course_name}.",
    )


def make_quiz(day, topic, course_name):
    return quiz_list([
        quiz_q("concept", f"What is {topic}?", [f"The core idea of {topic}", "An unrelated concept", "A hardware device", "A programming language"], 0, f"{topic} is defined as the core idea above."),
        quiz_q("concept", f"Why is {topic} important?", ["It improves reliability", "It slows things down", "It is never used", "It is only theory"], 0, f"{topic} improves reliability and clarity."),
        quiz_q("scenario", f"A system ignores {topic}. What is the likely result?", ["More defects", "Faster performance", "No effect", "Lower cost"], 0, f"Ignoring {topic} leads to more defects."),
        quiz_q("output", f"What does a correct {topic} implementation produce?", ["A reliable result", "Random output", "An error", "Nothing"], 0, f"A correct implementation produces a reliable result."),
        quiz_q("concept", f"Which is a limitation of {topic}?", ["Added overhead", "No benefit", "Always required", "No cost"], 0, f"{topic} adds overhead but brings reliability."),
    ])


def generate_for_curriculum(folder):
    meta_path = folder / "_meta.json"
    if not meta_path.exists():
        return
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    existing_days = []
    for d in range(1, 31):
        p = folder / f"day-{d:02d}.json"
        if p.exists():
            existing_days.append((d, json.loads(p.read_text(encoding="utf-8"))))
    if not existing_days:
        return
    max_day = max(d for d, _ in existing_days)
    if max_day >= 30:
        return
    modules = []
    seen = []
    for d, lesson in existing_days:
        m = lesson["module"]
        if m not in seen:
            seen.append(m)
            modules.append(m)
    if not modules:
        modules = ["Foundations"]
    course_name = meta["title"]
    slug = meta["curriculum"]
    topics = course_topics(slug, course_name, 30)
    created = 0
    for day in range(max_day + 1, 31):
        topic = topics[day - 1]
        module = module_for(day, modules)
        level = level_for(day)
        practice = make_practice(day, topic, level, course_name)
        quiz = make_quiz(day, topic, course_name)
        lesson = build_lesson(course_name, day, topic, module, level, practice, quiz)
        dump_json(lesson, folder / f"day-{day:02d}.json")
        created += 1
    print(f"{slug}: created {created} days ({max_day + 1} to 30)")


def main():
    folders = [p for p in ROOT.iterdir() if p.is_dir() and (p / "_meta.json").exists()]
    for folder in folders:
        generate_for_curriculum(folder)


if __name__ == "__main__":
    main()
