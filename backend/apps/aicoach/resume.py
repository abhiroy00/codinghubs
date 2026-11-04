"""Resume handling: PDF checks, text extraction, privacy redaction, AI analysis and verification of what the AI claims.

Design notes
* Contact details (email, phone, links) are found with regular expressions, not by the AI, and are replaced by placeholders
  before the text is sent to an AI provider. The AI never sees them, so they cannot be mis-copied or leaked to the provider.
* The AI is told to use only what the resume says, and the server then checks it: a skill, tool, certificate, employer,
  school or project name that does not appear in the resume text is dropped. The analysis therefore cannot contain
  invented skills or experience.
"""
import re

from pypdf import PdfReader

from .ai_services import ai_manager
from .ai_services.prompt_templates import RESUME_TASK, build_system, resume_prompt

MAX_BYTES = 5 * 1024 * 1024
MAX_PAGES = 10
MAX_TEXT_CHARS = 30_000
MIN_TEXT_CHARS = 150
MAX_RESUMES_PER_USER = 5
ATS_DISCLAIMER = ('Applicant tracking systems differ from company to company. This feedback is general guidance to make your resume easier '
                  'to read and search; it does not guarantee that you will be shortlisted or selected.')


class ResumeError(Exception):
    def __init__(self, message, code='invalid_resume'):
        super().__init__(message)
        self.message, self.code = message, code


# ---------------------------------------------------------------- the PDF

def validate_pdf(uploaded):
    """Check the name, size and real content (magic bytes) of an upload; the browser-reported type is never trusted."""
    name = (uploaded.name or '').lower()
    if not name.endswith('.pdf'):
        raise ResumeError('Please upload a PDF file.', 'not_pdf')
    if uploaded.size == 0:
        raise ResumeError('The file is empty.', 'empty_file')
    if uploaded.size > MAX_BYTES:
        raise ResumeError(f'The file is larger than {MAX_BYTES // (1024 * 1024)} MB.', 'file_too_large')
    uploaded.seek(0)
    head = uploaded.read(8)
    uploaded.seek(0)
    if not head.startswith(b'%PDF-'):
        raise ResumeError('This is not a real PDF file.', 'not_pdf')


def extract_text(file_obj):
    """Return (text, page_count). Raises ResumeError for encrypted, scanned or unreadable PDFs."""
    try:
        reader = PdfReader(file_obj, strict=False)
        if reader.is_encrypted:
            raise ResumeError('This PDF is password-protected. Remove the password and upload it again.', 'encrypted_pdf')
        pages = len(reader.pages)
        if pages > MAX_PAGES:
            raise ResumeError(f'The PDF has {pages} pages. A resume should be at most {MAX_PAGES} pages.', 'too_many_pages')
        text = '\n'.join((page.extract_text() or '') for page in reader.pages)
    except ResumeError:
        raise
    except Exception:  # pypdf raises many kinds of errors on damaged or hostile files
        raise ResumeError('We could not read this PDF. Export it again from your editor and try again.', 'unreadable_pdf') from None
    text = re.sub(r'[ \t]+', ' ', text.replace('\x00', ''))
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    if len(text) < MIN_TEXT_CHARS:
        raise ResumeError('We found almost no text in this PDF. It may be a scanned image; upload a PDF with selectable text.', 'no_text')
    return text[:MAX_TEXT_CHARS], pages


# ---------------------------------------------------------------- contact details and redaction

EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+')
URL = re.compile(r'(?:https?://|www\.)[^\s<>()]+|\b(?:linkedin\.com|github\.com)/[^\s<>()]+', re.IGNORECASE)
PHONE = re.compile(r'(?<![\w@])\+?\d[\d\s().-]{8,}\d(?!\w)')


def _is_phone(candidate):
    digits = re.sub(r'\D', '', candidate)
    groups = re.findall(r'\d+', candidate)
    looks_like_years = all(len(g) == 4 and g[:2] in ('19', '20') for g in groups)
    return 10 <= len(digits) <= 15 and not looks_like_years  # "2019 - 2023 - 2024" is a timeline, not a number


def extract_contacts(text):
    phones = [m.group().strip() for m in PHONE.finditer(URL.sub(' ', text)) if _is_phone(m.group())]
    emails = EMAIL.findall(text)
    links = list(dict.fromkeys(m.group().rstrip('.,;') for m in URL.finditer(text)))[:5]
    return {'email': emails[0] if emails else '', 'phone': phones[0] if phones else '', 'links': links}


