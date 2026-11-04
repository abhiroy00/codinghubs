"""Google Gemini (primary provider) through the REST generateContent endpoint. Free-tier quotas apply."""
import time

from django.conf import settings

from .base_provider import AIResult, post_json
from .errors import AIBadResponse, AINotConfigured

ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'


class GeminiService:
    name = 'gemini'

    def __init__(self, api_key=None, model=None, timeout=None, max_retries=None):
        self.api_key = settings.GEMINI_API_KEY if api_key is None else api_key
        self.model = model or settings.GEMINI_MODEL
        self.timeout = timeout or settings.AI_REQUEST_TIMEOUT
        self.max_retries = settings.AI_MAX_RETRIES if max_retries is None else max_retries

    @property
    def configured(self):
        return bool(self.api_key)

    def generate(self, system, prompt, *, max_output_tokens=2048, temperature=0.4):
        if not self.configured:
            raise AINotConfigured('GEMINI_API_KEY is not set')
        body = {
            'systemInstruction': {'parts': [{'text': system}]},
            'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
            'generationConfig': {'responseMimeType': 'application/json', 'temperature': temperature, 'maxOutputTokens': max_output_tokens},
        }
        started = time.monotonic()
        # The key goes in a header, not the URL, so it can never end up in a logged URL.
        data = post_json(self.name, ENDPOINT.format(model=self.model), {'x-goog-api-key': self.api_key, 'Content-Type': 'application/json'},
                         body, timeout=self.timeout, max_retries=self.max_retries)
        latency = int((time.monotonic() - started) * 1000)
        block = (data.get('promptFeedback') or {}).get('blockReason')
        if block:
            raise AIBadResponse(f'gemini blocked the prompt ({block})')
        candidates = data.get('candidates') or []
        if not candidates:
            raise AIBadResponse('gemini returned no candidates')
        candidate = candidates[0]
        if candidate.get('finishReason') == 'MAX_TOKENS':
            raise AIBadResponse('gemini output was cut off (MAX_TOKENS)')
        # Newer Gemini models may return reasoning ("thought") parts; only the answer parts are the JSON we want.
        text = ''.join(part.get('text', '') for part in (candidate.get('content') or {}).get('parts', []) if isinstance(part, dict) and not part.get('thought'))
        if not text.strip():
            raise AIBadResponse(f'gemini returned no text (finishReason={candidate.get("finishReason")})')
        usage = data.get('usageMetadata') or {}
        # Thinking tokens are billed against the free quota and count towards maxOutputTokens, so report them as output.
        output_tokens = int(usage.get('candidatesTokenCount') or 0) + int(usage.get('thoughtsTokenCount') or 0)
        return AIResult(text, self.name, self.model, int(usage.get('promptTokenCount') or 0), output_tokens, latency)
