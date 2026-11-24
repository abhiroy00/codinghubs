"""Staff API for the admin panel: review applications, issue, reissue, revoke and see each record's history."""
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, serializers, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Certificate, CertificateApplication
from .serializers import EventSerializer


class CertificatePermission(BasePermission):
    """Staff with the model permission the view names (superusers have all). Reads need 'view', actions 'change'/'add'."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_staff and user.is_active):
            return False
        model, action = view.permission_for(request)
        return user.has_perm(f'certificates.{action}_{model._meta.model_name}')


class AdminApplicationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    reviewed_by = serializers.CharField(source='reviewed_by.username', default='', read_only=True)
    certificate_code = serializers.SerializerMethodField()
    events = EventSerializer(many=True, read_only=True)

    class Meta:
        model = CertificateApplication
        fields = ('id', 'full_name', 'course_name', 'batch', 'completed_on', 'phone', 'note', 'status', 'staff_note',
                  'user_email', 'reviewed_by', 'reviewed_at', 'created_at', 'certificate_code', 'events')

    def get_certificate_code(self, obj):
        latest = obj.certificates.order_by('-created_at').first()
        return latest.code if latest else ''


class AdminCertificateSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', default='', read_only=True)
    issued_by = serializers.CharField(source='issued_by.username', default='', read_only=True)
    replaces_code = serializers.CharField(source='replaces.code', default='', read_only=True)
    replaced_by_code = serializers.SerializerMethodField()
    events = EventSerializer(many=True, read_only=True)

    class Meta:
        model = Certificate
        fields = ('id', 'code', 'recipient_name', 'course_name', 'completed_on', 'issued_on', 'status', 'status_note',
                  'user_email', 'issued_by', 'replaces_code', 'replaced_by_code', 'created_at', 'events')

    def get_replaced_by_code(self, obj):
        newer = getattr(obj, 'replaced_by', None)
        return newer.code if newer else ''


class IssueSerializer(serializers.Serializer):
    recipient_name = serializers.CharField(max_length=80, required=False, allow_blank=True)
    course_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    completed_on = serializers.DateField(required=False, allow_null=True)
    issued_on = serializers.DateField(required=False, allow_null=True)
    user_email = serializers.EmailField(required=False, allow_blank=True)
    note = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')


class Base:
    permission_classes = (CertificatePermission,)
    model = Certificate
    action = None  # forced action for POST endpoints

    def permission_for(self, request):
        if self.action:
            return self.model, self.action
        return self.model, 'view' if request.method in ('GET', 'HEAD', 'OPTIONS') else 'change'

    def failed(self, message):
        return Response({'detail': message}, status=status.HTTP_400_BAD_REQUEST)


class ApplicationList(Base, generics.ListAPIView):
    model = CertificateApplication
    serializer_class = AdminApplicationSerializer

    def get_queryset(self):
        rows = CertificateApplication.objects.select_related('user', 'reviewed_by').prefetch_related('events__actor', 'certificates')
        state = self.request.query_params.get('status')
        if state in dict(CertificateApplication.STATUSES):
            rows = rows.filter(status=state)
        q = self.request.query_params.get('q', '').strip()
        if q:
            rows = rows.filter(Q(full_name__icontains=q) | Q(course_name__icontains=q) | Q(user__email__icontains=q) | Q(phone__icontains=q))
        return rows


class ApplicationApprove(Base, APIView):
    action = 'add'  # approving issues a certificate

    def post(self, request, pk):
        application = generics.get_object_or_404(CertificateApplication, pk=pk)
        data = IssueSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        try:
            certificate = services.approve(application, request.user, recipient_name=v.get('recipient_name'), course_name=v.get('course_name'),
                                           completed_on=v.get('completed_on'), issued_on=v.get('issued_on'), note=v.get('note', ''))
        except ValueError as exc:
            return self.failed(str(exc))
        return Response(AdminCertificateSerializer(certificate).data, status=status.HTTP_201_CREATED)


class ApplicationReject(Base, APIView):
    model = CertificateApplication

    def post(self, request, pk):
        application = generics.get_object_or_404(CertificateApplication, pk=pk)
        note = str(request.data.get('note', '')).strip()[:500]
        if not note:
            return self.failed('Add a short reason; the learner sees it.')
        try:
            services.reject(application, request.user, note)
        except ValueError as exc:
            return self.failed(str(exc))
        return Response(AdminApplicationSerializer(CertificateApplication.objects.get(pk=pk)).data)


class CertificateList(Base, generics.ListAPIView):
    serializer_class = AdminCertificateSerializer

    def permission_for(self, request):
        return self.model, 'view' if request.method == 'GET' else 'add'

    def get_queryset(self):
        rows = Certificate.objects.select_related('user', 'issued_by', 'replaces', 'replaced_by').prefetch_related('events__actor')
        state = self.request.query_params.get('status')
        if state in dict(Certificate.STATUSES):
            rows = rows.filter(status=state)
        q = self.request.query_params.get('q', '').strip()
        if q:
            rows = rows.filter(Q(code__icontains=q) | Q(recipient_name__icontains=q) | Q(course_name__icontains=q) | Q(user__email__icontains=q))
        return rows

    def post(self, request):
        """Issue directly, e.g. for a learner who studied before online applications existed."""
        data = IssueSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        missing = [f for f in ('recipient_name', 'course_name', 'completed_on') if not v.get(f)]
        if missing:
            return Response({f: 'This field is required.' for f in missing}, status=status.HTTP_400_BAD_REQUEST)
        user = None
        if v.get('user_email'):
            user = get_user_model().objects.filter(email__iexact=v['user_email']).first()
            if user is None:
                return Response({'user_email': 'No account uses this email. Leave it empty to issue without an account.'}, status=status.HTTP_400_BAD_REQUEST)
        certificate = services.issue_direct(request.user, user=user, recipient_name=' '.join(v['recipient_name'].split()), course_name=v['course_name'].strip(),
                                            completed_on=v['completed_on'], issued_on=v.get('issued_on'), note=v.get('note', ''))
        return Response(AdminCertificateSerializer(certificate).data, status=status.HTTP_201_CREATED)


class CertificateReissue(Base, APIView):
    action = 'add'

    def post(self, request, pk):
        certificate = generics.get_object_or_404(Certificate, pk=pk)
        data = IssueSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        if not v.get('note'):
            return self.failed('Add the reason for the reissue (for the history).')
        try:
            new = services.reissue(certificate, request.user, note=v['note'], recipient_name=' '.join((v.get('recipient_name') or '').split()),
                                   course_name=(v.get('course_name') or '').strip(), completed_on=v.get('completed_on'))
        except ValueError as exc:
            return self.failed(str(exc))
        return Response(AdminCertificateSerializer(new).data, status=status.HTTP_201_CREATED)


class CertificateRevoke(Base, APIView):
    def post(self, request, pk):
        certificate = generics.get_object_or_404(Certificate, pk=pk)
        note = str(request.data.get('note', '')).strip()[:500]
        revoke = request.data.get('revoke', True) not in (False, 'false', '0', 0)
        if not note:
            return self.failed('Add the reason (for the history).')
        try:
            certificate = services.set_revoked(certificate, request.user, revoke, note)
        except ValueError as exc:
            return self.failed(str(exc))
        return Response(AdminCertificateSerializer(certificate).data)


class CertificateLink(Base, APIView):
    action = 'view'

    def post(self, request, pk):
        certificate = generics.get_object_or_404(Certificate, pk=pk)
        if certificate.status != Certificate.VALID:
            return self.failed('Only a valid certificate can be downloaded.')
        return Response(services.download_link(certificate, request.user))
