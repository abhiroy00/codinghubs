# Hardware and model selection

Measured on 29 November 2026 before the model setup: macOS arm64, Apple M1, 8 GiB unified RAM, 8 logical CPU cores, 7 GPU cores with Metal support, approximately 16 GiB free disk on a 228 GiB volume. This describes this machine, not a universal minimum. Live utilization varies; GPU utilization is shown as unavailable when a sensor cannot be read.

| Profile | Crawl concurrency / page cap | Context / output cap | Intended use |
|---|---:|---:|---|
| lightweight (selected) | 1 / 30 | 2,048 / 384 tokens | This 8 GiB host, one local model operation at a time, native worker |
| standard | 2 / 150 | 4,096 / 768 tokens | More free memory; optional Celery; benchmark before adopting |
| advanced | 4 / 500 | 8,192 / 1,024 tokens | Larger host, explicit resource review; not benchmarked here |

No profile guarantees a model will fit. Quantized weights, context/KV memory, browser, OS and other running apps all matter. Avoid parallel browser/model jobs on this host. The runtime allows one loaded model and one generation/embedding operation, unloads after requests, batches at most 16 chunks and retains content-hash caches. Close unnecessary applications before larger crawls or models.

## Candidate assessment

| Candidate | Decision | License / evidence |
|---|---|---|
| Qwen3 0.6B Q4_K_M | Selected; small local draft model with strict schema and human review | [Apache-2.0 model card](https://huggingface.co/Qwen/Qwen3-0.6B); installed and benchmarked |
| Llama 3.2 1B Instruct | Configurable alternative; not downloaded or benchmarked | [Llama 3.2 Community License/model terms](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct); requires separate license/use-policy assessment |
| Gemma 3 1B IT | Configurable alternative; not downloaded or benchmarked | [Gemma model card](https://huggingface.co/google/gemma-3-1b-it) and [Gemma terms](https://ai.google.dev/gemma/terms); custom terms require review |
| Mistral 7B Instruct v0.3 quantized | Not selected for this multitasking 8 GiB machine; substantially larger memory requirement | [Apache-2.0 model card](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3); not downloaded or benchmarked |
| Nomic Embed Text v1.5 | Selected local 768-dimension embedding model | [Apache-2.0 model card](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5); installed and exercised |

This is a hardware/license screening, not a comparative model-quality benchmark. The small Qwen model produces review material, not dependable expert technical validation. Complex code/factual claims need framework tests and a human/manual ChatGPT review. Larger models are never downloaded automatically.

## Actual benchmark

Private evidence: `seo-growth-ai/.state/model-benchmark.json`. Qwen generated 27 tokens in a request taking **1.902 seconds**, approximately **95.43 decode tokens/second**; Nomic returned **768 dimensions**. This is one local sample, not a quality, throughput or latency guarantee. Actual browser workflows subsequently generated a structured local draft and retrieved from real pgvector embeddings.

During implementation, private state was about 831 MiB, Python environment 370 MiB and frontend dependencies 361 MiB, excluding globally installed binaries/caches and existing website dependencies. These sizes grow with uploads, history and backups. Setup requires at least 2 GiB free before model download; retain additional room for database/backups. Optional Docker images/monitoring need considerably more disk and memory and were not run on this host.
