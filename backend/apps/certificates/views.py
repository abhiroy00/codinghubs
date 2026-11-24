from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Certificate, CertificateApplication, CertificateEvent, normalize_code
from .pdf import certificate_pdf, sample_pdf
from .serializers import ApplicationSerializer, OwnCertificateSerializer, PublicCertificateSerializer
from .services import certificate_from_token, download_link

NOINDEX = 'noindex, nofollow, noarchive'


def _private(response):
    response['Cache-Control'] = 'no-store'
    response['X-Robots-Tag'] = NOINDEX
    return response


def _pdf(data, filename, *, attachment):
    response = HttpResponse(data, content_type='application/pdf')
    response['Content-Disposition'] = f'{"attachment" if attachment else "inline"}; filename="{filename}"'
    response['X-Robots-Tag'] = NOINDEX
    return response


class VerifyView(APIView):
    """GET ?id=CH-XXXX-XXXX-XXXX. Rate limited per visitor; results are never cached or indexed."""
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = 'cert_verify'

    def get(self, request):
        code = normalize_code(request.query_params.get('id', ''))
        certificate = Certificate.objects.filter(code=code).first() if code else None
        if certificate is None:
            return _private(Response({'status': 'not_found'}, status=status.HTTP_404_NOT_FOUND))
        return _private(Response({'status': certificate.status, 'certificate': PublicCertificateSerializer(certificate).data}))


class SamplePdfView(APIView):
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def get(self, request):
        response = _pdf(sample_pdf(), 'coding-hubs-certificate-SAMPLE.pdf', attachment=False)
        response['Cache-Control'] = 'public, max-age=86400'
        return response


class MineView(APIView):
    """The signed-in learner's applications and institute certificates."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return _private(Response({
            'applications': ApplicationSerializer(CertificateApplication.objects.filter(user=request.user)[:50], many=True).data,
            'certificates': OwnCertificateSerializer(Certificate.objects.filter(user=request.user).exclude(status=Certificate.REPLACED), many=True).data,
        }))


class ApplyView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = 'cert_apply'

    def post(self, request):
        serializer = ApplicationSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        application = serializer.save(user=request.user)
        CertificateEvent.log('applied', request.user, application=application)
        return _private(Response(serializer.data, status=status.HTTP_201_CREATED))


class LinkView(APIView):
    """POST: a download link valid for 10 minutes, for the certificate's owner only."""
    permission_classes = (permissions.IsAuthenticated,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = 'cert_download'

    def post(self, request, code):
        certificate = Certificate.objects.filter(code=normalize_code(code), user=request.user).first()
        if certificate is None:
            return _private(Response({'detail': 'Certificate not found.'}, status=status.HTTP_404_NOT_FOUND))
        if certificate.status != Certificate.VALID:
            return _private(Response({'detail': 'This certificate is no longer valid and cannot be downloaded.'}, status=status.HTTP_409_CONFLICT))
        return _private(Response(download_link(certificate, request.user)))


class DownloadView(APIView):
    """GET ?t=<signed token>. The token itself is the authorization, so a plain browser download works."""
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = 'cert_download'

    def get(self, request):
        certificate = certificate_from_token(request.query_params.get('t', ''))
        if certificate is None:
            return _private(HttpResponse('This download link has expired or is not valid. Open Certificates and download again.',
                                         status=410, content_type='text/plain; charset=utf-8'))
        response = _pdf(certificate_pdf(certificate), f'coding-hubs-certificate-{certificate.code}.pdf', attachment=True)
        response['Cache-Control'] = 'private, no-store'
        return response
