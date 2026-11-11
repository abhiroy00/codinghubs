from django.conf import settings
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import Gig, GigReport, Proposal
from .serializers import BriefInput, OwnedBrief, PrivateProposal, ProposalInput, PublicBrief, ReportInput


class WriteThrottle(UserRateThrottle):
    scope = 'gigs_write'


class ReportThrottle(UserRateThrottle):
    scope = 'gigs_report'


class Page(PageNumberPagination):
    page_size = 20


class PilotView(APIView):
    def initial(self, request, *args, **kwargs):
        if not settings.GIGS_ENABLED:
            raise NotFound()
        super().initial(request, *args, **kwargs)

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'no-store'
        response['X-Robots-Tag'] = 'noindex, nofollow'
        return response


class PilotStatus(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        response = Response({'enabled': settings.GIGS_ENABLED})
        response['Cache-Control'] = 'no-store'
        response['X-Robots-Tag'] = 'noindex, nofollow'
        return response


class Briefs(PilotView):
    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method == 'GET' else [permissions.IsAuthenticated()]

    def get_throttles(self):
        return [WriteThrottle()] if self.request.method == 'POST' else super().get_throttles()

    def get(self, request):
        qs = Gig.public()
        query = request.query_params.get('q', '').strip()[:100]
        if query:
            qs = qs.filter(title__icontains=query)
        page = Page()
        return page.get_paginated_response(PublicBrief(page.paginate_queryset(qs, request), many=True).data)

    def post(self, request):
        data = BriefInput(data=request.data)
        data.is_valid(raise_exception=True)
        brief = Gig.objects.create(owner=request.user, **data.validated_data)
        return Response(OwnedBrief(brief).data, status=status.HTTP_201_CREATED)


class Workspace(PilotView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'briefs': OwnedBrief(Gig.objects.filter(owner=request.user)[:50], many=True).data,
            'proposals': PrivateProposal(Proposal.objects.filter(applicant=request.user).select_related('gig')[:50], many=True).data,
            'limit': 50,
        })


class BriefDetail(PilotView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        return Response(PublicBrief(get_object_or_404(Gig.public(), slug=slug)).data)

    def patch(self, request, slug):
        if not request.user.is_authenticated:
            self.permission_denied(request)
        data = BriefInput(data=request.data)  # full content required for a new review
        data.is_valid(raise_exception=True)
        with transaction.atomic():
            brief = get_object_or_404(Gig.objects.select_for_update(), slug=slug, owner=request.user)
            for field, value in data.validated_data.items():
                setattr(brief, field, value)
            brief.status, brief.approved_by, brief.approved_at = Gig.Status.DRAFT, None, None
            brief.save()
        return Response(OwnedBrief(brief).data)

    def get_throttles(self):
        return [WriteThrottle()] if self.request.method == 'PATCH' else super().get_throttles()


class OwnerAction(PilotView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [WriteThrottle]
    action = 'submit'

    def post(self, request, slug):
        with transaction.atomic():
            brief = get_object_or_404(Gig.objects.select_for_update(), slug=slug, owner=request.user)
            if self.action == 'close':
                brief.status = Gig.Status.CLOSED
            else:
                if brief.status not in (Gig.Status.DRAFT, Gig.Status.REJECTED):
                    raise ValidationError('Only drafts or rejected briefs may be submitted.')
                data = BriefInput(data=OwnedBrief(brief).data)
                data.is_valid(raise_exception=True)
                brief.status = Gig.Status.PENDING
            brief.approved_by, brief.approved_at = None, None
            brief.save()
        return Response(OwnedBrief(brief).data)


class CloseBrief(OwnerAction):
    action = 'close'


class Proposals(PilotView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [WriteThrottle]

    def get(self, request, slug):
        brief = get_object_or_404(Gig, slug=slug, owner=request.user)
        page = Page()
        qs = brief.proposals.select_related('gig').all()
        return page.get_paginated_response(PrivateProposal(page.paginate_queryset(qs, request), many=True).data)

    def post(self, request, slug):
        data = ProposalInput(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                brief = get_object_or_404(Gig.public().select_for_update(), slug=slug)
                if brief.owner_id == request.user.pk:
                    raise ValidationError('You cannot propose on your own brief.')
                proposal = Proposal.objects.create(gig=brief, applicant=request.user, **data.validated_data)
        except IntegrityError:
            raise ValidationError('You already submitted a proposal for this brief.')
        return Response(PrivateProposal(proposal).data, status=status.HTTP_201_CREATED)


class ReportBrief(PilotView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ReportThrottle]

    def post(self, request, slug):
        data = ReportInput(data=request.data)
        data.is_valid(raise_exception=True)
        brief = get_object_or_404(Gig.public(), slug=slug)
        GigReport.objects.get_or_create(gig=brief, reporter=request.user, defaults=data.validated_data)
        return Response({'detail': 'Report saved for staff review.'}, status=status.HTTP_201_CREATED)
