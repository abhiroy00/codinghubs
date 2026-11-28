# Run and maintain the local SEO workspace

The verified app is **http://127.0.0.1:8765/**. Commands below run from `seo-growth-ai/`. Python 3.12+ and Node 22+ are required; actual verification used Python 3.13.9 and Node 22.20.0. Never run the launcher with sudo or point it at the existing website database.

## Native startup

On this Mac, PostgreSQL 18.3, pgvector 0.8.7 and Ollama 0.40.17 are installed. For a new macOS environment, use free Homebrew packages (`postgresql@18`, `pgvector`, `ollama`) and make the PostgreSQL binaries available in PATH. Linux needs the equivalent local PostgreSQL/pgvector packages. Install uv separately if needed. No global Homebrew service is required.

```sh
cd seo-growth-ai
uv sync --frozen
cd frontend
npm ci --ignore-scripts
npm run build
cd ..
./scripts/start.sh
```

The launcher initializes only its own `.state/pgdata`, restricted `.state/pgsock`, bootstrap/app roles and database, enables vector, applies migrations, then starts API/Ollama/worker. App connections use a private SCRAM password and a non-superuser role. Ports: API 8765, PostgreSQL 55432, Ollama 11435; each binds loopback. Frontend production files are served by FastAPI. The native worker also owns the durable scheduler.

```sh
.venv/bin/python scripts/services.py status
.venv/bin/python -m app.cli health
.venv/bin/python scripts/services.py stop
```

Stopping validates this project's process ownership; it does not stop the pre-existing website, Redis or other PostgreSQL clusters. Startup is manual; no host login/system daemon was installed. Jobs cannot run when the Mac is off. Keep the working directory in place while services run.

First launch offers owner creation. This installation's owner is `nishant`; the generated password is in private `.state/initial-login.json` (mode 600), never in source or these documents. Use **System & privacy → Change local password**. Later password changes make that original setup record stale. OS-owner recovery is `.venv/bin/python -m app.cli reset-password --username nishant` with an interactive prompt; existing sessions are revoked. Do not share `.state` or the password file.

## Explicit local models

```sh
.venv/bin/python scripts/setup_models.py --download
```

This explicit command downloads Qwen3 0.6B and Nomic Embed Text v1.5 into private local Ollama storage and benchmarks generation/embeddings. Application startup and jobs never pull models. The app works using deterministic rules/lexical retrieval when Ollama is absent. Existing ChatGPT subscription usage is manual only.

Copy `.env.example` to `.env` for non-secret settings. Use `SEO_PROFILE=lightweight`, `SEO_LOCAL_MODEL=qwen3:0.6b`, `SEO_EMBEDDING_MODEL=nomic-embed-text:v1.5`, and `SEO_AI_ENABLED=false` to deliberately use deterministic fallback. Choose only an explicitly downloaded local model after checking its terms/hardware. The database vector schema expects 768 dimensions; changing embedding dimension requires a planned migration/reindex, not only an environment edit. Ollama stays at `http://127.0.0.1:11435`; `OLLAMA_NO_CLOUD=1`, one loaded model and zero keep-alive apply. Mandatory free-policy switches cannot be disabled.

## Separate development processes

After initializing the private database, environment loading must preserve its generated URL without printing it. Run the launcher for database/Ollama/worker and a separate frontend dev server with `cd frontend && npm run dev` at 127.0.0.1:5188; Vite proxies `/api` to 8765. For a manually managed API/worker/migration, use a Python wrapper rather than sourcing/evaluating secrets:

```sh
.venv/bin/python - <<'PY'
import os, subprocess, sys
from scripts.services import environment
subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'], env=environment(), check=True)
PY
```

Replace the subprocess arguments with `['...python...', '-m', 'uvicorn', 'app.main:create_app', '--factory', '--host', '127.0.0.1', '--port', '8765']` for API or `[sys.executable, '-m', 'app.worker']` for native worker/scheduler. Do not run duplicate processes on those ports. Frozen migrations are mandatory; SQLite schema creation is a test helper, not the native deployment path.

## Optional Valkey/Celery

The existing system Redis is preserved. This Mac's Homebrew Redis/Valkey formula linking conflicted, so the verified Valkey bottle was extracted into this project's ignored private tools directory. To reproduce when needed:

