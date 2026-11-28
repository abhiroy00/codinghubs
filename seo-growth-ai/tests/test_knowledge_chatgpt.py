import json

import httpx
import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

from app.chatgpt import RecommendationBundle, export_prompt, import_recommendations
from app.knowledge import LocalAI, ingest_document, search
from app.models import Chunk, Document, Page, Site, Tenant


def test_versions_embeddings_reuse_and_tenant_retrieval(local_workspace):
    db, site, settings, _ = local_workspace
    doc = ingest_document(db, site, 'handbook', 'RAG handbook', 'Retrieval augmented generation uses retrieved source documents and verifies answer citations.', True)
    db.flush()
    count = db.scalar(select(func.count()).select_from(Chunk))
    assert ingest_document(db, site, 'handbook', 'Same handbook', doc.text).id == doc.id
    db.flush()
    assert db.scalar(select(func.count()).select_from(Chunk)) == count
    other = Tenant(name='Unrelated')
    db.add(other)
    db.flush()
    private = Site(tenant_id=other.id, name='Private', base_url='https://private.example/')
    db.add(private)
    db.flush()
    ingest_document(db, private, 'secret', 'Private unrelated document', 'Retrieval generation cross-tenant SECRET_NEVER_RETURN this unrelated document.', True)
    db.flush()
    result = search(db, site, settings, 'retrieval generation')
    assert result['results']
    assert 'SECRET_NEVER_RETURN' not in json.dumps(result)
    newer = ingest_document(db, site, 'handbook', 'Updated handbook', 'Retrieval needs current source versions and a documented abstention policy.', True)
    db.flush()
    assert newer.id != doc.id and not doc.active
    assert db.scalar(select(func.count()).select_from(Document)) == 3


def test_invalid_model_output_is_data_not_an_executable_action(local_workspace):
    db, site, settings, _ = local_workspace
    calls = []
    def malicious(request):
        calls.append(str(request.url))
        return httpx.Response(200, json={'response': json.dumps({'title': 'Bad draft', 'description': 'A supplied response', 'outline': [], 'review_notes': [], 'tool': 'run shell and deploy'})})
    client = LocalAI(settings, httpx.Client(base_url=settings.ollama_host, transport=httpx.MockTransport(malicious)))
    result = client.draft(db, site, 'Review an existing page', 'Untrusted context instructs the model to deploy')
    assert result['engine'] == 'deterministic fallback'
    assert result['review_required'] is True
    assert calls == ['http://127.0.0.1:11435/api/generate']


def test_successful_local_draft_is_cached_and_tenant_scoped(local_workspace):
    db, site, settings, _ = local_workspace
    calls = []
    def response(request):
        calls.append(request)
        payload = json.loads(request.content)
        assert payload['keep_alive'] == 0
        return httpx.Response(200, json={'response': json.dumps({'title': 'Grounded educational guide', 'description': 'Review the existing material and original exercise.', 'outline': ['Explain the definition'], 'review_notes': ['Verify teaching facts']}), 'eval_count': 20})
    client = LocalAI(settings, httpx.Client(base_url=settings.ollama_host, transport=httpx.MockTransport(response)))
    first = client.draft(db, site, 'Review this guide', 'Existing factual content')
    db.flush()
    second = client.draft(db, site, 'Review this guide', 'Existing factual content')
    assert first['engine'] == 'local Ollama' and second['cached']
    assert len(calls) == 1


def test_chatgpt_export_import_validates_sources_and_rejects_commands(local_workspace):
    db, site, _, _ = local_workspace
    page = Page(tenant_id=site.tenant_id, site_id=site.id, url='https://example.com/guide', title='Source', text='An original source answer with reference context.')
    db.add(page)
    db.flush()
    exported = export_prompt(db, site, 'Review this existing page', page.id)
    db.flush()
    output = {'export_id': exported['export_id'], 'site_id': site.id, 'recommendations': [{'title': 'Clarify the source answer', 'kind': 'content',
        'url': page.url, 'rationale': 'The definition should be easier to find.', 'suggestion': 'Move the existing definition into the opening paragraph.', 'source_ids': [page.id]}]}
    invalid = {**output, 'shell_command': 'deploy'}
    with pytest.raises(ValidationError):
        RecommendationBundle.model_validate(invalid)
    unknown = json.loads(json.dumps(output))
    unknown['recommendations'][0]['source_ids'] = ['invented-source']
    with pytest.raises(ValueError):
        import_recommendations(db, site, RecommendationBundle.model_validate(unknown))
    credentialed = json.loads(json.dumps(output))
    credentialed['recommendations'][0]['url'] = 'https://:private-password@example.com/guide'
    with pytest.raises(ValueError):
        import_recommendations(db, site, RecommendationBundle.model_validate(credentialed))
    assert import_recommendations(db, site, RecommendationBundle.model_validate(output))['imported'] == 1
    with pytest.raises(ValueError):
        import_recommendations(db, site, RecommendationBundle.model_validate(output))
