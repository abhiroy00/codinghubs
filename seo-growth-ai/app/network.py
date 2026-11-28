"""Public GET transport with DNS pinning. Google/Ollama use separate fixed-purpose clients."""
import ipaddress
import socket
import re
import time
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx

MAX_BODY = 2_000_000


def canonical_url(url):
    parsed = urlsplit(url)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Only public HTTP(S) URLs without credentials are supported')
    if parsed.port not in (None, 443 if parsed.scheme == 'https' else 80):
        raise ValueError('Only standard web ports are supported')
    host = parsed.hostname.lower().rstrip('.')
    if '%' in host:
        raise ValueError('Scoped/encoded host addresses are not supported')
    if ':' in host:
        ipaddress.ip_address(host)
        host = '[' + host + ']'
    else:
        host = host.encode('idna').decode('ascii')
        if not re.fullmatch(r'[a-z0-9.-]+', host) or len(host) > 253:
            raise ValueError('Invalid public hostname')
    return urlunsplit((parsed.scheme, host, parsed.path or '/', parsed.query, ''))


class PublicTransport(httpx.BaseTransport):
    def __init__(self):
        self.transport = httpx.HTTPTransport(retries=0, trust_env=False)

    @staticmethod
    def validate(url):
        clean = canonical_url(str(url))
        host = urlsplit(clean).hostname
        if host in ('api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com'):
            raise ValueError('Paid AI endpoints are disabled')
        if (host == 'google.com' or host.endswith('.google.com')) and urlsplit(clean).path.startswith(('/search', '/complete', '/suggest', '/trends/api')):
            raise ValueError('Restricted search/suggestion endpoints are not supported; import permitted exports instead')
        if host in ('localhost', 'localhost.localdomain') or host.endswith(('.localhost', '.local', '.internal')):
            raise ValueError('Local and private network targets are forbidden')
        try:
            answers = socket.getaddrinfo(host, urlsplit(clean).port or (443 if clean.startswith('https:') else 80), type=socket.SOCK_STREAM)
        except OSError as error:
            raise ValueError('The public hostname could not be resolved') from error
        addresses = list(dict.fromkeys(answer[4][0] for answer in answers))
        if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
            raise ValueError('Every resolved address must be public')
        return clean, addresses

    def handle_request(self, request):
        clean, addresses = self.validate(request.url)
        hostname = urlsplit(clean).hostname
        headers = request.headers.copy()
        headers['Host'] = request.url.netloc.decode('ascii')
        pinned = httpx.Request(request.method, request.url.copy_with(host=addresses[0]), headers=headers,
                               stream=request.stream, extensions={**request.extensions, 'sni_hostname': hostname})
        return self.transport.handle_request(pinned)

    def close(self):
        self.transport.close()


class PublicWeb:
    def __init__(self, transport=None):
        self.client = httpx.Client(transport=transport or PublicTransport(), timeout=15, follow_redirects=False,
                                   trust_env=False, headers={'User-Agent': 'CodingHubsLocalSEO/0.1 (+owner-controlled audit)'})

    def get(self, url, origin=None, headers=None):
        url = canonical_url(url)
        if origin and urlsplit(url).netloc != urlsplit(origin).netloc:
            raise ValueError('URL must stay on the selected website')
        redirects = []
        for _ in range(6):
            with self.client.stream('GET', url, headers=headers) as response:
                if response.status_code in (301, 302, 303, 307, 308):
                    destination = canonical_url(urljoin(url, response.headers.get('location', '')))
                    if origin and urlsplit(destination).netloc != urlsplit(origin).netloc:
                        raise ValueError('Cross-site redirect requires a separately selected website')
                    redirects.append({'from': url, 'to': destination, 'status': response.status_code})
                    url = destination
                    continue
                parts, size, started = [], 0, time.monotonic()
                for part in response.iter_bytes():
                    size += len(part)
                    if size > MAX_BODY or time.monotonic() - started > 30:
                        raise ValueError('Page exceeds the 2 MB decompressed response limit')
                    parts.append(part)
                return {'url': url, 'status': response.status_code, 'headers': dict(response.headers),
                        'text': b''.join(parts).decode(response.encoding or 'utf-8', errors='replace'), 'redirects': redirects}
        raise ValueError('Redirect chain exceeds five hops')

    def close(self):
        self.client.close()
