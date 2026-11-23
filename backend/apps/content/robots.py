"""Python twin of frontend/src/seo/robots.ts, the single indexing rule for public pages.

Only COMPLETE content is indexed; everything else is `noindex, follow`, and application screens are
`noindex, nofollow`. apps.content.test_robots_rule keeps these values identical to the TypeScript module.
"""

import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


INDEX = 'index, follow, max-image-preview:large'
NOINDEX = 'noindex, follow'
PRIVATE = 'noindex, nofollow'

# A hub (a /learn/<course>/ path) is worth indexing once it has this many COMPLETE lessons.
HUB_MIN_COMPLETE_LESSONS = 1


TRACKING = re.compile(r'^(utm_[a-z_]+|gclid|fbclid|msclkid|dclid|yclid|mc_[a-z]+|_ga|_gl|ref|igshid|si|next|review)$', re.I)


def clean_canonical(url):
    """Drop tracking/session parameters and fragments from a canonical URL (same list as robots.ts)."""
    parts = urlsplit(url)
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not TRACKING.match(k)])
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, ''))


def get_robots_directive(status, private=False):
    if private:
        return PRIVATE
    return INDEX if status == 'COMPLETE' else NOINDEX


def hub_status(complete_lessons):
    return 'COMPLETE' if complete_lessons >= HUB_MIN_COMPLETE_LESSONS else 'PLACEHOLDER'
