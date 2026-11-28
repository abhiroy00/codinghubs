"""Twenty bounded analysis agents. Rules run locally; evidence gaps remain visible."""
import time
import os
from typing import TypedDict

os.environ['LANGSMITH_TRACING'] = 'false'
os.environ['LANGCHAIN_TRACING_V2'] = 'false'

from langgraph.graph import END, START, StateGraph
from sqlalchemy import select

from .analytics import keyword_analysis, missing_link_candidates, opportunity, save_action, summary, technical_analysis
from .models import Action, AgentResult, Audit, Document, Evidence, Job, Notification, Page, Report, Site

AGENTS = ['Master Orchestrator', 'Google Search Console', 'Google Analytics', 'Technical SEO', 'Keyword Research',
          'CTR Optimization', 'Ranking Improvement', 'Indexing', 'Content Optimization', 'Competitor Research',
          'Internal Linking', 'Backlink Research', 'AEO', 'GEO', 'Local SEO', 'Website Performance',
          'Conversion Optimization', 'Quality Assurance', 'Security Monitoring', 'Reporting']


class AgentState(TypedDict):
    stopped: bool
    results: list[dict]


def content_signals(pages):
    return [{'url': page.url, 'question_headings': sum('?' in h['text'] for h in page.details.get('headings', [])),
             'code_examples': page.details.get('code_examples', 0), 'comparison_tables': page.details.get('table_count', 0),
             'source_links': len(page.details.get('external_references', [])),
             'review': 'Signals support human review; they are not proof of correctness, expertise or AI citations'} for page in pages[:30]]