def _link_label(match):
    url = match.group().lower()
    return '[LINK: linkedin]' if 'linkedin' in url else '[LINK: github]' if 'github' in url else '[LINK]'


def redact(text):
    """Replace emails, links and phone numbers with placeholders before the text goes to an AI provider."""
    text = EMAIL.sub('[EMAIL]', text)
    text = URL.sub(_link_label, text)
    return PHONE.sub(lambda m: '[PHONE]' if _is_phone(m.group()) else m.group(), text)


# ---------------------------------------------------------------- the analysis

def _strings(low, high, longest=300):
    return {'type': 'array', 'minItems': low, 'maxItems': high, 'items': {'type': 'string', 'minLength': 1, 'maxLength': longest}}


def _text(longest=300):
    return {'type': 'string', 'maxLength': longest}  # may be empty


def _entries(high, fields):
    return {'type': 'array', 'minItems': 0, 'maxItems': high, 'items': {'type': 'object', 'required': [], 'properties': fields}}


ANALYSIS_SCHEMA = {
    'type': 'object',
    'required': ['summary', 'strengths', 'weaknesses', 'improvement_suggestions', 'recommended_roles', 'technical_questions', 'project_questions'],
    'properties': {
        'candidate_name': _text(120),
        'summary': {'type': 'string', 'minLength': 10, 'maxLength': 1200},
        'technical_skills': _strings(0, 40, 80),
        'tools_and_technologies': _strings(0, 30, 80),
        'education': _entries(6, {'institution': _text(160), 'degree': _text(160), 'year': _text(30)}),
        'experience': _entries(10, {'company': _text(160), 'role': _text(160), 'duration': _text(60), 'highlights': _strings(0, 4, 300)}),
        'projects': _entries(10, {'name': _text(160), 'description': _text(400), 'technologies': _strings(0, 15, 60)}),
        'certifications': _strings(0, 12, 160),
        'structure': {'type': 'object', 'required': [], 'properties': {
            'sections_found': _strings(0, 15, 60), 'length_note': _text(300), 'formatting_notes': _strings(0, 8, 300)}},
        'strengths': _strings(1, 8), 'weaknesses': _strings(1, 8), 'missing_skills': _strings(0, 12, 120),
        'ats_feedback': _strings(1, 8), 'improvement_suggestions': _strings(1, 10),
        'recommended_roles': _strings(1, 6, 100),
        'technical_questions': _strings(3, 8, 400), 'project_questions': _strings(1, 6, 400),
    },
}


def _norm(value):
    return re.sub(r'[^a-z0-9]+', '', value.lower())


class TextIndex:
    """Lets us ask "is this name really in the resume?" without substring accidents ("Go" is not inside "Django", "Java" is not "JavaScript").

    The text is split into alphanumeric words. A name is found when its letters and digits, squashed together, equal 1-5 consecutive
    resume words squashed together (so "Node.js", "NodeJS" and "node js" all match each other, and "REST APIs" matches "REST API").
    Long names (12+ characters) may also match inside the squashed text, which is safe because accidental matches that long do not happen.
    Names ending in symbols, such as "C++" or "C#", must appear with those exact symbols.
    """

    def __init__(self, text):
        self.text = text
        self.squashed = _norm(text)
        words = re.findall(r'[a-z0-9]+', text.lower())
        self.windows = {''.join(words[i:i + n]) for i in range(len(words)) for n in range(1, 6) if i + n <= len(words)}

    def __contains__(self, value):
        value = value.strip()
        squashed = _norm(value)
        if not squashed:
            return False
        symbols = re.search(r'[^A-Za-z0-9\s]+$', value)
        if (symbols and len(squashed) <= 3) or len(squashed) == 1:  # C++, C#, R: the exact symbols and word boundaries matter (a bare C is not C++)
            return re.search(rf'(?<![A-Za-z0-9]){re.escape(value)}(?![A-Za-z0-9+#])', self.text, re.IGNORECASE) is not None
        if len(squashed) >= 12 and squashed in self.squashed:
            return True
        return any(form in self.windows for form in (squashed, squashed + 's', squashed[:-1] if squashed.endswith('s') else squashed))


