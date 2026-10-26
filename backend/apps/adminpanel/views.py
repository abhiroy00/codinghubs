import csv
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.leads.models import Lead
from apps.payments.models import Order

User = get_user_model()


class LoginThrottle(AnonRateThrottle):
    rate = '5/min'


class Page(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class AdminLoginView(APIView):
    """Email + password login for staff only. Same error for every failure so accounts cannot be probed."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        password = str(request.data.get('password', ''))
        user = None
        if email and password:
            account = User.objects.filter(email__iexact=email).first()
            if account:
                user = authenticate(request, username=account.get_username(), password=password)
        if not user or not user.is_staff or not user.is_active:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {'id': user.id, 'email': user.email, 'name': user.get_full_name() or user.email},
            }
        )


class StatsView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        now = timezone.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        leads = Lead.objects.all()

        days = 14
        start = today - timedelta(days=days - 1)
        per_day = {
            row['d']: row['n']
            for row in leads.filter(created_at__gte=start)
            .annotate(d=TruncDate('created_at'))
            .values('d')
            .annotate(n=Count('id'))
        }
        series = []
        for i in range(days):
            d = (start + timedelta(days=i)).date()
            series.append({'date': d.isoformat(), 'count': per_day.get(d, 0)})

        def top(field, limit=8):
            rows = leads.exclude(**{field: ''}).values(field).annotate(n=Count('id')).order_by('-n')[:limit]
            return [{'label': r[field], 'count': r['n']} for r in rows]

        return Response(
            {
                'leads': {
                    'total': leads.count(),
                    'today': leads.filter(created_at__gte=today).count(),
                    'last_7_days': leads.filter(created_at__gte=today - timedelta(days=6)).count(),
                    'last_30_days': leads.filter(created_at__gte=today - timedelta(days=29)).count(),
                    'by_status': {s: leads.filter(status=s).count() for s, _ in Lead.STATUS_CHOICES},
                },
                'leads_per_day': series,
                'top_sources': top('source_page'),
                'top_courses': top('course'),
                'users': User.objects.count(),
                'enrollments': Enrollment.objects.count(),
                'orders': {s: Order.objects.filter(status=s).count() for s, _ in Order.STATUS_CHOICES},
                'recent_leads': LeadSerializer(leads[:6], many=True).data,
            }
        )


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = (
            'id', 'name', 'phone', 'course', 'mode', 'source_page', 'utm_source', 'utm_medium',
            'utm_campaign', 'status', 'notes', 'created_at',
        )
        read_only_fields = ('id', 'name', 'phone', 'course', 'mode', 'source_page', 'utm_source', 'utm_medium', 'utm_campaign', 'created_at')


def filtered_leads(request):
    qs = Lead.objects.all()
    p = request.query_params
    if q := p.get('q', '').strip():
        qs = qs.filter(Q(name__icontains=q) | Q(phone__icontains=q) | Q(course__icontains=q) | Q(source_page__icontains=q))
    if s := p.get('status'):
        qs = qs.filter(status=s)
    if m := p.get('mode'):
        qs = qs.filter(mode=m)
    if src := p.get('source'):
        qs = qs.filter(source_page__icontains=src)
    if d := p.get('from'):
        qs = qs.filter(created_at__date__gte=d)
    if d := p.get('to'):
        qs = qs.filter(created_at__date__lte=d)
    return qs


class LeadListView(generics.ListAPIView):
    permission_classes = [IsStaff]
    serializer_class = LeadSerializer
    pagination_class = Page

    def get_queryset(self):
        return filtered_leads(self.request)


class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaff]
    serializer_class = LeadSerializer
    queryset = Lead.objects.all()

    def get_serializer(self, *args, **kwargs):
        # PATCH may only change status and notes.
        kwargs.setdefault('partial', True)
        return super().get_serializer(*args, **kwargs)


def csv_safe(value):
    """Stop spreadsheet formula injection from values users typed into public forms."""
    text = '' if value is None else str(value)
    return "'" + text if text[:1] in ('=', '+', '-', '@', '\t', '\r') else text


class LeadExportView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="coding-hubs-leads.csv"'
        writer = csv.writer(response)
        writer.writerow(['ID', 'Created', 'Name', 'Phone', 'Course / note', 'Type', 'Source page', 'Status', 'Notes'])
        for lead in filtered_leads(request).iterator():
            writer.writerow([
                lead.id, timezone.localtime(lead.created_at).strftime('%Y-%m-%d %H:%M'), csv_safe(lead.name),
                csv_safe(lead.phone), csv_safe(lead.course), lead.mode, csv_safe(lead.source_page), lead.status, csv_safe(lead.notes),
            ])
        return response


class UserRowSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined')


class UserListView(generics.ListAPIView):
    permission_classes = [IsStaff]
    serializer_class = UserRowSerializer
    pagination_class = Page

    def get_queryset(self):
        qs = User.objects.order_by('-date_joined')
        if q := self.request.query_params.get('q', '').strip():
            qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q))
        return qs


class EnrollmentRowSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username')
    email = serializers.CharField(source='user.email')
    course = serializers.CharField(source='course.name')
    payment_status = serializers.CharField(source='order.status', default='', allow_null=True)

    class Meta:
        model = Enrollment
        fields = ('id', 'user', 'email', 'course', 'payment_status', 'enrolled_at')


class EnrollmentListView(generics.ListAPIView):
    permission_classes = [IsStaff]
    serializer_class = EnrollmentRowSerializer
    pagination_class = Page

    def get_queryset(self):
        return Enrollment.objects.select_related('user', 'course', 'order')


class OrderRowSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username')
    course = serializers.CharField(source='course.name')

    class Meta:
        model = Order
        fields = ('id', 'razorpay_order_id', 'user', 'course', 'status', 'created_at')


class OrderListView(generics.ListAPIView):
    permission_classes = [IsStaff]
    serializer_class = OrderRowSerializer
    pagination_class = Page

    def get_queryset(self):
        qs = Order.objects.select_related('user', 'course')
        if s := self.request.query_params.get('status'):
            qs = qs.filter(status=s)
        return qs


class CourseRowSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Course
        fields = ('id', 'name', 'category', 'duration_display', 'is_active')
        read_only_fields = ('id', 'name', 'category', 'duration_display')


class CourseListView(generics.ListAPIView):
    permission_classes = [IsStaff]
    serializer_class = CourseRowSerializer
    queryset = Course.objects.select_related('category').order_by('category__order', 'order')


class CourseDetailView(generics.UpdateAPIView):
    permission_classes = [IsStaff]
    serializer_class = CourseRowSerializer
    queryset = Course.objects.all()
    http_method_names = ['patch', 'options']
