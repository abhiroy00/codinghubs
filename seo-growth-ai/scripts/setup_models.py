"""Explicit free local model download and benchmark; never called by app startup/jobs."""
import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'scripts'))


def main():
    from services import STATE, environment
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true', help='Explicitly download Qwen3 0.6B Q4_K_M and Nomic Embed Text 1.5')
    args = parser.parse_args()
    if not args.download:
        parser.error('Model downloads require the explicit --download flag; app startup never pulls models.')
    if shutil.disk_usage(ROOT).free < 2 * 1024**3:
        raise RuntimeError('At least 2 GiB free disk space is required before downloading models')
    executable = shutil.which('ollama')
    if not executable:
        raise RuntimeError('Install the free Ollama runtime first')
    for model in ['qwen3:0.6b', 'nomic-embed-text:v1.5']:
        subprocess.run([executable, 'pull', model], env=environment(), check=True)
    os.environ.update(environment())
    from app.config import Settings
    from app.knowledge import LocalAI
    client = LocalAI(Settings())
    started = time.monotonic()
    response = client.client.post('/api/generate', json={'model': 'qwen3:0.6b', 'prompt': 'Define retrieval augmented generation in one sentence. /no_think',
        'stream': False, 'think': False, 'keep_alive': 0, 'options': {'num_ctx': 2048, 'num_predict': 80, 'temperature': 0}})
    response.raise_for_status()
    payload = response.json()
    latency = time.monotonic() - started
    embeddings = client.embed(['Retrieval uses relevant documents before generating an answer.'])
    result = {'generation_model': 'qwen3:0.6b', 'embedding_model': 'nomic-embed-text:v1.5',
              'elapsed_seconds': round(latency, 3), 'eval_count': payload.get('eval_count'), 'eval_duration_ns': payload.get('eval_duration'),
              'tokens_per_second': payload.get('eval_count', 0) / (payload.get('eval_duration', 1) / 1e9),
              'embedding_dimensions': len(embeddings[0]), 'sample_answer': payload.get('response'),
              'limitations': 'Single local cold/warm-dependent sample, not an expert-quality evaluation; all content requires review.'}
    (STATE / 'model-benchmark.json').write_text(json.dumps(result, indent=2) + '\n')
    client.close()
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