```sh
HOMEBREW_NO_AUTO_UPDATE=1 brew fetch valkey
.venv/bin/python scripts/setup_valkey.py
.venv/bin/python scripts/services.py stop
SEO_EXECUTOR=celery .venv/bin/python scripts/services.py start
```

The script uses only the verified cached bottle, fixes macOS library references and retains its license. Private Valkey config requires authentication, binds 127.0.0.1:56379, caps memory at 64 MB and uses AOF/noeviction. Celery runs solo/concurrency one and Beat pumps durable SQL tasks every ten seconds. To return to native lightweight mode, stop this app and start without `SEO_EXECUTOR=celery`. Restart clears neither database nor import history. This optional mode was actually exercised.

## Git review and manual ChatGPT

The local CodingHubs repository is registered for the installed owner's site. For another exact approved root, set `SEO_REPO_ROOTS` as a JSON list of absolute roots, then explicitly register it with `.venv/bin/python -m app.cli register-repo --site SITE_ID --path /absolute/repo`. The UI lists approved files/source mapping, previews exact-hash diffs and requires separate approval before a clean feature-branch apply. Review and run the site's framework tests. The proposal's built-in checks are syntax/diff checks. No generated content is auto-published.

`prepare-pr --proposal ID` creates a local PR-description file without remote requests. `pr` additionally requires all four explicit authorization flags shown by `--help`; it blocks unknown/private billing accounts and potentially paid/deploying workflows. No PR/push is part of the default workflow. Rollback refuses unrelated changes.

Content studio's Export to ChatGPT prepares a prompt locally. Review for private information before manually copying. Paste strict JSON recommendations back into the import form; source IDs, website, expiry and one-use export are checked. This does not log into ChatGPT or call its paid API.

## Backup, restore exercise and metrics

Pause active jobs/writers and create a backup from System & privacy or:

```sh
.venv/bin/python -m app.cli backup
.venv/bin/python -m app.cli restore-test --file .state/backups/BACKUP_FILENAME.zip
```

The restore exercise creates a disposable database in this private native cluster, verifies checksums/table counts/vector schema, then drops only that disposable database. It does not overwrite the running database. Production recovery should stop writers, preserve the current state, restore into a separate new database with compatible PostgreSQL/pgvector, verify it, and switch the configured connection deliberately. Rehearse before replacing data.

Archive original uploads and encrypted credentials together with a separately protected `.state/master.key` and runtime configuration if long-term recovery is needed. The ordinary ZIP deliberately excludes those secret files, models, screenshots and logs. Losing the master key means Google credentials cannot be decrypted and must be reauthorized. Never commit backups or keys.

`/api/metrics` requires the private bearer token in `.state/metrics.token`; do not put it in a URL. Resource dashboard readings are local measurements; unknown GPU/external spending stays unknown. Metadata-only logs are in `.state/logs/`. Stop this app before maintenance, preserve the logs needed for diagnosis, and manage retention according to local disk capacity.

## Optional Linux Docker Engine

`Dockerfile`, `compose.yaml` and `deploy/` provide a separate Linux host-network profile. It is **configuration-only/unverified on this Mac**, where Docker's daemon is unavailable. Host networking is intentional because the app rejects remote DB/Ollama hosts. No Docker Desktop subscription or cloud host is required. Native setup above is the tested path.

On a separately reviewed Linux host with free Docker Engine/Compose, stop native services, run `python scripts/setup_compose.py`, grant UID 10001 ownership/access to `.state/compose/app`, and use `docker compose run --rm migrate` followed by `docker compose up -d api worker ollama`. This creates a separate PostgreSQL 15 data directory compatible with the container's dump client; it does not mount the native PostgreSQL 18 cluster. Download models explicitly into the Compose Ollama store. Validate image availability, licenses, advisories, Chromium sandbox/kernel support and private bindings before relying on this untested path. Linux Chrome may need host user-namespace support; do not bypass its sandbox as a default fix.

Optional monitoring: `docker compose --profile monitoring up -d prometheus grafana`; loopback ports 9097/3007, anonymous Grafana disabled and generated admin password in private `.state/compose.env`. The bundled resource dashboard queries the private metrics endpoint. Monitoring data is ephemeral in this optional configuration. Docker backup restore requires a separately reviewed container recovery exercise; the native restore command targets only the native cluster.
