from django.utils.cache import patch_vary_headers


class PrivateAPICacheMiddleware:
    """Never let account responses or API error bodies enter a shared browser/proxy cache."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/api/'):
            if 'no-store' not in response.get('Cache-Control', ''):
                response['Cache-Control'] = 'private, no-store'
            patch_vary_headers(response, ['Authorization', 'Cookie'])
        return response
