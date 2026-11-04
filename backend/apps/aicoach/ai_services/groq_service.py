"""Groq (optional fallback provider) through its OpenAI-compatible chat completions endpoint. Free-tier limits apply."""
import time

from django.conf import settings

from .base_provider import AIResult, post_json
from .errors import AIBadResponse, AINotConfigured

ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'


class GroqService:
    name = 'groq'

    def __init__(self, api_key=None, model=None, timeout=None, max_retries=None):
        self.api_key = settings.GROQ_API_KEY if api_key is None else api_key
        self.model = model or settings.GROQ_MODEL
        self.timeout = timeout or settings.AI_REQUEST_TIMEOUT
        self.max_retries = settings.AI_MAX_RETRIES if max_retries is None else max_retries

    @property
    def configured(self):
        return bool(self.api_key)

    def generate(self, system, prompt, *, max_output_tokens=2048, temperature=0.4):
        if not self.configured:
            raise AINotConfigured('GROQ_API_KEY is not set')
        body = {
            'model': self.model,
            'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}],
            'temperature': temperature,
            'max_completion_tokens': max_output_tokens,
            'response_format': {'type': 'json_object'},  # JSON mode needs the word "JSON" in the prompt; the base system prompt has it
        }
        started = time.monotonic()
        data = post_json(self.name, ENDPOINT, {'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'},
                         body, timeout=self.timeout, max_retries=self.max_retries)
        latency = int((time.monotonic() - started) * 1000)
        choices = data.get('choices') or []
        if not choices:
            raise AIBadResponse('groq returned no choices')
        choice = choices[0]
        if choice.get('finish_reason') == 'length':
            raise AIBadResponse('groq output was cut off (length)')
        text = (choice.get('message') or {}).get('content') or ''
        if not text.strip():
            raise AIBadResponse('groq returned no text')
        usage = data.get('usage') or {}
        return AIResult(text, self.name, self.model, int(usage.get('prompt_tokens') or 0), int(usage.get('completion_tokens') or 0), latency)
