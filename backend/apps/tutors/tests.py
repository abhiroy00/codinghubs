from datetime import time, timedelta
from io import BytesIO
import tempfile
import uuid

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from .models import Tutor, TutorBooking

User = get_user_model()


class TutorBookingApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.tutor = Tutor.objects.create(
            full_name='Coding Hubs Teaching Team',
            designation='Python and AI Tutor',
            bio='Practical instruction in Python and AI.',
            expertise=['Python', 'Generative AI'],
            courses=['Python Development'],
        )

    def booking_payload(self, **overrides):
        payload = {
            'student_name': 'Test Student',
            'student_email': 'student@example.com',
            'tutor': self.tutor.pk,
            'course': 'Python Development',
            'preferred_date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'preferred_time': '10:30:00',
            'session_type': TutorBooking.SESSION_ONLINE,
            'message': 'Please focus on Python basics.',
            'submission_key': str(uuid.uuid4()),
        }
        payload.update(overrides)
        return payload

    def test_public_tutor_list_returns_active_profiles_only(self):
        Tutor.objects.create(full_name='Inactive Tutor', designation='Tutor', bio='Inactive', is_active=False)

        response = self.client.get('/api/tutors/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['full_name'], 'Coding Hubs Teaching Team')

    def test_public_booking_is_saved_as_pending(self):
        response = self.client.post('/api/tutors/bookings/', self.booking_payload(), format='json')

        self.assertEqual(response.status_code, 201)
        booking = TutorBooking.objects.get()
        self.assertEqual(booking.status, TutorBooking.STATUS_PENDING)
        self.assertEqual(response.data['reference'], booking.reference)

    def test_past_date_and_inactive_tutor_are_rejected(self):
        past = (timezone.localdate() - timedelta(days=1)).isoformat()
        past_response = self.client.post('/api/tutors/bookings/', self.booking_payload(preferred_date=past), format='json')
        inactive = Tutor.objects.create(full_name='Inactive', designation='Tutor', bio='Inactive', is_active=False)
        tutor_response = self.client.post('/api/tutors/bookings/', self.booking_payload(tutor=inactive.pk), format='json')
        session_response = self.client.post(
            '/api/tutors/bookings/',
            self.booking_payload(session_type='in_person'),
            format='json',
        )

        self.assertEqual(past_response.status_code, 400)
        self.assertEqual(tutor_response.status_code, 400)
        self.assertEqual(session_response.status_code, 400)
        self.assertEqual(TutorBooking.objects.count(), 0)

    def test_duplicate_submission_key_does_not_create_another_booking(self):
        payload = self.booking_payload()

        first = self.client.post('/api/tutors/bookings/', payload, format='json')
        duplicate = self.client.post('/api/tutors/bookings/', payload, format='json')

        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 201)
        self.assertEqual(TutorBooking.objects.count(), 1)
        self.assertEqual(first.data['id'], duplicate.data['id'])

    def test_tutor_bookings_require_staff_and_allow_status_updates(self):
        booking = TutorBooking.objects.create(
            student_name='Test Student',
            student_email='student@example.com',
            tutor=self.tutor,
            course='Python Development',
            preferred_date=timezone.localdate() + timedelta(days=1),
            preferred_time=time(10, 30),
        )
        self.assertEqual(self.client.get('/api/admin/tutor-bookings/').status_code, 401)

        staff = User.objects.create_user(username='staff', password='StrongPass123', is_staff=True)
        self.client.force_authenticate(staff)
        response = self.client.patch(
            f'/api/admin/tutor-bookings/{booking.pk}/',
            {'status': TutorBooking.STATUS_CONFIRMED},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, TutorBooking.STATUS_CONFIRMED)

    def test_admin_can_filter_by_student_and_date(self):
        TutorBooking.objects.create(
            student_name='Ada Student',
            student_email='ada@example.com',
            tutor=self.tutor,
            course='Python Development',
            preferred_date=timezone.localdate() + timedelta(days=1),
            preferred_time=time(10, 30),
        )
        staff = User.objects.create_user(username='staff', password='StrongPass123', is_staff=True)
        self.client.force_authenticate(staff)

        preferred_date = timezone.localdate() + timedelta(days=1)
        response = self.client.get('/api/admin/tutor-bookings/', {
            'q': 'Ada',
            'tutor': 'Coding Hubs',
            'course': 'Python',
            'status': TutorBooking.STATUS_PENDING,
            'from': timezone.localdate().isoformat(),
            'to': preferred_date.isoformat(),
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['student_email'], 'ada@example.com')

    def test_admin_rejects_malformed_date_filters(self):
        staff = User.objects.create_user(username='staff', password='StrongPass123', is_staff=True)
        self.client.force_authenticate(staff)

        response = self.client.get('/api/admin/tutor-bookings/', {'from': 'not-a-date'})

        self.assertEqual(response.status_code, 400)


class TutorAdminApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(username='tutor-admin', password='StrongPass123', is_staff=True)
        self.client.force_authenticate(self.staff)

    def tutor_payload(self, **overrides):
        return {
            'full_name': 'Alex Example',
            'profile_image': '',
            'designation': 'AI Tutor',
            'bio': 'Hands-on AI lessons for learners.',
            'experience': '5 years',
            'expertise': ['Python', 'AI'],
            'courses': ['Python Development'],
            'teaching_approach': 'Build projects together.',
            'is_active': True,
            **overrides,
        }

    def test_staff_can_create_update_and_deactivate_tutor(self):
        response = self.client.post('/api/admin/tutors/', self.tutor_payload(), format='json')
        self.assertEqual(response.status_code, 201, response.content)
        tutor_id = response.data['id']

        updated = self.client.patch(
            f'/api/admin/tutors/{tutor_id}/',
            {'is_active': False, 'expertise': ['Python', 'python', 'AI']},
            format='json',
        )

        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertFalse(updated.data['is_active'])
        self.assertEqual(updated.data['expertise'], ['Python', 'AI'])
        self.assertEqual(self.client.get('/api/tutors/').data, [])

    def test_tutor_management_requires_staff_and_rejects_unsafe_photo_urls(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/admin/tutors/').status_code, 401)
        self.client.force_authenticate(self.staff)

        unsafe = self.client.post(
            '/api/admin/tutors/',
            self.tutor_payload(profile_image='javascript:alert(1)'),
            format='json',
        )

        self.assertEqual(unsafe.status_code, 400)
        self.assertEqual(Tutor.objects.count(), 0)

    def test_staff_can_upload_validated_profile_photo(self):
        buffer = BytesIO()
        Image.new('RGB', (12, 12), (20, 40, 60)).save(buffer, 'PNG')
        photo = SimpleUploadedFile('profile.png', buffer.getvalue(), content_type='image/png')

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post('/api/admin/tutors/upload-image/', {'file': photo}, format='multipart')

        self.assertEqual(response.status_code, 201, response.content)
        self.assertTrue(response.data['url'].startswith('/media/tutors/'))

        invalid = SimpleUploadedFile('not-image.png', b'not an image', content_type='image/png')
        invalid_response = self.client.post('/api/admin/tutors/upload-image/', {'file': invalid}, format='multipart')
        self.assertEqual(invalid_response.status_code, 400)
