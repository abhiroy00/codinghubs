import hashlib
import hmac
import json
import logging

import razorpay
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from apps.courses.models import Course
from apps.enrollments.models import Enrollment

from .models import Order
from .razorpay_client import get_client
from .serializers import CreateOrderSerializer, VerifyPaymentSerializer


class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Courses added in the admin panel have no confirmed online fee: learners enquire instead of paying here.
        course = Course.objects.filter(pk=serializer.validated_data['course_id'], is_active=True, is_custom=False).first()
        if not course:
            return Response({'detail': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

        if Enrollment.objects.filter(user=request.user, course=course).exists():
            return Response({'detail': 'You are already enrolled in this course.'}, status=status.HTTP_400_BAD_REQUEST)

        amount = course.price_paise
        client = get_client()
        try:
            rp_order = client.order.create({
                'amount': amount,
                'currency': 'INR',
                'notes': {'course_id': str(course.id), 'user_id': str(request.user.id)},
            })
        except (razorpay.errors.BadRequestError, razorpay.errors.GatewayError, razorpay.errors.ServerError) as exc:
            logger.error('Razorpay order.create failed for course %s: %s', course.id, exc)
            return Response(
                {'detail': 'Payment gateway is not available right now. Please try again later.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        order = Order.objects.create(
            user=request.user,
            course=course,
            razorpay_order_id=rp_order['id'],
            amount=amount,
        )

        return Response(
            {
                'order_id': order.razorpay_order_id,
                'amount': amount,
                'currency': 'INR',
                'key': settings.RAZORPAY_KEY_ID,
                'course_name': course.name,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = VerifyPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order = Order.objects.filter(
            razorpay_order_id=data['razorpay_order_id'], user=request.user
        ).first()
        if not order:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        client = get_client()
        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': data['razorpay_order_id'],
                'razorpay_payment_id': data['razorpay_payment_id'],
                'razorpay_signature': data['razorpay_signature'],
            })
        except razorpay.errors.SignatureVerificationError:
            order.status = Order.STATUS_FAILED
            order.save(update_fields=['status'])
            return Response({'detail': 'Signature verification failed.'}, status=status.HTTP_400_BAD_REQUEST)

        # The signature proves the callback came from Razorpay; it does not prove the payment
        # matches this order. Ask the gateway, exactly as the store checkout does.
        try:
            info = client.payment.fetch(data['razorpay_payment_id'])
        except Exception as exc:  # noqa: BLE001 - the SDK raises several types
            logger.error('Could not fetch course payment %s: %s', data['razorpay_payment_id'], exc)
            return Response(
                {'detail': 'Could not confirm the payment with the gateway. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        try:
            paid_amount = int(info.get('amount', -1))
        except (TypeError, ValueError):
            paid_amount = -1
        if (info.get('order_id') != order.razorpay_order_id or paid_amount != order.amount
                or info.get('currency') != 'INR'):
            logger.error(
                'Course payment mismatch for order %s: %s', order.razorpay_order_id,
                {k: info.get(k) for k in ('order_id', 'amount', 'currency')},
            )
            return Response({'detail': 'The payment does not match this order.'}, status=status.HTTP_400_BAD_REQUEST)
        if info.get('status') == 'failed':
            order.status = Order.STATUS_FAILED
            order.save(update_fields=['status'])
            return Response({'detail': 'The payment failed.', 'status': order.status}, status=status.HTTP_400_BAD_REQUEST)
        if info.get('status') != 'captured':
            return Response({'detail': 'The payment is not captured yet.', 'status': order.status}, status=status.HTTP_202_ACCEPTED)

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            if order.status != Order.STATUS_PAID:
                order.status = Order.STATUS_PAID
                order.razorpay_payment_id = data['razorpay_payment_id']
                order.save(update_fields=['status', 'razorpay_payment_id'])
            if order.user_id:
                Enrollment.objects.get_or_create(user=order.user, course=order.course, defaults={'order': order})

        return Response({'detail': 'Payment verified.', 'status': order.status})


class RazorpayWebhookView(APIView):
    """Server-to-server fallback: reconciles an order even if the browser
    callback in VerifyPaymentView never fires (closed tab, dropped network)."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        secret = settings.RAZORPAY_WEBHOOK_SECRET
        signature = request.headers.get('X-Razorpay-Signature', '')
        body = request.body

        if not secret:
            return Response({'detail': 'Webhook secret not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            return Response({'detail': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(body)
        except ValueError:
            return Response({'detail': 'Bad payload.'}, status=status.HTTP_400_BAD_REQUEST)
        event = payload.get('event', '')
        entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
        order_entity = payload.get('payload', {}).get('order', {}).get('entity', {})
        razorpay_order_id = entity.get('order_id') or order_entity.get('id')
        razorpay_payment_id = entity.get('id')

        if event in ('payment.captured', 'order.paid') and razorpay_order_id:
            order = Order.objects.filter(razorpay_order_id=razorpay_order_id).first()
            if order and order.status != Order.STATUS_PAID:
                with transaction.atomic():
                    order = Order.objects.select_for_update().get(pk=order.pk)
                    if order.status != Order.STATUS_PAID:
                        order.status = Order.STATUS_PAID
                        if razorpay_payment_id:
                            order.razorpay_payment_id = razorpay_payment_id
                        order.save(update_fields=['status', 'razorpay_payment_id'])
                        if order.user_id:
                            Enrollment.objects.get_or_create(
                                user=order.user, course=order.course, defaults={'order': order}
                            )
        elif event == 'payment.failed' and razorpay_order_id:
            Order.objects.filter(razorpay_order_id=razorpay_order_id).exclude(status=Order.STATUS_PAID).update(
                status=Order.STATUS_FAILED
            )

        return HttpResponse(status=200)
