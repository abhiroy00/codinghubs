"""Job description matcher.

The AI reads the job description and the (redacted) resume and, for every skill the job asks for, says whether the resume
shows it, with a quote as evidence. Everything that decides the numbers happens here in code:
  * a requirement must really appear in the job description (the AI cannot invent requirements);
  * "matched" or "partial" needs proof in the resume (the skill's name, or the quoted evidence, must appear in the resume text);
    otherwise the skill counts as missing (the AI cannot invent the candidate's skills);
  * the match percentage is a fixed formula over those verified results.
"""
from .ai_services import ai_manager
from .ai_services.errors import AIBadResponse
from .ai_services.prompt_templates import JOB_MATCH_TASK, build_system, job_match_prompt
from .resume import TextIndex, redact

REQUIRED_WEIGHT, PREFERRED_WEIGHT = 2, 1
CREDIT = {'matched': 1.0, 'partial': 0.5, 'missing': 0.0}
MIN_JD_CHARS, MAX_JD_CHARS = 80, 8000
FORMULA = ('Match percentage = 100 x (points earned / points possible), counting skills only. Each skill the job requires is worth '
           f'{REQUIRED_WEIGHT} points and each "nice to have" skill {PREFERRED_WEIGHT} point. A skill earns all of its points when your resume '
           'clearly shows it, half when it shows related or partial experience, and none when it is not in your resume. It is an estimate '
           'of keyword and skill overlap, not a prediction of whether you will be shortlisted or hired.')


def _strings(low, high, longest=300):
    return {'type': 'array', 'minItems': low, 'maxItems': high, 'items': {'type': 'string', 'minLength': 1, 'maxLength': longest}}


def _entries(low, high, fields):
    return {'type': 'array', 'minItems': low, 'maxItems': high, 'items': {'type': 'object', 'required': [], 'properties': fields}}


MATCH_SCHEMA = {
    'type': 'object',
    'required': ['summary', 'skills', 'experience', 'recommended_topics', 'recommended_projects', 'interview_questions', 'preparation_roadmap'],
    'properties': {
        'summary': {'type': 'string', 'minLength': 10, 'maxLength': 1000},
        'skills': _entries(1, 25, {
            'name': {'type': 'string', 'minLength': 1, 'maxLength': 80},
            'importance': {'type': 'string', 'enum': ['required', 'preferred']},
            'status': {'type': 'string', 'enum': ['matched', 'partial', 'missing']},
            'evidence': {'type': 'string', 'maxLength': 300}, 'note': {'type': 'string', 'maxLength': 200}}),
        'experience': {'type': 'object', 'required': ['assessment'], 'properties': {
            'required_years': {'type': 'number', 'minimum': 0, 'maximum': 40}, 'candidate_years': {'type': 'number', 'minimum': 0, 'maximum': 50},
            'assessment': {'type': 'string', 'enum': ['meets', 'partial', 'not_met', 'unclear']}, 'explanation': {'type': 'string', 'maxLength': 500}}},
        'project_relevance': _entries(0, 6, {'project': {'type': 'string', 'maxLength': 160}, 'relevance': {'type': 'string', 'maxLength': 300}}),
        'recommended_topics': _strings(1, 8, 150), 'recommended_projects': _strings(1, 5, 300),
        'interview_questions': _strings(4, 10, 400),
        'preparation_roadmap': _entries(2, 6, {'timeframe': {'type': 'string', 'maxLength': 60}, 'focus': {'type': 'string', 'maxLength': 160},
                                              'actions': _strings(1, 5, 250)}),
    },
}


def verify_skills(skills, jd_text, resume_text):
    """Keep only requirements that are in the job description, and downgrade claims the resume cannot back up.
    Returns (verified skills, requirements dropped, claims downgraded)."""
    jd_index, resume_index = TextIndex(jd_text), TextIndex(resume_text)
    resume_squashed = resume_index.squashed
    seen, verified, dropped, downgraded = set(), [], 0, 0
    for skill in skills:
        name = skill.get('name', '').strip()
        key = name.lower()
        if not name or key in seen or name not in jd_index:
            dropped += 1
            continue
        seen.add(key)
        status = skill.get('status', 'missing')
        evidence = skill.get('evidence', '').strip()
        from .resume import _norm  # the same squashing used everywhere else
        proof = name in resume_index or (len(_norm(evidence)) >= 6 and _norm(evidence) in resume_squashed)
        if status != 'missing' and not proof:
            status, evidence, downgraded = 'missing', '', downgraded + 1
        if status == 'missing':
            evidence = ''
        verified.append({'name': name, 'importance': skill.get('importance', 'required'), 'status': status, 'evidence': evidence, 'note': skill.get('note', '')})
    return verified, dropped, downgraded


def calculate(skills):
    """The match percentage and its breakdown, from verified skills only."""
    earned = possible = 0.0
    for s in skills:
        weight = REQUIRED_WEIGHT if s['importance'] == 'required' else PREFERRED_WEIGHT
        possible += weight
        earned += weight * CREDIT[s['status']]
    return round(100 * earned / possible) if possible else 0, earned, possible


def match(user, resume, job_description, job_title=''):
    """Compare a resume with a job description. Returns (result dict, AIResponse)."""
    response = ai_manager.generate_json(
        feature='job_match', user=user, system=build_system(JOB_MATCH_TASK), schema=MATCH_SCHEMA, max_output_tokens=8192, temperature=0.2,
        prompt=job_match_prompt(redact(resume.text), job_description, job_title),
    )
    data = dict(response.data)
    skills, dropped, downgraded = verify_skills(data.pop('skills'), job_description, resume.text)
    if not skills:
        raise AIBadResponse('no requirement from the AI appears in the job description')
    percentage, earned, possible = calculate(skills)
    by_status = lambda status, importance=None: [s['name'] for s in skills if s['status'] == status and (importance is None or s['importance'] == importance)]  # noqa: E731
    data.update({
        'match_percentage': percentage, 'skills': skills,
        'matched_skills': by_status('matched'), 'partially_matched_skills': by_status('partial'), 'missing_skills': by_status('missing'),
        'skill_gaps': by_status('missing', 'required') + by_status('partial', 'required'),
        'score_explanation': FORMULA, 'points': {'earned': earned, 'possible': possible},
        'unverified_items': {'requirements_removed': dropped, 'claims_downgraded_to_missing': downgraded},
    })
    return data, response
