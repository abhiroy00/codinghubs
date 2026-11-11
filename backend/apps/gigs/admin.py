from django.contrib import admin, messages
from django.utils import timezone

from .models import Gig, GigReport, Proposal
from .serializers import BriefInput


@admin.register(Gig)
class GigAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'owner', 'approved_at', 'updated_at']
    list_filter = ['status']
    search_fields = ['title', 'scope']
    readonly_fields = ['slug', 'owner', 'title', 'scope', 'deliverable', 'skills', 'status', 'approved_by', 'approved_at', 'created_at', 'updated_at']
    actions = ['approve', 'reject', 'close']

    def has_add_permission(self, request):
        return False

    @admin.action(description='Approve selected pending briefs after checking content and privacy', permissions=['change'])
    def approve(self, request, queryset):
        # Compare-and-update prevents approval of a stale pending snapshot after an owner edit.
        for brief in queryset.filter(status=Gig.Status.PENDING):
            data = BriefInput(data={'title': brief.title, 'scope': brief.scope, 'deliverable': brief.deliverable, 'skills': brief.skills})
            if not data.is_valid():
                self.message_user(request, 'Invalid brief skipped: ' + brief.slug, messages.ERROR)
                continue
            changed = Gig.objects.filter(pk=brief.pk, status=Gig.Status.PENDING, updated_at=brief.updated_at).update(
                status=Gig.Status.OPEN, approved_by=request.user, approved_at=timezone.now(), updated_at=timezone.now())
            if changed:
                self.log_change(request, brief, 'Approved gig after moderation review.')

    def transition(self, request, queryset, status):
        for brief in queryset:
            Gig.objects.filter(pk=brief.pk).update(status=status, approved_by=None, approved_at=None, updated_at=timezone.now())
            self.log_change(request, brief, 'Gig moderation: ' + status)

    @admin.action(description='Reject selected briefs', permissions=['change'])
    def reject(self, request, queryset):
        self.transition(request, queryset, Gig.Status.REJECTED)

    @admin.action(description='Close selected briefs', permissions=['change'])
    def close(self, request, queryset):
        self.transition(request, queryset, Gig.Status.CLOSED)


@admin.register(GigReport)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['gig', 'resolved', 'created_at']
    list_filter = ['resolved']
    readonly_fields = ['gig', 'reporter', 'reason', 'created_at']

    def has_add_permission(self, request):
        return False


@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display = ['gig', 'created_at']
    readonly_fields = ['gig', 'applicant', 'pitch', 'created_at']

    def has_add_permission(self, request):
        return False
