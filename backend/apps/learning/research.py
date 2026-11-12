from django.utils import timezone
from django.db import transaction
from rest_framework import permissions, serializers, viewsets
from .models import ClaimVerification, Concept, ResearchSource


class ResearchPermissions(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        model = view.queryset.model._meta.model_name
        action = 'view' if request.method in permissions.SAFE_METHODS else 'add' if request.method == 'POST' else 'delete' if request.method == 'DELETE' else 'change'
        return bool(user.is_authenticated and user.is_active and user.is_staff and user.has_perm(f'learning.{action}_{model}') and (model != 'claimverification' or request.method in permissions.SAFE_METHODS or user.has_perm('learning.publish_concept')))


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchSource
        fields = '__all__'

    def validate_url(self, value):
        if not value.startswith('https://'):
            raise serializers.ValidationError('Use an HTTPS source URL.')
        return value


class ClaimSerializer(serializers.ModelSerializer):
    concept_title = serializers.CharField(source='concept.title', read_only=True)

    class Meta:
        model = ClaimVerification
        fields = '__all__'
        read_only_fields = ['reviewed_by', 'reviewed_at']

    def validate(self, data):
        concept = data.get('concept', self.instance.concept if self.instance else None)
        status = data.get('status', self.instance.status if self.instance else 'NEEDS_REVIEW')
        if status == 'VERIFIED':
            sources = data.get('sources', list(self.instance.sources.all()) if self.instance else [])
            evidence = data.get('evidence', self.instance.evidence if self.instance else '')
            version = data.get('edit_version', self.instance.edit_version if self.instance else None)
            if not sources or not evidence.strip() or version != concept.edit_version:
                raise serializers.ValidationError('Verified claims require sources, evidence and the current lesson edit version.')
        return data


class PrivateResearchViewSet(viewsets.ModelViewSet):
    permission_classes = [ResearchPermissions]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    pagination_class = None

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'private, no-store'
        return response


class SourceViewSet(PrivateResearchViewSet):
    queryset = ResearchSource.objects.order_by('-accessed_on', 'pk')
    serializer_class = SourceSerializer


class ClaimViewSet(PrivateResearchViewSet):
    queryset = ClaimVerification.objects.select_related('concept').prefetch_related('sources').order_by('pk')
    serializer_class = ClaimSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if concept := self.request.query_params.get('concept'):
            qs = qs.filter(concept_id=concept)
        return qs

    def perform_create(self, serializer):
        self.record_review(serializer)

    def perform_update(self, serializer):
        self.record_review(serializer)

    @transaction.atomic
    def record_review(self, serializer):
        status = serializer.validated_data.get('status', serializer.instance.status if serializer.instance else 'NEEDS_REVIEW')
        concept = serializer.validated_data.get('concept', serializer.instance.concept if serializer.instance else None)
        current = Concept.objects.select_for_update().get(pk=concept.pk)
        version = serializer.validated_data.get('edit_version', serializer.instance.edit_version if serializer.instance else None)
        if status == 'VERIFIED' and version != current.edit_version:
            raise serializers.ValidationError('The lesson changed while this claim was being reviewed. Reload and verify the saved version.')
        serializer.save(reviewed_by=self.request.user if status == 'VERIFIED' else None, reviewed_at=timezone.now() if status == 'VERIFIED' else None)
