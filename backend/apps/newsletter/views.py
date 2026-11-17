import csv
import hashlib
from django.core import signing
from django.db import IntegrityError
from django.db.models import Count
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView
from apps.adminpanel.views import IsStaff
from apps.content.sanitize import sanitize_html
from . import services
from .models import Campaign, Delivery, Issue as NewsletterIssue, Subscriber


class Page(PageNumberPagination):
    page_size = 25
    max_page_size = 100


class PrivateView:
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'private, no-store'
        response['Referrer-Policy'] = 'no-referrer'
        return response


class IssueSerializer(serializers.ModelSerializer):
    content_html = serializers.CharField(source="content", max_length=200000)
    is_published = serializers.BooleanField(source="published", required=False)
    class Meta:
        model = NewsletterIssue
        fields = ['id', 'slug', 'title', 'excerpt', 'content_html', 'is_published', 'published_at', 'updated_at']
        read_only_fields = ['id', 'published_at', 'updated_at']

    def validate_content_html(self, value):
        value = sanitize_html(value)
        if not value:
            raise serializers.ValidationError('Add issue content before saving.')
        return value


class PublicIssueSerializer(serializers.ModelSerializer):
    content_html = serializers.SerializerMethodField()

    class Meta:
        model = NewsletterIssue
        fields = ['id', 'slug', 'title', 'excerpt', 'published_at', 'content_html']

    def get_content_html(self, obj):
        return services.public_issue_html(obj.content)


class IssueSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterIssue
        fields = ['id', 'slug', 'title', 'excerpt', 'published_at']


