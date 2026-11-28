import pytest

from app.config import Settings
from app.network import PublicTransport, canonical_url
from app.security import Secrets


def test_paid_policy_cannot_be_overridden(tmp_path):
    with pytest.raises(ValueError):
        Settings(state_dir=tmp_path, ALLOW_PAID_APIS=True)
    with pytest.raises(ValueError):
        Settings(state_dir=tmp_path, SEO_LOCAL_MODEL='remote:cloud', local_model='remote:cloud')


@pytest.mark.parametrize('url', ['http://127.0.0.1', 'http://169.254.169.254/latest/meta-data/', 'http://[::1]', 'http://user:pass@example.com', 'file:///etc/passwd', 'https://example.com:8443', 'http://localhost'])
def test_public_fetch_rejects_private_or_credentialed_urls(url):
    with pytest.raises(ValueError):
        PublicTransport.validate(url)


def test_encrypted_secret_never_contains_plaintext(tmp_path):
    secrets = Secrets(tmp_path)
    encrypted = secrets.encrypt({'refresh_token': 'private-token'})
    assert 'private-token' not in encrypted
    assert secrets.decrypt(encrypted)['refresh_token'] == 'private-token'
    assert (tmp_path / 'master.key').stat().st_mode & 0o777 == 0o600


def test_url_normalization_preserves_meaningful_query_and_drops_fragment():
    assert canonical_url('https://EXAMPLE.com/a?q=one#section') == 'https://example.com/a?q=one'
