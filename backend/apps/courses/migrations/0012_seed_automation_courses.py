"""Adds the Automation & Testing courses as admin-managed courses (editable in the admin panel afterwards).

Only missing slugs are created, so later admin edits are never overwritten. No fees, durations or outcomes are set:
the team fills those in the admin panel. DevOps/CI-CD automation is already covered by the catalogue course
/courses/cloud-devops-automation/, so it is not duplicated here.
"""
from django.db import migrations

CATEGORY = {'name': 'Automation & Testing', 'slug': 'automation-testing', 'order': 5, 'color': '#0d9488',
            'tagline': 'Test automation, Python scripting, RPA and AI workflow automation'}

FAQ_DEMO = {'question': 'Can I attend a class before joining?',
            'answer': 'Yes. Book the free 2-hour live online demo from the home page, then ask the team about current batch formats, schedules and fees.'}

COURSES = [
    {
        'slug': 'automation-testing', 'name': 'Automation Testing', 'level': 'Beginner',
        'summary': 'Learn software testing and test automation with Selenium, Playwright and API testing, from test design to CI pipelines.',
        'meta_description': 'Automation Testing course at Coding Hubs, Delhi: manual testing basics, Selenium, Playwright, API testing, test frameworks and CI pipelines.',
        'introduction': (
            'Automation testing uses code to check that software works, every time it changes. Instead of clicking through '
            'the same screens by hand, a test engineer writes scripts that open the application, perform actions and verify the results.\n'
            'This course starts with testing fundamentals, then moves to browser automation with Selenium and Playwright, API testing, '
            'test frameworks, reporting and running tests automatically in a CI pipeline. You finish with an automation framework you can show in interviews.'),
        'tools': ['Selenium WebDriver', 'Playwright', 'Java or Python', 'TestNG / pytest', 'Postman', 'REST Assured', 'Git', 'GitHub Actions / Jenkins'],
        'skills': ['Test case design', 'Browser automation', 'API testing', 'Page Object Model frameworks', 'Test reporting', 'CI test pipelines'],
        'careers': ['QA engineer', 'Automation test engineer', 'SDET (software development engineer in test)', 'QA analyst'],
        'modules': [
            {'title': 'Software testing fundamentals', 'description': 'How testing fits into software delivery and how to design good tests.',
             'topics': ['SDLC and STLC', 'Test levels and types', 'Writing test cases and test data', 'Bug life cycle and reporting', 'Agile testing basics']},
            {'title': 'Programming for testers', 'description': 'Enough Java or Python to write clean, maintainable automation code.',
             'topics': ['Variables, conditions and loops', 'Functions and classes', 'Collections and exceptions', 'Reading test data files', 'Git for test code']},
            {'title': 'Selenium WebDriver', 'description': 'Automate real browsers reliably.',
             'topics': ['Locators: ID, CSS and XPath', 'Waits and synchronisation', 'Forms, dropdowns, alerts and frames', 'Screenshots and logs', 'Cross-browser runs']},
            {'title': 'Playwright and modern web testing', 'description': 'Fast, reliable end-to-end tests for modern web apps.',
             'topics': ['Auto-waiting and locators', 'Network mocking', 'Parallel test runs', 'Traces and debugging', 'Mobile viewport testing']},
            {'title': 'API testing', 'description': 'Test services directly, faster than through the UI.',
             'topics': ['HTTP methods and status codes', 'Postman collections', 'Automated API tests in code', 'Schema and response validation', 'Authentication tokens']},
            {'title': 'Frameworks, reporting and CI', 'description': 'Turn scripts into a framework a team can run every day.',
             'topics': ['Page Object Model', 'Data-driven tests', 'Test reports', 'Running tests in GitHub Actions or Jenkins', 'Flaky test handling']},
        ],
        'projects': [
            {'name': 'E-commerce UI test suite', 'description': 'Automate login, search, cart and checkout flows of a demo store with Selenium and the Page Object Model.', 'skills': ['Selenium', 'POM', 'Test data']},
            {'name': 'API test framework', 'description': 'Build automated tests for a public REST API with validation of status codes, schemas and error cases.', 'skills': ['API testing', 'Assertions', 'Reports']},
            {'name': 'CI test pipeline', 'description': 'Run a Playwright suite on every push with GitHub Actions and publish an HTML report.', 'skills': ['Playwright', 'CI', 'Reporting']},
        ],
        'faqs': [
            {'question': 'Do I need coding knowledge for automation testing?', 'answer': 'No prior coding is required. The course teaches the Java or Python you need before starting automation tools.'},
            {'question': 'Selenium or Playwright: which will I learn?', 'answer': 'Both. Selenium is widely used in existing projects, and Playwright is popular for modern web applications.'},
            {'question': 'Is manual testing covered?', 'answer': 'Yes. Testing fundamentals, test case design and bug reporting are covered first, because good automation depends on them.'},
            FAQ_DEMO,
        ],
    },
    {
        'slug': 'ai-workflow-automation', 'name': 'AI Workflow Automation', 'level': 'Beginner',
        'summary': 'Automate business workflows with n8n, Make and Zapier plus AI: lead handling, emails, documents, reports and AI agents.',
        'meta_description': 'AI Workflow Automation course at Coding Hubs, Delhi: n8n, Make, Zapier, LLM APIs and AI agents to automate leads, emails, documents and reports.',
        'introduction': (
            'AI workflow automation connects the apps a business already uses (forms, email, spreadsheets, CRMs, chat) and adds AI '
            'steps that read, summarise, classify or draft. A new enquiry can be captured, scored, answered and logged without anyone copying data by hand.\n'
            'This course teaches you to design, build and maintain these workflows with no-code and low-code tools, call AI models safely, '
            'and know when a workflow should hand over to a person.'),
        'tools': ['n8n', 'Make', 'Zapier', 'LLM APIs', 'Google Sheets', 'Webhooks and REST APIs', 'Gmail / Outlook', 'Basic JavaScript or Python'],
        'skills': ['Workflow design', 'App integrations with APIs and webhooks', 'AI steps: summarise, classify, extract, draft', 'Error handling and monitoring', 'Data privacy in automation'],
        'careers': ['Automation specialist', 'AI operations executive', 'No-code / low-code developer', 'Business process analyst'],
        'modules': [
            {'title': 'Automation foundations', 'description': 'Find processes worth automating and map them clearly.',
             'topics': ['Triggers, actions and data', 'Process mapping', 'Choosing a tool', 'Costs and limits', 'When not to automate']},
            {'title': 'No-code automation tools', 'description': 'Build real workflows in n8n, Make and Zapier.',
             'topics': ['Connecting apps', 'Filters and routers', 'Loops and iterators', 'Scheduling', 'Testing workflows']},
            {'title': 'APIs and webhooks', 'description': 'Connect anything that has an API.',
             'topics': ['HTTP requests', 'JSON data', 'Authentication and API keys', 'Webhooks', 'Small code steps']},
            {'title': 'Adding AI to workflows', 'description': 'Use language models as reliable steps.',
             'topics': ['Prompt design for automation', 'Classification and extraction', 'Structured outputs', 'Summaries and drafts', 'Checking AI output']},
            {'title': 'AI agents and human review', 'description': 'Let AI take multi-step actions with guardrails.',
             'topics': ['Agents and tools', 'Approval steps', 'Limits and logging', 'Handling failures', 'Prompt injection risks']},
            {'title': 'Operating automations', 'description': 'Keep workflows reliable once they run every day.',
             'topics': ['Error alerts', 'Retries', 'Documentation', 'Data privacy and consent', 'Measuring time saved']},
        ],
        'projects': [
            {'name': 'Lead capture and follow-up', 'description': 'Capture form enquiries, classify them with AI, log them in a sheet and send a tailored first reply for review.', 'skills': ['Webhooks', 'AI classification', 'Email']},
            {'name': 'Document to data pipeline', 'description': 'Extract fields from invoices or resumes into a spreadsheet with AI and flag low-confidence results.', 'skills': ['Extraction', 'Validation', 'Sheets']},
            {'name': 'Weekly report assistant', 'description': 'Collect data from several sources and email a summarised weekly report automatically.', 'skills': ['Scheduling', 'APIs', 'Summaries']},
        ],
        'faqs': [
            {'question': 'Do I need to know programming?', 'answer': 'No. Most workflows are built with no-code tools. Basic JavaScript or Python is introduced for small custom steps.'},
            {'question': 'Which tools are covered?', 'answer': 'n8n, Make and Zapier for workflows, plus language model APIs for AI steps.'},
            {'question': 'Who is this course for?', 'answer': 'Students, business and marketing professionals, operations teams and developers who want to automate repetitive work.'},
            FAQ_DEMO,
        ],
    },
    {
        'slug': 'python-automation', 'name': 'Python Automation', 'level': 'Beginner',
        'summary': 'Use Python to automate everyday work: files, Excel and PDF reports, emails, web data, browser tasks and scheduled jobs.',
        'meta_description': 'Python Automation course at Coding Hubs, Delhi: automate files, Excel and PDF reports, emails, web scraping, browser tasks and scheduled jobs.',
        'introduction': (
            'Python is the most popular language for automating repetitive computer work. A short script can rename hundreds of files, '
            'merge Excel sheets into a report, send emails or collect data from websites in seconds.\n'
            'This course teaches Python from the basics with automation as the goal, so every topic ends in a tool you can use at work or in college.'),
        'tools': ['Python', 'pandas', 'openpyxl', 'pypdf', 'requests', 'BeautifulSoup', 'Playwright / Selenium', 'Task Scheduler / cron'],
        'skills': ['Python programming', 'File and folder automation', 'Excel and PDF reporting', 'Web data collection', 'Browser automation', 'Scheduling and logging'],
        'careers': ['Python developer (automation)', 'Automation engineer', 'Data operations analyst', 'MIS / reporting executive'],
        'modules': [
            {'title': 'Python foundations', 'description': 'The Python you need, taught through small tools.',
             'topics': ['Variables and data types', 'Conditions and loops', 'Functions', 'Lists and dictionaries', 'Errors and debugging']},
            {'title': 'Files and folders', 'description': 'Organise and transform files automatically.',
             'topics': ['pathlib and shutil', 'Bulk rename and move', 'CSV and JSON', 'Zip and backups', 'Logging what changed']},
            {'title': 'Excel and PDF reports', 'description': 'Turn raw data into finished reports.',
             'topics': ['pandas basics', 'Merging sheets', 'Formatted Excel output', 'Merging and splitting PDFs', 'Charts']},
            {'title': 'Email and messaging', 'description': 'Send reports and reminders safely.',
             'topics': ['smtplib and email', 'Attachments', 'Templates', 'App passwords and environment variables', 'Rate limits']},
            {'title': 'Web data and browsers', 'description': 'Collect data and automate web tasks responsibly.',
             'topics': ['requests and APIs', 'BeautifulSoup', 'Playwright browser automation', 'Robots.txt and terms', 'Saving results']},
            {'title': 'Scheduling and reliability', 'description': 'Make scripts run on their own and fail safely.',
             'topics': ['Task Scheduler and cron', 'Configuration files', 'Error handling', 'Dry-run mode', 'Packaging scripts']},
        ],
        'projects': [
            {'name': 'Monthly sales report generator', 'description': 'Merge several CSV files into a formatted Excel report with totals and a chart, emailed automatically.', 'skills': ['pandas', 'openpyxl', 'Email']},
            {'name': 'Downloads organiser', 'description': 'Sort files into folders by type and date, with a log and a dry-run option.', 'skills': ['pathlib', 'Logging', 'Scheduling']},
            {'name': 'Price tracker', 'description': 'Track prices of chosen products from a site that permits it and alert when they drop.', 'skills': ['requests', 'Parsing', 'Alerts']},
        ],
        'faqs': [
            {'question': 'Is this course suitable for complete beginners?', 'answer': 'Yes. It starts with Python basics and applies each concept to a practical automation task.'},
            {'question': 'How is this different from the Python Training Course?', 'answer': 'The Python Training Course is a general programming course. Python Automation focuses on scripts for files, reports, email, web data and browsers.'},
            {'question': 'Is web scraping covered legally and safely?', 'answer': 'Yes. You learn to check terms of use and robots.txt, prefer official APIs and avoid personal data.'},
            FAQ_DEMO,
        ],
    },
    {
        'slug': 'rpa-automation', 'name': 'RPA with UiPath and Power Automate', 'level': 'Beginner',
        'summary': 'Robotic Process Automation with UiPath and Microsoft Power Automate: automate office and back-office processes end to end.',
        'meta_description': 'RPA course at Coding Hubs, Delhi: UiPath and Power Automate bots for Excel, email, PDFs, web and desktop apps, with exception handling and deployment.',
        'introduction': (
            'Robotic Process Automation (RPA) uses software robots to do rule-based office work: reading emails, entering data into '
            'applications, processing invoices and generating reports, exactly as a person would, but faster and without typing errors.\n'
            'This course teaches UiPath and Microsoft Power Automate from the ground up, including how to choose processes, build robust bots, '
            'handle exceptions and deploy bots that run on schedule.'),
        'tools': ['UiPath Studio', 'UiPath Orchestrator (concepts)', 'Power Automate Desktop', 'Power Automate cloud flows', 'Excel', 'Outlook', 'PDF and OCR activities'],
        'skills': ['Process assessment', 'Bot design', 'Excel, email and PDF automation', 'Web and desktop UI automation', 'Exception handling', 'Bot deployment and scheduling'],
        'careers': ['RPA developer', 'RPA analyst', 'Automation engineer', 'Process automation consultant'],
        'modules': [
            {'title': 'RPA foundations', 'description': 'Understand where RPA fits and which processes to automate.',
             'topics': ['What RPA is and is not', 'Process selection', 'Process design documents', 'Attended vs unattended bots', 'Return on effort']},
            {'title': 'UiPath Studio basics', 'description': 'Build your first bots.',
             'topics': ['Sequences and flowcharts', 'Variables and arguments', 'Control flow', 'Selectors', 'Debugging']},
            {'title': 'Data, Excel and email automation', 'description': 'Automate the most common office tasks.',
             'topics': ['Excel activities', 'Data tables', 'Reading and sending email', 'PDF data extraction', 'OCR basics']},
            {'title': 'Power Automate', 'description': 'Automate with Microsoft tools.',
             'topics': ['Desktop flows', 'Cloud flows', 'Connectors', 'Approvals', 'Scheduling']},
            {'title': 'Robust bots', 'description': 'Make bots reliable in real offices.',
             'topics': ['Exception handling', 'Retry scopes', 'Logging', 'Configuration files', 'REFramework concepts']},
            {'title': 'Deployment and maintenance', 'description': 'Run bots safely in production.',
             'topics': ['Orchestrator concepts', 'Queues and triggers', 'Credentials and security', 'Monitoring', 'Change management']},
        ],
        'projects': [
            {'name': 'Invoice processing bot', 'description': 'Read invoices from email, extract fields from PDFs, enter them into Excel and flag exceptions for review.', 'skills': ['Email', 'PDF extraction', 'Excel']},
            {'name': 'Web form data entry bot', 'description': 'Enter records from a spreadsheet into a web application and produce a success and error report.', 'skills': ['UI automation', 'Selectors', 'Logging']},
            {'name': 'Approval workflow with Power Automate', 'description': 'Route requests for approval, notify the requester and log decisions.', 'skills': ['Cloud flows', 'Approvals', 'Connectors']},
        ],
        'faqs': [
            {'question': 'Do I need programming knowledge for RPA?', 'answer': 'No. UiPath and Power Automate are visual tools. Basic logic is taught in the course; programming helps but is not required.'},
            {'question': 'Which RPA tools are covered?', 'answer': 'UiPath Studio and Microsoft Power Automate (desktop and cloud flows).'},
            {'question': 'Who should learn RPA?', 'answer': 'Graduates from any stream, operations and finance professionals, and developers who want to automate business processes.'},
            FAQ_DEMO,
        ],
    },
]


def seed(apps, schema_editor):
    from django.conf import settings
    if getattr(settings, 'TESTING', False):
        return
    Category = apps.get_model('courses', 'CourseCategory')
    Course = apps.get_model('courses', 'Course')
    db = schema_editor.connection.alias
    category = Category.objects.using(db).filter(slug=CATEGORY['slug']).first()
    if category is None:
        category = Category.objects.using(db).create(**CATEGORY)
    for order, data in enumerate(COURSES):
        if Course.objects.using(db).filter(slug=data['slug']).exists():
            continue
        Course.objects.using(db).create(category=category, is_custom=True, is_active=True, placement_rate=0, order=order, **data)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0011_admin_managed_courses'),
    ]

    operations = [
        migrations.RunPython(seed, migrations.RunPython.noop),
    ]
