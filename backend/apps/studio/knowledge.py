"""Approved-document retrieval with replaceable embeddings and a transparent lexical fallback."""
import json
import math
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction
from django.db.models import F

from .ai import ProviderUnavailable
from .models import KnowledgeChunk, KnowledgeDocument

STOP_WORDS = {'the', 'and', 'for', 'with', 'how', 'what', 'why', 'does', 'that', 'this', 'from', 'can', 'you', 'explain'}


def tokens(text):
    return set(re.findall(r'[a-z]{3,}', text.lower())) - STOP_WORDS


def chunk_text(text, size=1200, overlap=160):
    """Bounded overlapping chunks; original text is retained for source inspection."""
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = min(len(text), start + size)
        if end < len(text):
            boundary = text.rfind(' ', start + size // 2, end)
            if boundary > start:
                end = boundary
        chunks.append(text[start:end].strip())
        if end == len(text):
            break
        start = max(start + 1, end - overlap)
    return chunks


class EmbeddingProvider:
    def embed(self, texts):
        if not settings.STUDIO_AI_KEY or not settings.STUDIO_EMBEDDING_MODEL:
            raise ProviderUnavailable('Embedding configuration is unavailable.')
        if not texts or len(texts) > 32 or any(not text or len(text) > 6000 for text in texts):
            raise ProviderUnavailable('Embedding input exceeds the configured bounds.')
        request = Request(settings.STUDIO_EMBEDDING_URL, data=json.dumps({'model': settings.STUDIO_EMBEDDING_MODEL, 'input': texts, 'encoding_format': 'float'}).encode(), headers={'Authorization': f'Bearer {settings.STUDIO_AI_KEY}', 'Content-Type': 'application/json'}, method='POST')
        try:
            with urlopen(request, timeout=20) as response:
                raw = response.read(4_000_001)
            if len(raw) > 4_000_000:
                raise ProviderUnavailable()
            data = json.loads(raw)['data']
            if not isinstance(data, list) or len(data) != len(texts):
                raise ValueError('Wrong embedding count')
            data = sorted(data, key=lambda row: row['index'])
            if [row['index'] for row in data] != list(range(len(texts))):
                raise ValueError('Wrong embedding indices')
            vectors = [row['embedding'] for row in data]
            dimensions = len(vectors[0])
            if not 1 <= dimensions <= 4096 or any(not isinstance(v, list) or len(v) != dimensions or any(type(x) not in [int, float] or not math.isfinite(x) for x in v) for v in vectors):
                raise ValueError('Invalid embedding vector')
            return vectors
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError, TypeError):
            raise ProviderUnavailable('The embedding provider failed. Approved keyword retrieval is still available.') from None


def index_document(document, embed=False):
    # Compute outside the transaction, then ensure the approved version is unchanged.
    source_version = document.version
    chunks = chunk_text(document.body)
    vectors = []
    if embed:
        for offset in range(0, len(chunks), 32):
            vectors.extend(EmbeddingProvider().embed(chunks[offset:offset+32]))
    with transaction.atomic():
        fresh = KnowledgeDocument.objects.select_for_update().get(pk=document.pk)
        if not fresh.approved or fresh.version != source_version:
            return 0
        fresh.chunks.all().delete()
        KnowledgeChunk.objects.bulk_create([KnowledgeChunk(document=fresh, position=i, text=chunk, source_version=source_version, embedding=vectors[i] if embed else [], embedding_model=settings.STUDIO_EMBEDDING_MODEL if embed else '') for i, chunk in enumerate(chunks)])
    return len(chunks)


def cosine(a, b):
    if len(a) != len(b) or not a:
        return 0.0
    denominator = math.sqrt(sum(x*x for x in a) * sum(y*y for y in b))
    return sum(x*y for x, y in zip(a, b)) / denominator if denominator else 0.0


def retrieve(query, topic=''):
    chunks = KnowledgeChunk.objects.filter(document__approved=True, source_version=F('document__version')).select_related('document')
    if topic:
        chunks = chunks.filter(document__topic=topic)
    # Bounded in-process scan is appropriate for this small catalog. Use a vector index before growing beyond this bound.
    candidates = list(chunks.order_by('id')[:2000])
    mode = 'keyword'
    scored = []
    embedded = [chunk for chunk in candidates if chunk.embedding and chunk.embedding_model == settings.STUDIO_EMBEDDING_MODEL]
    if settings.STUDIO_EMBEDDING_MODEL and embedded:
        try:
            vector = EmbeddingProvider().embed([query[:5000]])[0]
            scored = [(cosine(vector, chunk.embedding), chunk) for chunk in embedded]
            scored = [(score, chunk) for score, chunk in scored if score >= 0.25]
            mode = 'semantic'
        except ProviderUnavailable:
            mode = 'keyword-fallback'
    if mode != 'semantic':
        query_terms = tokens(query)
        for chunk in candidates:
            terms = tokens(chunk.document.title + ' ' + chunk.document.topic + ' ' + chunk.text)
            overlap = query_terms & terms
            if overlap:
                scored.append((len(overlap) / max(1, len(query_terms)), chunk))
    scored.sort(key=lambda pair: (-pair[0], pair[1].id))
    sources = []
    for score, chunk in scored[:4]:
        sources.append({'id': chunk.id, 'title': chunk.document.title, 'text': chunk.text, 'source': chunk.document.source, 'license': chunk.document.license, 'version': chunk.source_version, 'relevance': round(score, 4)})
    return sources, mode
