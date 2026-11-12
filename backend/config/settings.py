import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import Csv, config
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
RELEASE_SHA = config('RELEASE_SHA', default='development')

DELIBERATELY_INSECURE_KEY = 'django-insecure-dev-key-change-me'
TESTING = 'test' in sys.argv
# Fail closed: production must set DEBUG=False explicitly (or leave it out entirely).
# Tests and local runserver (with DEBUG=True in backend/.env) still work without extra setup.
DEBUG = config('DEBUG', default=TESTING, cast=bool)
SECRET_KEY = config('SECRET_KEY', default='')
if not SECRET_KEY:
    if DEBUG or TESTING:
        SECRET_KEY = DELIBERATELY_INSECURE_KEY
    else:
        raise ImproperlyConfigured(
            'SECRET_KEY must be set when DEBUG is False. Generate one with '
            '`python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`.'
        )
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'apps.accounts',
    'apps.courses',
    'apps.leads',
    'apps.payments',
    'apps.enrollments',
    'apps.adminpanel',
    'apps.tutors',
    'apps.content',
    'apps.shop',
    'apps.jobs',
    'apps.aicoach',
    'apps.gigs',
    'apps.learning',
    'apps.studio',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# DRF throttles are only as strong as the cache behind them. The default LocMemCache is
# per-process, so with several Gunicorn workers the real limit is multiplied and resets on
# deploy. A file cache is shared by every worker on this single host; set CACHE_BACKEND to
# a Redis backend (with CACHE_LOCATION) if the app is ever scaled across machines.
CACHES = {
    'default': {
        'BACKEND': config('CACHE_BACKEND', default='django.core.cache.backends.filebased.FileBasedCache'),
        'LOCATION': config('CACHE_LOCATION', default=str(BASE_DIR / '.cache')),
        'TIMEOUT': 300,
    }
}

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173',
    cast=Csv(),
)

# Behind the nginx reverse proxy in production, which sets this header.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
# On by default whenever DEBUG is off; an explicit env value still wins.
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=not DEBUG, cast=bool)
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=not DEBUG, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=not DEBUG, cast=bool)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # the Django admin reads this cookie client-side

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/min',
        'user': '120/min',
        'shop_free_download': '10/hour',
        'quiz_attempt': '60/hour',
        'ai_burst': '10/min',
        'resume_upload': '10/hour',
        'gigs_write': '20/hour',
        'gigs_report': '5/hour',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    # A rotated or explicitly logged-out refresh token must stop working. This requires the
    # token_blacklist app above (its tables are created by the normal migrate on deploy).
    'BLACKLIST_AFTER_ROTATION': True,
}

# All 30 interview-prep days are open: learners can open and complete any day. Set to True to make days unlock
# one at a time once the previous day is complete; the server then enforces it and tells the frontend through
# the /courses/prep/<slug>/ outline (`sequential_unlock`).
PREP_REQUIRE_SEQUENTIAL_UNLOCK = config('PREP_REQUIRE_SEQUENTIAL_UNLOCK', default=False, cast=bool)

