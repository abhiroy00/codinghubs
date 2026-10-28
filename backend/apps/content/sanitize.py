"""Allowlist HTML sanitising for editor content, plus heading ids / table of contents.

TinyMCE output is never trusted: everything goes through nh3 (an allowlist sanitiser) on save *and* again before it is
rendered publicly, so content stored before a rule change is still cleaned.
"""
import re
from html import unescape

import nh3
from django.utils.text import slugify

ALLOWED_TAGS = {
    'h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark',
    'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'span', 'div',
}
ALLOWED_ATTRIBUTES = {
    'a': {'href', 'title', 'target'},
    'img': {'src', 'alt', 'title', 'width', 'height'},
    'th': {'colspan', 'rowspan', 'scope'},
    'td': {'colspan', 'rowspan'},
    'ol': {'start', 'type'},
    'code': {'class'},
    'pre': {'class'},
}
ALLOWED_SCHEMES = {'http', 'https', 'mailto', 'tel'}
# `class` on code/pre only for syntax-highlighting names like language-python.
_LANG = re.compile(r'^language-[a-z0-9+#-]{1,20}$')

_HEADING = re.compile(r'<(h[23])(\s[^>]*)?>(.*?)</\1>', re.I | re.S)
_TAGS = re.compile(r'<[^>]+>')
WORDS = re.compile(r"[\w'’-]+", re.UNICODE)


def sanitize_html(value: str) -> str:
    if not value:
        return ''

    def attr_filter(tag, attr, val):
        if attr == 'class':
            return val if _LANG.match(val) else None
        if attr == 'target':
            return '_blank' if val == '_blank' else None
        return val

    cleaned = nh3.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        attribute_filter=attr_filter,
        url_schemes=ALLOWED_SCHEMES,
        link_rel='noopener noreferrer',
        strip_comments=True,
    )
    return cleaned.strip()


def plain_text(html: str) -> str:
    return unescape(_TAGS.sub(' ', html or '')).strip()


def word_count(html: str) -> int:
    return len(WORDS.findall(plain_text(html)))


def reading_minutes(*html_parts: str) -> int:
    words = sum(word_count(p) for p in html_parts)
    return max(1, round(words / 200))


def add_heading_ids(html: str):
    """Adds stable ids to h2/h3 (for the table of contents / anchors). Returns (html, toc)."""
    toc, used = [], set()

    def repl(m):
        tag, attrs, inner = m.group(1).lower(), m.group(2) or '', m.group(3)
        text = plain_text(inner)
        base = slugify(text)[:60] or 'section'
        ident, n = base, 2
        while ident in used:
            ident, n = f'{base}-{n}', n + 1
        used.add(ident)
        toc.append({'id': ident, 'text': text, 'level': int(tag[1])})
        attrs = re.sub(r'\sid="[^"]*"', '', attrs)
        return f'<{tag}{attrs} id="{ident}">{inner}</{tag}>'

    return _HEADING.sub(repl, html or ''), toc