class IssueList(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = IssueSummarySerializer
    pagination_class = Page
    queryset = NewsletterIssue.objects.filter(published=True).order_by('-published_at')


class IssueDetail(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicIssueSerializer
    lookup_field = 'slug'
    queryset = NewsletterIssue.objects.filter(published=True)


class IPThrottle(AnonRateThrottle):
    scope = 'newsletter_ip'
    rate = '10/hour'


class EmailThrottle(SimpleRateThrottle):
    rate = '4/hour'
    scope = 'newsletter_email'

    def get_cache_key(self, request, view):
        email = str(request.data.get('email', '')).strip().casefold()
        return self.cache_format % {'scope': self.scope, 'ident': hashlib.sha256(email.encode()).hexdigest()}


class SubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    consent = serializers.BooleanField()
    source = serializers.CharField(max_length=100, default='newsletter')
    website = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError('Please consent to receiving the newsletter.')
        return value


class Subscribe(PrivateView, APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [IPThrottle, EmailThrottle]

    def post(self, request):
        serializer = SubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not services.mail_ready():
            return Response({'detail': 'Newsletter email is not available yet. Please try again later.'}, status=503)
        value = serializer.validated_data
        if not value.get('website'):
            from django.db import transaction
            with transaction.atomic():
                obj, _ = Subscriber.objects.get_or_create(email=value['email'].strip().casefold(), defaults={'source': value['source'], 'consent_at': timezone.now()})
                obj = Subscriber.objects.select_for_update().get(pk=obj.pk)
                if obj.status != 'confirmed':
                    services.subscribe(obj.email, value['source'])
        return Response({'detail': 'If eligible, a confirmation email will be queued. Check your inbox and confirm to subscribe.'}, status=202)


class TokenAction(PrivateView, APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [IPThrottle]
    purpose = 'confirm'

    def post(self, request):
        token = request.data.get('token')
        if not isinstance(token, str) or len(token) > 1000:
            raise ValidationError({'token': 'A valid link token is required.'})
        try:
            if self.purpose == 'confirm':
                if not services.confirm(token):
                    raise signing.BadSignature()
            else:
                services.unsubscribe(token)
        except (signing.BadSignature, Subscriber.DoesNotExist, KeyError, ValueError, TypeError):
            return Response({'detail': 'This link is invalid or expired. Subscribe again to request a fresh confirmation.'}, status=400)
        return Response({'detail': 'Subscription confirmed.' if self.purpose == 'confirm' else 'You have been unsubscribed.'})


class Unsubscribe(TokenAction):
    purpose = 'unsubscribe'


class SubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscriber
        fields = ['id', 'email', 'status', 'source', 'consent_at', 'created_at', 'confirmed_at', 'unsubscribed_at', 'updated_at']
        read_only_fields = fields


class AdminSubscribers(PrivateView, generics.ListAPIView):
    permission_classes = [IsStaff]
    serializer_class = SubscriberSerializer
    pagination_class = Page

    def get_queryset(self):
        qs = Subscriber.objects.order_by('-created_at')
        if self.request.query_params.get('q'):
            qs = qs.filter(email__icontains=self.request.query_params['q'][:254])
        if self.request.query_params.get('status'):
            qs = qs.filter(status=self.request.query_params['status'])
        return qs


class AdminSubscriber(PrivateView, generics.DestroyAPIView):
    permission_classes = [IsStaff]
    queryset = Subscriber.objects.all()
    serializer_class = SubscriberSerializer

    def post(self, request, pk):
        obj = self.get_object()
        obj.status = 'unsubscribed'
        obj.unsubscribed_at = timezone.now()
        obj.save()
        return Response(SubscriberSerializer(obj).data)


class SubscriberExport(AdminSubscribers):
    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="newsletter-subscribers.csv"'
        response['X-Content-Type-Options'] = 'nosniff'
        writer = csv.writer(response)
        writer.writerow(['Email', 'Status', 'Source', 'Consent at', 'Confirmed at', 'Unsubscribed at'])
        for row in self.get_queryset().iterator():
            values = [row.email, row.status, row.source, row.consent_at, row.confirmed_at, row.unsubscribed_at]
            writer.writerow([("'" + str(v)) if str(v or '').lstrip().startswith(('=', '+', '-', '@', '\t', '\r', '\n')) else str(v or '') for v in values])
        return response


class AdminIssues(PrivateView, generics.ListCreateAPIView):
    permission_classes = [IsStaff]
    serializer_class = IssueSerializer
    pagination_class = Page
    queryset = NewsletterIssue.objects.order_by('-updated_at')


class AdminIssue(PrivateView, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaff]
    serializer_class = IssueSerializer
    queryset = NewsletterIssue.objects.all()


class CampaignSerializer(serializers.ModelSerializer):
    counts = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = ['id', 'issue', 'subject', 'created_at', 'counts']

    def get_counts(self, obj):
        return dict(obj.deliveries.values('status').annotate(total=Count('id')).values_list('status', 'total'))


class AdminCampaigns(PrivateView, generics.ListAPIView):
    permission_classes = [IsStaff]
    serializer_class = CampaignSerializer
    pagination_class = Page
    queryset = Campaign.objects.order_by('-created_at')

    def post(self, request):
        class SendSerializer(serializers.Serializer):
            issue = serializers.PrimaryKeyRelatedField(queryset=NewsletterIssue.objects.filter(published=True))
            idempotency_key = serializers.UUIDField()
            confirmation = serializers.CharField()
            preview_token = serializers.CharField(max_length=2000)
        form = SendSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        if form.validated_data['confirmation'] != 'SEND':
            raise ValidationError({'confirmation': 'Type SEND to explicitly queue delivery.'})
        issue = form.validated_data['issue']
        try:
            preview = signing.loads(form.validated_data['preview_token'], salt='newsletter-preview', max_age=600)
            if preview != {'issue': issue.pk, 'version': issue.updated_at.isoformat()}:
                raise signing.BadSignature()
        except signing.BadSignature as error:
            raise ValidationError({'preview_token': 'Preview the current issue again before sending.'}) from error
        if not services.mail_ready():
            return Response({'detail': 'Enable and configure newsletter email before queueing a campaign.'}, status=503)
        try:
            obj = services.queue_campaign(form.validated_data['issue'], form.validated_data['idempotency_key'], request.user)
        except (ValueError, IntegrityError) as error:
            raise ValidationError('This request belongs to an existing campaign or content version. Reload its preview before continuing.') from error
        return Response(CampaignSerializer(obj).data, status=202)


class CampaignDeliveries(PrivateView, generics.ListAPIView):
    permission_classes = [IsStaff]
    pagination_class = Page

    class DeliverySerializer(serializers.ModelSerializer):
        class Meta:
            model = Delivery
            fields = ['id', 'subscriber_id', 'status', 'attempted_at', 'finished_at', 'error_code']
    serializer_class = DeliverySerializer

    def get_queryset(self):
        return Delivery.objects.filter(campaign_id=self.kwargs['pk']).order_by('id')


class AdminPreview(PrivateView, APIView):
    permission_classes = [IsStaff]

    def get(self, request, pk):
        from django.shortcuts import get_object_or_404
        issue = get_object_or_404(NewsletterIssue, pk=pk)
        token = signing.dumps({'issue': issue.pk, 'version': issue.updated_at.isoformat()}, salt='newsletter-preview')
        return Response({'title': issue.title, 'content_html': sanitize_html(issue.content), 'confirmed_recipients': Subscriber.objects.filter(status='confirmed').count(), 'preview_token': token})
