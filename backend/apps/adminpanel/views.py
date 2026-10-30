import csv
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.courses.models import Course, CourseQuestion
from apps.enrollments.models import Enrollment
from apps.leads.models import Lead
from apps.payments.models import Order
from apps.tutors.models import TutorBooking
from apps.tutors.serializers import TutorBookingAdminSerializer

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


class ChangePasswordView(APIView):
    """Staff change their own password: the current one is required and the new one must pass Django's validators."""

    permission_classes = [IsStaff]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError

        current, new = str(request.data.get('current_password', '')), str(request.data.get('new_password', ''))
        if not request.user.check_password(current):
            return Response({'current_password': ['Your current password is not correct.']}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new, request.user)
        except ValidationError as exc:
            return Response({'new_password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        if new == current:
            return Response({'new_password': ['Choose a password you have not used just now.']}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new)
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password changed. Please sign in again with the new password.'})


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


class TutorBookingListView(generics.ListAPIView):
    permission_classes = [IsStaff]
    serializer_class = TutorBookingAdminSerializer
    pagination_class = Page

    def get_queryset(self):
        qs = TutorBooking.objects.select_related('tutor')
        params = self.request.query_params
        if q := params.get('q', '').strip():
            qs = qs.filter(Q(student_name__icontains=q) | Q(student_email__icontains=q))
        if tutor := params.get('tutor', '').strip():
            qs = qs.filter(tutor__full_name__icontains=tutor)
        if course := params.get('course', '').strip():
            qs = qs.filter(course__icontains=course)
        if status_value := params.get('status', '').strip():
            if status_value not in dict(TutorBooking.STATUS_CHOICES):
                raise ValidationError({'status': 'Select a valid booking status.'})
            qs = qs.filter(status=status_value)
        if date_from := params.get('from', '').strip():
            parsed_from = parse_date(date_from)
            if parsed_from is None:
                raise ValidationError({'from': 'Enter a valid date in YYYY-MM-DD format.'})
            qs = qs.filter(preferred_date__gte=parsed_from)
        if date_to := params.get('to', '').strip():
            parsed_to = parse_date(date_to)
            if parsed_to is None:
                raise ValidationError({'to': 'Enter a valid date in YYYY-MM-DD format.'})
            qs = qs.filter(preferred_date__lte=parsed_to)
        if date_from and date_to and parsed_from > parsed_to:
            raise ValidationError({'to': 'The end date must be on or after the start date.'})
        return qs


class TutorBookingDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsStaff]
    serializer_class = TutorBookingAdminSerializer
    queryset = TutorBooking.objects.select_related('tutor')
    http_method_names = ['get', 'patch', 'options']


class CourseQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseQuestion
        fields = (
            'id', 'course_slug', 'course_name', 'level', 'topic', 'question', 'answer',
            'explanation', 'example', 'coding_prompt', 'coding_solution', 'is_published',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'question_key', 'created_at', 'updated_at')


class QuestionListView(generics.ListCreateAPIView):
    permission_classes = [IsStaff]
    serializer_class = CourseQuestionSerializer
    pagination_class = Page

    def get_queryset(self):
        qs = CourseQuestion.objects.all()
        p = self.request.query_params
        if slug := p.get('course_slug'):
            qs = qs.filter(course_slug=slug)
        if level := p.get('level'):
            qs = qs.filter(level=level)
        if q := p.get('q'):
            qs = qs.filter(Q(question__icontains=q) | Q(topic__icontains=q) | Q(course_name__icontains=q))
        if pub := p.get('is_published'):
            qs = qs.filter(is_published=pub.lower() in ('1', 'true', 'yes'))
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save()


class QuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaff]
    serializer_class = CourseQuestionSerializer
    queryset = CourseQuestion.objects.all()
    http_method_names = ['get', 'patch', 'put', 'delete', 'options']
