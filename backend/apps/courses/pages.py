"""Public pages for courses created in the admin panel (Course.is_custom).

The original catalogue courses are prerendered by the frontend. Admin-created courses have no prerendered file, so
nginx falls back to this view for /courses/<slug>/: it returns crawler-ready HTML (title, description, canonical,
Course + BreadcrumbList JSON-LD, the visible content) inside the app shell, and the React page takes over with the
same data. Inactive or unknown slugs get a real 404.
"""
from django.conf import settings
from django.template.loader import render_to_string
from django.views.decorators.http import require_GET
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course

INSTITUTE = 'Coding Hubs School of AI'

# Courses whose pages are prerendered by the frontend catalogue; an admin-created course may not reuse these URLs.
CATALOGUE_SLUGS = frozenset('''
advanced-digital-marketing agentic-ai ai-engineering ai-engineering-diploma ai-genai-for-cybersecurity ai-integrated-full-stack
ai-ml-cloud-engineering aws-certified-solutions-architect aws-developer-associate aws-solutions-architect azure-administrator-az-104
azure-az-104 azure-az-305 azure-solutions-architect-expert-az-305 cissp cloud-devops cloud-devops-automation cloud-security
cloud-security-compliance cyber-law-grc cyber-security-gen-ai data-analytics data-analytics-using-python data-science data-science-pro
ethical-hacker-ceh ethical-hacker-ceh-v13 generative-ai google-cloud internship java-full-stack-developer-gen-ai mean-stack mern-stack
mern-stack-gen-ai net-full-stack projects prompt-engineering python-full-stack python-training-course react-full-stack ui-ux-designing
vibe-coding vibe-coding-with-ai
'''.split())


def public_custom_courses():
    return Course.objects.filter(is_custom=True, is_active=True).select_related('category')


def course_url(course):
    return f'{settings.SITE_URL}/courses/{course.slug}/'


def _label(name):
    return name if name.lower().endswith('course') else f'{name} Course'


def course_seo(course):
    label = _label(course.name)
    title = course.seo_title or next(
        (t for t in (f'{label} | {INSTITUTE}, Delhi', f'{label} | Coding Hubs, Delhi', f'{label} | Coding Hubs') if len(t) <= 65),
        f'{label} | Coding Hubs')
    description = course.meta_description or (course.summary or f'Explore {course.name} at {INSTITUTE}, Delhi.')[:165]
    url = course_url(course)
    from apps.content.services import LOGO_URL, ORG_ID
    graph = [
        {'@type': 'Course', 'name': course.name, 'description': description, 'url': url, 'inLanguage': 'en-IN',
         'provider': {'@id': ORG_ID}},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': f'{settings.SITE_URL}/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Courses', 'item': f'{settings.SITE_URL}/courses/'},
            {'@type': 'ListItem', 'position': 3, 'name': course.name, 'item': url},
        ]},
    ]
    return {
        'title': title, 'description': description, 'canonical': url, 'robots': 'index, follow, max-image-preview:large',
        'og': {'type': 'website', 'title': title, 'description': description, 'image': LOGO_URL, 'url': url},
        'json_ld': {'@context': 'https://schema.org', '@graph': graph},
    }


def course_payload(course):
    """Shape shared by the API, the server-rendered page and the React course page."""
    return {
        'slug': course.slug, 'name': course.name, 'category': course.category.name, 'level': course.level,
        'duration': course.duration_display, 'summary': course.summary, 'introduction': course.introduction,
        'tools': course.tools, 'skills': course.skills, 'careers': course.careers,
        'modules': course.modules, 'projects': course.projects, 'faqs': course.faqs,
        'seo': course_seo(course),
    }


class CustomCourseList(APIView):
    """Admin-created courses for the public course directory."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response([
            {'slug': c.slug, 'name': c.name, 'category': c.category.name, 'level': c.level, 'summary': c.summary, 'duration': c.duration_display, 'module_count': len(c.modules)}
            for c in public_custom_courses().order_by('category__order', 'order', 'name')
        ])


class CustomCourseDetail(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        course = public_custom_courses().filter(slug=slug).first()
        if course is None:
            return Response({'detail': 'Not found.'}, status=404)
        return Response(course_payload(course))


@require_GET
def course_page(request, slug):
    from apps.content.ssr import not_found, respond
    course = public_custom_courses().filter(slug=slug).first()
    if course is None:
        return not_found('Course not found')
    data = course_payload(course)
    html = render_to_string('courses/course_page.html', {'c': data})
    return respond(data['seo'], html, data={'kind': 'course', 'slug': course.slug, 'course': data})


def sitemap_rows():
    return [(course_url(c), c.updated_at) for c in public_custom_courses()]
