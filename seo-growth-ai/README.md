# CodingHubs local SEO workspace

Independent, localhost-only React/FastAPI application. Production website files and hosting stay separate.

Start from this directory: `uv sync --frozen`, build with `cd frontend && npm ci --ignore-scripts && npm run build`, return here and run `./scripts/start.sh`. Native prerequisites and private database/model/worker setup are documented in [LOCAL_AI_SETUP.md](../LOCAL_AI_SETUP.md).

Open http://127.0.0.1:8765. First launch creates a local owner. Import GSC CSV/XLSX, review measured opportunities, run bounded permitted crawls, use local knowledge/drafts, export manually to ChatGPT and review proposed Git changes. There are no paid model providers or automatic publication/deployment paths.

```sh
.venv/bin/python -m pytest
.venv/bin/ruff check app scripts tests
cd frontend
npm test
npm run build
npm run test:e2e
```

Browser tests use an explicitly isolated temporary SQLite database on 8766, real local Chrome and a test-only website transport. They do not use production credentials or mutate the real workspace. Installed Chrome is required; native mobile rendering also uses Chrome. Native PostgreSQL/Ollama integration and source-data evidence are recorded separately in [FINAL_TEST_REPORT.md](../FINAL_TEST_REPORT.md).

Architecture, integrations, hardware and remaining external prerequisites: [architecture](../ZERO_COST_ARCHITECTURE.md), [free integrations](../FREE_INTEGRATIONS.md), [hardware](../HARDWARE_REQUIREMENTS.md), [implementation status](../MASTER_IMPLEMENTATION_STATUS.md). No secrets, models, private exports or backups belong in Git.
