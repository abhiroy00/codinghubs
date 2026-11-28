from pathlib import Path
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[1]
PROFILES = {
    'lightweight': {'concurrency': 1, 'crawl_limit': 30, 'context': 2048, 'tokens': 384},
    'standard': {'concurrency': 2, 'crawl_limit': 150, 'context': 4096, 'tokens': 768},
    'advanced': {'concurrency': 4, 'crawl_limit': 500, 'context': 8192, 'tokens': 1024},
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix='SEO_', extra='ignore', env_file=ROOT / '.env')
    state_dir: Path = ROOT / '.state'
    database_url: str = 'sqlite:///' + str(ROOT / '.state' / 'local.sqlite3')
    profile: str = 'lightweight'
    ollama_host: str = 'http://127.0.0.1:11435'
    local_model: str = 'qwen3:0.6b'
    embedding_model: str = 'nomic-embed-text:v1.5'
    ai_enabled: bool = True
    trusted_hosts: list[str] = ['127.0.0.1', 'localhost', '[::1]']
    origins: list[str] = ['http://127.0.0.1:8765', 'http://localhost:8765', 'http://127.0.0.1:5188', 'http://localhost:5188']
    repo_roots: list[str] = [str(ROOT.parent)]
    google_redirect_uri: str = 'http://127.0.0.1:8765/api/google/callback'
    free_only_mode: bool = Field(True, validation_alias='FREE_ONLY_MODE')
    allow_paid_apis: bool = Field(False, validation_alias='ALLOW_PAID_APIS')
    monthly_external_api_budget_inr: int = Field(0, validation_alias='MONTHLY_EXTERNAL_API_BUDGET_INR')
    allow_cloud_provisioning: bool = Field(False, validation_alias='ALLOW_CLOUD_PROVISIONING')
    allow_automatic_paid_upgrade: bool = Field(False, validation_alias='ALLOW_AUTOMATIC_PAID_UPGRADE')

    @model_validator(mode='after')
    def free_policy(self):
        if not self.free_only_mode or self.allow_paid_apis or self.monthly_external_api_budget_inr != 0 or self.allow_cloud_provisioning or self.allow_automatic_paid_upgrade:
            raise ValueError('The zero-cost policy cannot be disabled in this application.')
        if self.profile not in PROFILES:
            raise ValueError('Unknown resource profile')
        for model in [self.local_model, self.embedding_model]:
            if 'cloud' in model.lower() or '/' in model or len(model) > 100:
                raise ValueError('Only explicitly configured local model names are permitted')
        host = urlsplit(self.ollama_host)
        if host.scheme != 'http' or host.hostname not in ('127.0.0.1', 'localhost', '::1') or host.username or host.query or host.path not in ('', '/'):
            raise ValueError('Ollama must be a localhost HTTP endpoint')
        if self.database_url.startswith('postgresql'):
            db = urlsplit(self.database_url)
            if db.hostname not in ('127.0.0.1', 'localhost', '::1'):
                raise ValueError('Only local PostgreSQL is permitted')
        elif not self.database_url.startswith('sqlite:///'):
            raise ValueError('Only local databases are permitted')
        self.state_dir = self.state_dir.resolve()
        self.state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.state_dir.chmod(0o700)
        return self

    @property
    def limits(self):
        return PROFILES[self.profile]
