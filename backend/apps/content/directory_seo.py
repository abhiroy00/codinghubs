"""Metadata shared by directory HTTP pages and their public JSON payloads."""
from django.conf import settings
from .services import LOGO_URL


def page_seo(path, title, description, indexable=True):
    canonical = settings.SITE_URL + path
    return {
        'title': title, 'description': description, 'canonical': canonical,
        'robots': 'index, follow, max-image-preview:large' if indexable else 'noindex, follow',
        'og': {'type': 'website', 'title': title, 'description': description, 'url': canonical, 'image': LOGO_URL},
        'json_ld': {'@context': 'https://schema.org', '@type': 'WebPage', 'name': title, 'description': description, 'url': canonical},
    }


def tutor_seo(tutor):
    return page_seo(f'/book-a-tutor/{tutor.pk}', f'{tutor.full_name} | Book a Tutor | Coding Hubs School of AI', ' '.join(tutor.bio.split())[:160])


def job_seo(job):
    return page_seo(f'/latest-jobs/{job.slug}/', f'{job.title} at {job.company_name} | Coding Hubs School of AI', ' '.join(job.description.split())[:160], indexable=job.is_open and not job.is_imported)


def directory_seo(kind):
    if kind == 'tutors':
        return page_seo('/book-a-tutor/', 'Book an Online Tutor | Coding Hubs School of AI', 'Explore tutor profiles and request a one-to-one online session in Python, AI, data science or software development with Coding Hubs School of AI.')
    return page_seo('/latest-jobs/', 'Latest Jobs | Coding Hubs School of AI', 'Explore the latest job openings in AI, data science and software development, with location, work mode, experience and how to apply.')
