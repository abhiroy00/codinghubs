from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.courses.models import Course, CourseCategory

CATEGORIES = [
    {
        'name': 'AI & Data',
        'color': '#4f46e5',
        'tagline': 'Become an AI engineer, not just an AI user.',
        'description': 'Generative AI, Agentic AI, LLMs and Machine Learning — from prompt to production.',
        'courses': ['Generative AI', 'Agentic AI', 'Prompt Engineering', 'AI Engineering Diploma', 'Data Science', 'Data Analytics'],
    },
    {
        'name': 'Full Stack',
        'color': '#0ea5a4',
        'tagline': 'Build products end to end.',
        'description': 'Frontend, backend, databases and AI integrations — the stack companies hire for.',
        'courses': ['AI-Integrated Full Stack', 'Python Full Stack', 'MERN Stack', 'MEAN Stack', 'React Full Stack', '.NET Full Stack'],
    },
    {
        'name': 'Cloud',
        'color': '#7c6cf0',
        'tagline': 'Run what the world builds.',
        'description': 'Certification-ready AWS, Azure and Google Cloud tracks, with DevOps built in.',
        'courses': ['AWS Solutions Architect', 'AWS Developer Associate', 'Azure AZ-104', 'Azure AZ-305', 'Google Cloud', 'Cloud DevOps'],
    },
    {
        'name': 'Cyber Security',
        'color': '#e11d48',
        'tagline': 'Defend what matters.',
        'description': 'Ethical hacking, SOC operations and governance — including AI for cybersecurity.',
        'courses': ['Ethical Hacker (C|EH) v13', 'AI/GenAI for Cybersecurity', 'Cloud Security', 'Cyber Law & GRC', 'CISSP'],
    },
]

# Pulled from the "Compare programs" numbers on the static site. Everything
# else gets a placeholder — correct via Django admin before going live.
OVERRIDES = {
    'AI Engineering Diploma': ('6 months', 95, '₹8–18 LPA', 24999),
    'AI-Integrated Full Stack': ('6 months', 94, '₹7–16 LPA', 22999),
    'Data Science': ('4 months', 92, '₹6–14 LPA', 19999),
    'MERN Stack': ('4 months', 90, '₹5–12 LPA', 16999),
    'AWS Solutions Architect': ('3 months', 88, '₹10–22 LPA', 18999),
    'Ethical Hacker (C|EH) v13': ('3 months', 87, '₹8–20 LPA', 17999),
}
DEFAULT_PLACEHOLDER = ('3 months', 85, '₹5–12 LPA', 9999)


class Command(BaseCommand):
    help = 'Seed course categories and courses from the original static site content.'

    @transaction.atomic
    def handle(self, *args, **options):
        for order, cat_data in enumerate(CATEGORIES):
            category, _ = CourseCategory.objects.update_or_create(
                slug=slugify(cat_data['name']),
                defaults={
                    'name': cat_data['name'],
                    'color': cat_data['color'],
                    'tagline': cat_data['tagline'],
                    'description': cat_data['description'],
                    'order': order,
                },
            )
            for c_order, course_name in enumerate(cat_data['courses']):
                duration, placement, salary, price = OVERRIDES.get(course_name, DEFAULT_PLACEHOLDER)
                Course.objects.update_or_create(
                    slug=slugify(course_name),
                    defaults={
                        'category': category,
                        'name': course_name,
                        'duration_display': duration,
                        'placement_rate': placement,
                        'salary_range_display': salary,
                        'price': price,
                        'order': c_order,
                    },
                )

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {CourseCategory.objects.count()} categories and {Course.objects.count()} courses.'
        ))
