from types import SimpleNamespace

from app.chatgpt import redacted_context
from app.evidence_analysis import backlink_opportunities, imported_keyword_ideas, referral_evidence
from app.operations import resource_snapshot
from app.models import Usage


def test_imported_referrals_do_not_invent_ai_citations_or_backlinks():
    record = SimpleNamespace(id='observed-source', created_at=1, data={'result': {
        'dimensionHeaders': [{'name': 'sessionSourceMedium'}], 'metricHeaders': [{'name': 'sessions'}],
        'rows': [{'dimensionValues': [{'value': 'chatgpt.com / referral'}], 'metricValues': [{'value': '4'}]},
                 {'dimensionValues': [{'value': 'fakechatgpt.com / referral'}], 'metricValues': [{'value': '2'}]}]}})
    rows = referral_evidence([record])
    assert rows[0]['sessions'] == 4 and rows[0]['ai_referral']
    assert not rows[1]['ai_referral']
    result = backlink_opportunities([], rows)
    assert 'not a verified backlink' in result[0]['basis']
    assert 'Incomplete' in result[0]['coverage']


def test_keyword_planner_and_trends_values_keep_their_source_meaning():
    trends = SimpleNamespace(id='trends', created_at=1, data={'headers': ['Week', 'rag: (India)'], 'rows': [{'Week': '2026-11-22', 'rag: (India)': '55'}]})
    assert 'not search volume' in imported_keyword_ideas([trends])[0]['status']
    planner = SimpleNamespace(id='ads', created_at=2, data={'rows': [{'Keyword': 'rag tutorial', 'Competition': 'High'}]})
    idea = imported_keyword_ideas([planner])[0]
    assert idea['reported_fields']['Competition'] == 'High'
    assert 'not organic difficulty' in idea['status']


def test_chatgpt_redaction_preserves_numeric_metrics_and_source_identifiers():
    result = redacted_context({'id': '1234567890123456', 'clicks': 126, 'impressions': 8048, 'text': 'Email owner@example.com and phone 9876543210'})
    assert result['id'] == '1234567890123456' and result['clicks'] == 126
    assert 'owner@example.com' not in result['text'] and '9876543210' not in result['text']


def test_resource_usage_is_tenant_scoped(local_workspace):
    db, site, settings, _ = local_workspace
    db.add(Usage(tenant_id=site.tenant_id, site_id=site.id, purpose='draft', model='rules', duration_ms=10, cached=False))
    db.flush()
    snapshot = resource_snapshot(db, settings, 'unrelated-tenant')
    assert snapshot['local_ai_requests'] == 0 and snapshot['local_ai_processing_ms'] == 0
    assert snapshot['gpu_utilization_pct'] is None
    assert snapshot['cost_policy']['verified_external_expenditure_inr'] is None