def appears(value, index):
    return value in index


def verify(analysis, text):
    """Drop everything the AI listed that the resume does not contain. Returns (cleaned analysis, number of items dropped)."""
    index, dropped = TextIndex(text), 0

    def keep(values):
        nonlocal dropped
        kept = [v for v in values if v in index]
        dropped += len(values) - len(kept)
        return kept

    def keep_entries(entries, key, tech_key=None):
        nonlocal dropped
        kept = []
        for entry in entries:
            if entry.get(key, '') not in index:
                dropped += 1
                continue
            if tech_key and entry.get(tech_key):
                entry = {**entry, tech_key: keep(entry[tech_key])}
            kept.append(entry)
        return kept

    result = dict(analysis)
    for field in ('technical_skills', 'tools_and_technologies', 'certifications'):
        result[field] = keep(result.get(field, []))
    result['education'] = keep_entries(result.get('education', []), 'institution')
    result['experience'] = keep_entries(result.get('experience', []), 'company')
    result['projects'] = keep_entries(result.get('projects', []), 'name', 'technologies')
    if result.get('candidate_name') and result['candidate_name'] not in index:
        result['candidate_name'] = ''
        dropped += 1
    return result, dropped


def analyze_resume(user, resume, target_role=''):
    """Run the AI analysis for a resume and return (verified result, AIResponse)."""
    response = ai_manager.generate_json(
        feature='resume_analysis', user=user, system=build_system(RESUME_TASK), schema=ANALYSIS_SCHEMA,
        prompt=resume_prompt(redact(resume.text), target_role), max_output_tokens=8192, temperature=0.3,
    )
    result, dropped = verify(response.data, resume.text)
    contacts = extract_contacts(resume.text)
    result['candidate'] = {'name': result.pop('candidate_name', ''), **contacts}
    result['unverified_items_removed'] = dropped
    result['ats_disclaimer'] = ATS_DISCLAIMER
    return result, response


# ---------------------------------------------------------------- download

def _bullets(items):
    return '\n'.join(f'- {item}' for item in items) if items else '_None found._'


def build_markdown(resume, analysis):
    r, c = analysis.result, analysis.result.get('candidate', {})
    lines = [f'# Resume analysis: {resume.original_name}', f'_Created {analysis.created_at:%Y-%m-%d}' + (f' for the role "{analysis.target_role}"_' if analysis.target_role else '_'), '',
             '## Candidate', f'- Name: {c.get("name") or "not found"}', f'- Email: {c.get("email") or "not found"}', f'- Phone: {c.get("phone") or "not found"}',
             f'- Links: {", ".join(c.get("links", [])) or "none"}', '', '## Summary', r.get('summary', ''), '',
             '## Technical skills', _bullets(r.get('technical_skills', [])), '', '## Tools and technologies', _bullets(r.get('tools_and_technologies', [])), '',
             '## Education', _bullets([f'{e.get("degree", "")} - {e.get("institution", "")} {e.get("year", "")}'.strip() for e in r.get('education', [])]), '',
             '## Experience']
    for e in r.get('experience', []):
        lines += [f'### {e.get("role", "")} at {e.get("company", "")} ({e.get("duration", "")})', _bullets(e.get('highlights', []))]
    lines += ['', '## Projects']
    for p in r.get('projects', []):
        lines += [f'### {p.get("name", "")}', p.get('description', ''), f'Technologies: {", ".join(p.get("technologies", [])) or "none listed"}']
    lines += ['', '## Certifications', _bullets(r.get('certifications', [])), '', '## Strengths', _bullets(r.get('strengths', [])), '',
              '## Weaknesses', _bullets(r.get('weaknesses', [])), '', '## Missing skills', _bullets(r.get('missing_skills', [])), '',
              '## ATS-oriented feedback', _bullets(r.get('ats_feedback', [])), f'_{r.get("ats_disclaimer", ATS_DISCLAIMER)}_', '',
              '## Improvement suggestions', _bullets(r.get('improvement_suggestions', [])), '', '## Recommended roles', _bullets(r.get('recommended_roles', [])), '',
              '## Resume-based technical questions', _bullets(r.get('technical_questions', [])), '', '## Project-based questions', _bullets(r.get('project_questions', []))]
    return '\n'.join(lines) + '\n'
