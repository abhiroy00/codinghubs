FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -m appuser && mkdir -p /app/media /app/private_media && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD curl -f http://localhost:8000/api/courses/ || exit 1

COPY --chown=appuser:appuser docker-entrypoint.sh /app/docker-entrypoint.sh
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
# gthread + a 90s timeout: an AI request can take up to AI_TOTAL_BUDGET (45s) and must not block a whole worker or be killed at gunicorn's 30s default.
# nginx waits 75s for /api/ (see frontend/nginx.conf), which is between the two.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--worker-class", "gthread", "--threads", "4", "--timeout", "90", "--access-logfile", "-", "--error-logfile", "-"]