def run_agents(sessions, job_id, settings):
    with sessions() as db:
        job = db.get(Job, job_id)
        site = db.get(Site, job.site_id)
        if not site or site.tenant_id != job.tenant_id:
            raise ValueError('Invalid job scope')
        data = summary(db, site)
        keywords = keyword_analysis(db, site, data)
        technical = technical_analysis(db, site)
        pages = db.scalars(select(Page).where(Page.site_id == site.id, Page.tenant_id == site.tenant_id)).all()
        evidence = db.scalars(select(Evidence).where(Evidence.site_id == site.id, Evidence.tenant_id == site.tenant_id).order_by(Evidence.created_at.desc()).limit(50)).all()
        documents = db.scalars(select(Document).where(Document.site_id == site.id, Document.tenant_id == site.tenant_id, Document.active.is_(True))).all()

        def sources(kind):
            return [row for row in evidence if row.kind == kind]

        from .evidence_analysis import backlink_opportunities, referral_evidence
        referrals = referral_evidence(sources('ga4'))

        def analyze(name):
            if name == 'Master Orchestrator':
                return 'complete', 'Bounded local plan assembled', {'agents': len(AGENTS), 'mode': 'deterministic rules; AI drafts require a separate request', 'site_id': site.id}
            if name == 'Google Search Console':
                return ('complete', 'Supplied/API snapshot analyzed', {'totals': data['totals'], 'windows': data['windows'], 'source': data['source']}) if data['source'] else ('blocked', 'Import GSC data or authorize the free API', {})
            if name == 'Google Analytics':
                return ('partial', 'Imported/API analytics evidence available; attribution needs review', {'datasets': len(sources('ga4'))}) if sources('ga4') else ('blocked', 'No GA4 connection or imported evidence', {})
            if name == 'Technical SEO':
                return ('complete', f'{len(pages)} captured pages analyzed', technical) if pages else ('blocked', 'Run a permitted bounded crawl', {})
            if name == 'Keyword Research':
                return ('complete', f'{len(keywords["rows"])} measured query opportunities scored', {'opportunities': keywords['rows'][:30], 'overlap_candidates': keywords['overlap_candidates'], 'limit': keywords['overlap_limit'], 'ideas': keywords['ideas']}) if keywords['rows'] else ('blocked', 'No keyword performance evidence', {})
            if name == 'CTR Optimization':
                candidates = []
                for row in data['dimensions']['page']['rows']:
                    if row['impressions'] >= 50 and (row['ctr_pct'] or 0) < 3 and (row.get('position') or 1000) <= 20:
                        candidate = opportunity(row, 'informational')
                        candidates.append(candidate)
                        save_action(db, site, 'Review search intent and snippet for ' + row['key'], 'ctr_review', row['key'], candidate,
                                    severity='P1' if row['impressions'] >= 100 else 'P2', score=candidate['score'], confidence=candidate['confidence'])
                return ('complete', f'{len(candidates)} low-CTR page review candidates', {'rows': sorted(candidates, key=lambda r: -r['score'])[:30], 'benchmark': '3% is a scenario assumption, not a promised or industry CTR'}) if data['dimensions']['page']['source_id'] else ('blocked', 'Page performance table missing from selected source set', {})
            if name == 'Ranking Improvement':
                rows = [r for r in keywords['rows'] if 4 <= (r.get('position') or 1000) <= 20]
                for row in rows[:15]:
                    save_action(db, site, 'Review relevance for “' + row['key'][:90] + '”', 'ranking_review', row['key'], row,
                                score=row['score'], confidence=row['confidence'])
                return ('complete', f'{len(rows)} query averages in the 4–20 range', {'rows': rows[:30], 'limit': 'Period averages, not stable ranks; no search-volume/CPC/difficulty invention'}) if keywords['rows'] else ('blocked', 'Query evidence unavailable', {})
            if name == 'Indexing':
                records = [{'url': p.url, 'status': p.status, 'robots': p.robots, 'canonical': p.canonical} for p in pages[:50]]
                return ('partial', 'HTML signals reviewed; Google index status requires inspection data', {'signals': records, 'inspection_datasets': len(sources('indexing'))}) if pages or sources('indexing') else ('blocked', 'No captured HTML or indexing report', {})
            if name in ('Content Optimization', 'AEO'):
                return ('partial', 'Source answer/example signals ready for human review', {'pages': content_signals(pages), 'verified_documents': sum(d.verified for d in documents), 'publication': 'Never automatic'}) if pages else ('blocked', 'Capture source content before drafting claims', {})
            if name == 'Competitor Research':
                competitors = db.scalars(select(Site).where(Site.tenant_id == site.tenant_id, Site.kind == 'competitor')).all()
                comparisons = []
                for competitor in competitors:
                    captured = db.scalars(select(Page).where(Page.tenant_id == site.tenant_id, Page.site_id == competitor.id)).all()
                    comparisons.append({'website': competitor.base_url, 'captured_pages': len(captured),
                        'topics': [p.title for p in captured[:15]], 'content_signals': content_signals(captured[:10])})
                return ('partial', 'Public-content comparisons only; rankings/backlinks not inferred', {'competitors': comparisons, 'manual_serp_datasets': len(sources('serp'))}) if comparisons or sources('serp') else ('blocked', 'Add permitted competitor domains or manual SERP evidence', {})
            if name == 'Internal Linking':
                for finding in technical['broken_internal_links'][:20]:
                    save_action(db, site, 'Repair a captured broken internal link', 'broken_link', finding['source'] + '|' + finding['target'], finding, severity='P1', score=90)
                return ('complete', 'Captured internal graph and lexical link candidates analyzed', {'broken_links': technical['broken_internal_links'], 'missing_link_candidates': missing_link_candidates(pages), 'no_observed_inbound': technical['no_observed_inbound'], 'depth': technical['crawl_depth'], 'limit': technical['graph_limit']}) if pages else ('blocked', 'No captured link graph', {})
            if name == 'Backlink Research':
                rows = [{'source': r.title, 'rows': len(r.data.get('rows', [])), 'provenance': r.data.get('provenance')} for r in sources('backlinks')]
                opportunities = backlink_opportunities(sources('backlinks'), referrals)
                return ('partial', 'Evidence-backed domains ready for manual partnership qualification; no outreach sent', {'datasets': rows, 'opportunities': opportunities, 'limits': 'Incomplete datasets; no full backlink index, purchased links or automated outreach'}) if rows or opportunities else ('blocked', 'Import GSC Links/referral/backlink data; no complete free backlink index claimed', {})
            if name == 'GEO':
                return ('partial', 'Available AI visibility/referral evidence reviewed', {'datasets': [{'title': r.title, 'rows': len(r.data.get('rows', []))} for r in sources('ai_visibility')], 'identifiable_ai_referrals': [r for r in referrals if r['ai_referral']], 'citation_verification': 'User observations/referrals, not automatic assistant access or proof of citations'}) if sources('ai_visibility') or referrals else ('blocked', 'No manual AI observations or identifiable AI-referral evidence supplied', {})
            if name == 'Local SEO':
                local = [r for r in keywords['rows'] if r['intent'] == 'local']
                verified = [d for d in documents if d.verified]
                return ('partial', 'Local intent and owner-verified sources reviewed', {'queries': local[:20], 'verified_sources': [d.source for d in verified[:20]], 'limits': 'Current GBP/NAP, branches, fees and faculty facts require owner verification; no fake claims'}) if local or verified else ('blocked', 'No local intent or verified business information', {})
            if name == 'Website Performance':
                return ('partial', 'Imported performance measurements available; distinguish lab and field', {'datasets': [{'title': r.title, 'data': r.data} for r in sources('performance')[:3]], 'limit': 'No invented remote score or p75 Core Web Vitals'}) if sources('performance') else ('blocked', 'No Lighthouse/field dataset; local profiling can be run explicitly', {})
            if name == 'Conversion Optimization':
                return ('partial', 'Analytics evidence can support funnel review after event-definition checks', {'datasets': len(sources('ga4')), 'limit': 'Search clicks/key events do not establish qualified admissions; avoid overlapping lead-event double counts'}) if sources('ga4') else ('blocked', 'GA4 sessions and verified conversion events missing', {})
            if name == 'Quality Assurance':
                counts = data['totals']
                failures = []
                for dimension in ('country', 'device'):
                    cut = data['dimensions'][dimension]['totals']
                    if counts and cut and (counts['clicks'], counts['impressions']) != (cut['clicks'], cut['impressions']):
                        failures.append(dimension + ' totals differ from property chart; verify snapshot/filter coherence')
                return ('failed' if failures else 'complete', 'Numeric and provenance checks evaluated', {'failures': failures, 'limits': data['limitations'], 'schema_check': 'JSON-LD parsing is not Google rich-result eligibility'})
            if name == 'Security Monitoring':
                recent = db.scalars(select(Audit).where(Audit.tenant_id == site.tenant_id).order_by(Audit.created_at.desc()).limit(20)).all()
                return 'complete', 'Local permission/cost boundaries and recent audit events reviewed', {'free_only': True, 'paid_fallback': False,
                    'events': [{'event': r.event, 'at': r.created_at} for r in recent], 'limit': 'Boundary checks and audit events, not a claim of complete intrusion detection'}
            if name == 'Reporting':
                actions = db.scalars(select(Action).where(Action.site_id == site.id, Action.tenant_id == site.tenant_id, Action.status == 'open').order_by(Action.score.desc()).limit(30)).all()
                states = db.scalars(select(AgentResult).where(AgentResult.job_id == job.id, AgentResult.tenant_id == site.tenant_id)).all()
                report = Report(tenant_id=site.tenant_id, site_id=site.id, kind=job.params.get('cadence', 'daily'), data={
                    'website': site.base_url, 'totals': data['totals'], 'windows': data['windows'], 'source': data['source'],
                    'actions': [{'title': a.title, 'severity': a.severity, 'score': a.score, 'evidence': a.evidence} for a in actions],
                    'agents': [{'agent': r.agent, 'status': r.status, 'summary': r.summary} for r in states] +
                              [{'agent': 'Reporting', 'status': 'complete', 'summary': 'This persisted report was generated'}],
                    'limitations': data['limitations'], 'targets': '25–50, 100, 250, 500, 1000+ sustained daily clicks are goals, never guarantees'})
                db.add(report)
                db.flush()
                import json
                from .knowledge import ingest_document
                ingest_document(db, site, 'seo-report:' + report.id, 'Generated ' + report.kind + ' SEO report',
                                json.dumps(report.data, ensure_ascii=False)[:50000])
                db.add(Notification(tenant_id=site.tenant_id, site_id=site.id, title='SEO report ready', body='Evidence-backed local report generated. Blocked datasets and assumptions are included.'))
                return 'complete', 'Persistent report and local notification generated', {'report_id': report.id, 'actions': len(actions)}
            raise ValueError('Unknown analysis agent')

        graph = StateGraph(AgentState)
        previous = START
        for index, agent in enumerate(AGENTS):
            def node(state, name=agent):
                db.refresh(job)
                if state['stopped'] or job.status != 'running':
                    return {'stopped': True, 'results': state['results']}
                start = time.monotonic()
                try:
                    with db.begin_nested():
                        status, message, facts = analyze(name)
                except Exception as error:
                    status, message, facts = 'failed', 'Agent failed safely; inspect its input and retry', {'error_type': type(error).__name__}
                facts['duration_ms'] = round((time.monotonic() - start) * 1000, 2)
                record = db.scalar(select(AgentResult).where(AgentResult.job_id == job.id, AgentResult.tenant_id == site.tenant_id, AgentResult.agent == name))
                if record is None:
                    record = AgentResult(tenant_id=site.tenant_id, site_id=site.id, job_id=job.id, agent=name, status=status, summary=message, evidence=facts)
                    db.add(record)
                else:
                    record.status, record.summary, record.evidence = status, message, facts
                job.heartbeat = time.time()
                job.progress = {'agent': name, 'completed': len(state['results']) + 1, 'total': len(AGENTS)}
                db.commit()
                return {'stopped': False, 'results': state['results'] + [{'agent': name, 'status': status, 'summary': message}]}
            key = f'agent_{index}'
            graph.add_node(key, node)
            graph.add_edge(previous, key)
            previous = key
        graph.add_edge(previous, END)
        result = graph.compile().invoke({'stopped': False, 'results': []}, config={'recursion_limit': 30})
        return {'agents': result['results'], 'stopped': result['stopped'], 'mode': 'Local deterministic LangGraph; no external AI calls'}