# --- AI features (apps.aicoach) ---
# Keys come from the environment only (backend/.env locally, SSM Parameter Store in production) and never reach the frontend.
# Model names are configurable because free-tier model availability changes; check what your key can use.
GEMINI_API_KEY = config('GEMINI_API_KEY', default='')
# GEMINI_MODEL / GROQ_MODEL may list several models separated by commas; they are tried in that order before the next provider.
# Defaults were checked against a live key: free-tier Gemini flash models often answer 503 (high demand), so a lighter model follows.
GEMINI_MODEL = config('GEMINI_MODEL', default='gemini-3.5-flash,gemini-3.5-flash-lite')  # gemini-2.5-flash is closed to new users
GROQ_API_KEY = config('GROQ_API_KEY', default='')
GROQ_MODEL = config('GROQ_MODEL', default='openai/gpt-oss-120b')  # checked against a live key; llama-3.3-70b-versatile is no longer offered
AI_PROVIDER_ORDER = config('AI_PROVIDER_ORDER', default='gemini,groq', cast=Csv())  # first = primary, rest = fallbacks
AI_REQUEST_TIMEOUT = config('AI_REQUEST_TIMEOUT', default=20, cast=int)  # seconds per provider call
AI_TOTAL_BUDGET = config('AI_TOTAL_BUDGET', default=45, cast=int)  # seconds for one request across all providers
AI_MAX_RETRIES = config('AI_MAX_RETRIES', default=1, cast=int)  # retries for network errors / 5xx only; quota errors are never retried
AI_DAILY_LIMIT_PER_USER = config('AI_DAILY_LIMIT_PER_USER', default=30, cast=int)  # successful AI calls per user per day
AI_GLOBAL_DAILY_LIMIT = config('AI_GLOBAL_DAILY_LIMIT', default=1000, cast=int)  # across all users, protects the shared free quota

RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET', default='')
RAZORPAY_WEBHOOK_SECRET = config('RAZORPAY_WEBHOOK_SECRET', default='')

# Without this, Django's default logging config routes request-handling
# errors (including unhandled 500s) to AdminEmailHandler only, which is a
# no-op without a working email backend/ADMINS — they'd vanish silently
# instead of showing up in `docker logs`.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django.request': {'handlers': ['console'], 'level': 'ERROR', 'propagate': False},
    },
}

# --- Blog / case studies ---
SITE_URL = config('SITE_URL', default='https://codinghubs.in').rstrip('/')
MEDIA_URL = '/media/'
MEDIA_ROOT = config('MEDIA_ROOT', default=str(BASE_DIR / 'media'))
# Where the backend fetches the built SPA shell from to wrap server-rendered blog pages (see apps/content/ssr.py).
FRONTEND_SHELL_URL = config('FRONTEND_SHELL_URL', default='')

# --- Projects, guides and store ---
PRIVATE_MEDIA_ROOT = config('PRIVATE_MEDIA_ROOT', default=str(BASE_DIR / 'private_media'))
STORE_DOWNLOAD_LINK_TTL = config('STORE_DOWNLOAD_LINK_TTL', default=600, cast=int)  # seconds a download link stays valid
STORE_PENDING_ORDER_MINUTES = config('STORE_PENDING_ORDER_MINUTES', default=30, cast=int)  # unpaid orders release stock after this
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Coding Hubs <no-reply@codinghubs.in>')

if TESTING:  # fast, isolated settings for the test suite only
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}

# Staged marketplace pilot. Keep disabled until moderation and launch policies are ready.
GIGS_ENABLED = config('GIGS_ENABLED', default=False, cast=bool)

# Interview Studio: server-only credentials; disabled until configured.
STUDIO_AI_KEY = config('STUDIO_AI_KEY', default='')
STUDIO_AI_MODEL = config('STUDIO_AI_MODEL', default='')
STUDIO_AI_URL = config('STUDIO_AI_URL', default='https://api.openai.com/v1/responses')
STUDIO_EXECUTION_ENABLED = config('STUDIO_EXECUTION_ENABLED', default=False, cast=bool)
STUDIO_PYTHON_IMAGE = config('STUDIO_PYTHON_IMAGE', default='python:3.12-alpine')
STUDIO_NODE_IMAGE = config('STUDIO_NODE_IMAGE', default='node:22-alpine')
STUDIO_EMBEDDING_MODEL = config('STUDIO_EMBEDDING_MODEL', default='')
STUDIO_EMBEDDING_URL = config('STUDIO_EMBEDDING_URL', default='https://api.openai.com/v1/embeddings')
STUDIO_DAILY_AI_CALLS = config('STUDIO_DAILY_AI_CALLS', default=100, cast=int)
STUDIO_RETENTION_DAYS = config('STUDIO_RETENTION_DAYS', default=180, cast=int)
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].update({'studio_ai': '12/min', 'studio_run': '10/min'})
