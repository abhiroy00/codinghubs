"""Errors raised by the AI service layer. Messages are safe to show to users: they never contain keys, URLs or raw provider output."""


class AIError(Exception):
    user_message = 'The AI service could not complete this request. Please try again.'

    def __init__(self, detail='', *, user_message=None):
        super().__init__(detail or self.user_message)
        if user_message:
            self.user_message = user_message


class AINotConfigured(AIError):
    """No API key for the provider, or the provider rejected the key (401/403)."""
    user_message = 'The AI service is not set up yet.'


class AIRateLimited(AIError):
    """The provider's free-tier quota or rate limit was hit (HTTP 429). Never retried."""
    user_message = 'The AI service is busy right now. Please try again in a few minutes.'

    def __init__(self, detail='', *, retry_after=None, **kwargs):
        super().__init__(detail, **kwargs)
        self.retry_after = retry_after


class AIUnavailable(AIError):
    """Timeout, network failure or a 5xx from the provider."""
    user_message = 'The AI service is temporarily unavailable. Please try again shortly.'


class AIBadResponse(AIError):
    """The provider answered, but not with usable output (blocked, truncated, not JSON, wrong shape)."""
    user_message = 'The AI returned an answer we could not use. Please try again.'


class AIDailyLimitReached(AIError):
    """Our own per-user or site-wide daily cap, which protects the shared free-tier quota."""
    user_message = 'You have reached the daily limit for AI features. Please come back tomorrow.'


class AIAllProvidersFailed(AIError):
    """Every configured provider failed. `kind` is one of not_configured, busy, unavailable, invalid."""

    def __init__(self, kind, reasons):
        super().__init__(f'{kind}: {"; ".join(reasons)}')
        self.kind = kind
        self.reasons = reasons
        self.user_message = {
            'not_configured': AINotConfigured.user_message,
            'busy': AIRateLimited.user_message,
            'unavailable': AIUnavailable.user_message,
            'invalid': AIBadResponse.user_message,
        }[kind]
