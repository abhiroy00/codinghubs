"""Single entry point for AI calls: `generate_json(...)`.

Order of work: enforce the daily limits, try each configured provider in AI_PROVIDER_ORDER (Gemini first, Groq as
fallback), parse and validate the JSON, and record every attempt in AIUsage. A provider that is rate limited, down,
misconfigured or returns unusable output is skipped for that call. Nothing here retries a quota error, and the whole
call stays inside AI_TOTAL_BUDGET seconds so a web worker is never held for long.
"""
import logging
import time
from dataclasses import dataclass

from django.conf import settings
from django.utils import timezone

from ..models import AIUsage
from .errors import (AIAllProvidersFailed, AIBadResponse, AIDailyLimitReached, AINotConfigured, AIRateLimited, AIUnavailable)
from .gemini_service import GeminiService
from .groq_service import GroqService
from .response_parser import parse_and_validate

logger = logging.getLogger(__name__)

PROVIDERS = {GeminiService.name: GeminiService, GroqService.name: GroqService}
STATUS_FOR_ERROR = [
    (AIRateLimited, AIUsage.RATE_LIMITED), (AIUnavailable, AIUsage.UNAVAILABLE),
    (AINotConfigured, AIUsage.NOT_CONFIGURED), (AIBadResponse, AIUsage.INVALID),
]


@dataclass
class AIResponse:
    data: dict
    provider: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0


MODEL_SETTING = {GeminiService.name: 'GEMINI_MODEL', GroqService.name: 'GROQ_MODEL'}


def provider_chain():
    """Configured services in the order set by AI_PROVIDER_ORDER; a provider with several comma-separated models expands to one entry per model."""
    chain = []
    for name in settings.AI_PROVIDER_ORDER:
        name = name.strip().lower()
        if name not in PROVIDERS:
            continue
        for model in [m.strip() for m in str(getattr(settings, MODEL_SETTING[name])).split(',') if m.strip()]:
            service = PROVIDERS[name](model=model)
            if service.configured:
                chain.append(service)
    return chain


def check_limits(user):
    """Raise AIDailyLimitReached when the site-wide or this user's daily number of successful AI calls is used up."""
    today = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
    done = AIUsage.objects.filter(status=AIUsage.OK, created_at__gte=today)
    if done.count() >= settings.AI_GLOBAL_DAILY_LIMIT:
        raise AIDailyLimitReached('site-wide daily AI limit reached', user_message='AI features are very busy today. Please try again tomorrow.')
    if user is not None and done.filter(user=user).count() >= settings.AI_DAILY_LIMIT_PER_USER:
        raise AIDailyLimitReached('per-user daily AI limit reached')


def _record(user, feature, provider, status, *, model='', result=None, started=None, error=''):
    try:
        AIUsage.objects.create(
            user=user, feature=feature, provider=provider, model=model or getattr(result, 'model', ''), status=status,
            prompt_tokens=getattr(result, 'prompt_tokens', 0), completion_tokens=getattr(result, 'completion_tokens', 0),
            latency_ms=getattr(result, 'latency_ms', 0) or (int((time.monotonic() - started) * 1000) if started else 0),
            error=str(error)[:200],
        )
    except Exception:  # bookkeeping must never turn a successful AI answer into an error
        logger.exception('Could not record AI usage')


def _status_for(error):
    return next((status for cls, status in STATUS_FOR_ERROR if isinstance(error, cls)), AIUsage.UNAVAILABLE)


def generate_json(*, feature, system, prompt, schema, user=None, max_output_tokens=4096, temperature=0.4, providers=None):
    """Ask the AI for a JSON object matching `schema`. Returns AIResponse; raises AIDailyLimitReached or AIAllProvidersFailed.

    `max_output_tokens` must leave room for the model's hidden reasoning (Gemini 3.x and gpt-oss spend hundreds of tokens
    thinking before they answer); a budget that is too small shows up as a cut-off, unusable reply.
    """
    check_limits(user)
    chain = provider_chain() if providers is None else providers
    if not chain:
        raise AIAllProvidersFailed('not_configured', ['no AI provider is configured'])
    began = time.monotonic()
    statuses, reasons = [], []
    for index, service in enumerate(chain):
        if index and time.monotonic() - began + service.timeout > settings.AI_TOTAL_BUDGET:
            statuses.append(AIUsage.UNAVAILABLE)
            reasons.append(f'{service.name}/{service.model}: skipped, out of time')
            break
        started = time.monotonic()
        try:
            result = service.generate(system, prompt, max_output_tokens=max_output_tokens, temperature=temperature)
            data = parse_and_validate(result.text, schema)
        except (AIRateLimited, AIUnavailable, AINotConfigured, AIBadResponse) as error:
            status = _status_for(error)
            _record(user, feature, service.name, status, model=service.model, started=started, error=error)
            statuses.append(status)
            reasons.append(f'{service.name}/{service.model}: {error}')
            logger.warning('AI provider %s (%s) failed for %s: %s', service.name, service.model, feature, error)
            continue
        _record(user, feature, service.name, AIUsage.OK, result=result)
        return AIResponse(data, result.provider, result.model, result.prompt_tokens, result.completion_tokens)
    if all(s == AIUsage.RATE_LIMITED for s in statuses):
        kind = 'busy'
    elif all(s == AIUsage.INVALID for s in statuses):
        kind = 'invalid'
    elif all(s == AIUsage.NOT_CONFIGURED for s in statuses):
        kind = 'not_configured'
    else:
        kind = 'unavailable'
    raise AIAllProvidersFailed(kind, reasons)
