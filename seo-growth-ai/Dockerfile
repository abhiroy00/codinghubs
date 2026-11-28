FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json frontend/.npmrc ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN npm run build

FROM ghcr.io/astral-sh/uv:0.11.29-python3.13-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium postgresql-client ca-certificates nodejs && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 10001 seo
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY app/ app/
COPY scripts/ scripts/
COPY migrations/ migrations/
COPY alembic.ini ./
COPY --from=frontend /build/dist frontend/dist
COPY --from=frontend /build/node_modules frontend/node_modules
RUN mkdir /app/.state && chown -R seo:seo /app/.state
USER seo
ENV SEO_CHROME_EXECUTABLE=/usr/bin/chromium OLLAMA_NO_CLOUD=1 LANGSMITH_TRACING=false LANGCHAIN_TRACING_V2=false OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
CMD ["/app/.venv/bin/uvicorn", "app.main:create_app", "--factory", "--host", "127.0.0.1", "--port", "8765", "--no-access-log"]
