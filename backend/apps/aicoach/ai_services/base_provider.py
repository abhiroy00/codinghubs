"""HTTP plumbing shared by the providers: timeouts, limited retries and error mapping.

Rules: a 429 (quota) is never retried; timeouts are not retried (they would double the wait); only network errors
and 5xx are retried, at most `max_retries` times. Error text never includes the request URL or headers.
"""
import time
from dataclasses import dataclass

import requests

from .errors import AIBadResponse, AINotConfigured, AIRateLimited, AIUnavailable


@dataclass
class AIResult:
    text: str
    provider: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: int = 0


def _retry_after(response):
    try:
        return max(0, int(float(response.headers.get('retry-after', ''))))
    except (TypeError, ValueError):
        return None


def post_json(provider, url, headers, body, *, timeout, max_retries):
    """POST `body` as JSON and return the decoded JSON reply, or raise an AIError."""
    attempt = 0
    while True:
        try:
            response = requests.post(url, headers=headers, json=body, timeout=timeout)
        except requests.Timeout:
            raise AIUnavailable(f'{provider} timed out after {timeout}s') from None
        except requests.RequestException as error:
            failure = AIUnavailable(f'{provider} network error ({type(error).__name__})')
        else:
            status = response.status_code
            if status == 200:
                try:
                    return response.json()
                except ValueError:
                    raise AIBadResponse(f'{provider} sent a reply that is not JSON') from None
            if status == 429:
                raise AIRateLimited(f'{provider} rate limit or quota reached', retry_after=_retry_after(response))
            if status in (401, 403):
                raise AINotConfigured(f'{provider} rejected the API key ({status})')
            if 400 <= status < 500:
                raise AIBadResponse(f'{provider} rejected the request ({status})')
            failure = AIUnavailable(f'{provider} server error ({status})')
        if attempt >= max_retries:
            raise failure
        attempt += 1
        time.sleep(min(0.5 * 2 ** attempt, 4))
