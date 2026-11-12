from copy import deepcopy
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Concept, LearningCourse, Module, Progress, QuizAttempt
from .assessments import passed_assignments
from .quality import PARTS


def public_content(snapshot):
    result = deepcopy(snapshot)
    assessment = result.get('content', {}).get('assessment', {})
    for q in assessment.get('quiz', []):
        q.pop('answer', None)
        q.pop('explanation', None)
    return result


class CurriculumView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        modules = Module.objects.prefetch_related('chapters__concepts')
        if request.query_params.get('course'):
            modules = modules.filter(course__slug=request.query_params['course'], course__is_active=True)
        else:
            modules = modules.filter(course__isnull=True)
        return Response([{
            'number': index if request.query_params.get('course') else m.number, 'title': m.title, 'slug': m.slug, 'objectives': m.objectives,
            'chapters': [{'title': ch.title, 'concepts': [{
                'slug': c.slug, 'title': c.published.get('title', c.title),
                'available': bool(c.version), 'status': 'published' if c.version else c.status,
                'difficulty': c.published.get('difficulty', c.difficulty),
            } for c in ch.concepts.all()]} for ch in m.chapters.all()],
        } for index, m in enumerate(modules, 1)])


class CourseCatalogView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        courses = LearningCourse.objects.filter(is_active=True).prefetch_related('modules__chapters__concepts')
        result = []
        for course in courses:
            concepts = [c for m in course.modules.all() for ch in m.chapters.all() for c in ch.concepts.all()]
            result.append({
                **{key: getattr(course, key) for key in ('slug', 'title', 'category', 'summary', 'level', 'effort_hours', 'prerequisites', 'outcomes', 'skills', 'projects', 'sources')},
                'module_count': len(course.modules.all()), 'concept_count': len(concepts),
                'published_count': sum(bool(c.version) for c in concepts),
            })
        return Response(result)


class DeploymentStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        response = Response({'release': settings.RELEASE_SHA, 'catalog_ready': LearningCourse.objects.filter(is_active=True).exists()})
        response['Cache-Control'] = 'no-store'
        return response


class ConceptView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        concept = get_object_or_404(Concept.objects.select_related('chapter__module__course'), slug=slug)
        if concept.chapter.module.course_id and not concept.chapter.module.course.is_active:
            return Response({'detail': 'This learning path is unavailable.'}, status=404)
        if course := request.query_params.get('course'):
            if not concept.chapter.module.course_id or concept.chapter.module.course.slug != course:
                return Response({'detail': 'This lesson does not belong to the requested course.'}, status=404)
        preview = request.query_params.get('preview') == '1'
        if preview:
            if not request.user.is_authenticated or not request.user.is_active or not request.user.is_staff:
                self.permission_denied(request)
            if not (request.user.has_perm('learning.view_concept') or request.user.has_perm('learning.change_concept')):
                self.permission_denied(request)
            data = {k: deepcopy(getattr(concept, k)) for k in ('title', 'content', 'difficulty', 'outcomes', 'references', 'seo_description')}
            data['prerequisites'] = list(concept.prerequisites.values_list('slug', flat=True))
        elif concept.version:
            data = public_content(concept.published)
        else:
            return Response({'detail': 'This concept is being prepared and has not been published.'}, status=404)
        data.update(slug=concept.slug, version=concept.version, preview=preview, module=concept.chapter.module.title,
                    minutes=max(1, sum(len(b['body'].split()) for p in data['content'].values() for b in p['blocks']) // 180))
        return Response(data)


class ProgressInput(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
    parts = serializers.ListField(child=serializers.ChoiceField(choices=PARTS), max_length=4, required=False)
    bookmark = serializers.BooleanField(required=False)
    notes = serializers.CharField(max_length=20000, allow_blank=True, required=False)


def progress_data(p, assignment_scores=None):
    if assignment_scores is None:
        assignment_scores = passed_assignments(p.user_id, [p.concept_id])
    completed = p.version == p.concept.version and len(set(p.parts)) == 4 and p.best_score >= 80
    assignment_score = assignment_scores.get((p.concept_id, p.concept.version))
    return {'slug': p.concept.slug, 'version': p.version, 'parts': p.parts, 'bookmark': p.bookmark,
            'notes': p.notes, 'best_score': p.best_score, 'completed': completed,
            'assignment_score': assignment_score, 'assignment_passed': assignment_score is not None,
            'mastered': completed and assignment_score is not None}


class ProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        scores = passed_assignments(request.user)
        return Response([progress_data(p, scores) for p in Progress.objects.filter(user=request.user).select_related('concept')])

    @transaction.atomic
    def patch(self, request, slug):
        concept = get_object_or_404(Concept.objects.select_for_update(), slug=slug, version__gt=0)
        serializer = ProgressInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data.pop('version') != concept.version:
            return Response({'detail': 'Lesson updated. Reload before saving progress.'}, status=409)
        p, _ = Progress.objects.get_or_create(user=request.user, concept=concept)
        p = Progress.objects.select_for_update().get(pk=p.pk)
        if p.version != concept.version:
            p.parts, p.best_score = [], 0
        p.version = concept.version
        for k, v in data.items():
            setattr(p, k, list(dict.fromkeys(v)) if k == 'parts' else v)
        p.save()
        return Response(progress_data(p))


class QuizView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, slug):
        concept = get_object_or_404(Concept.objects.select_for_update(), slug=slug, version__gt=0)
        quiz = concept.published['content']['assessment'].get('quiz', [])
        answers = request.data.get('answers')
        if type(request.data.get('version')) is not int or request.data.get('version') != concept.version:
            return Response({'detail': 'Lesson updated. Reload the assessment.'}, status=409)
        if not quiz or not isinstance(answers, list) or len(answers) != len(quiz) or any(type(a) is not int or not 0 <= a < len(q['options']) for a, q in zip(answers, quiz)):
            return Response({'detail': 'Submit one valid option index for every question.'}, status=400)
        correct = [a == q['answer'] for a, q in zip(answers, quiz)]
        score = round(100 * sum(correct) / len(quiz))
        QuizAttempt.objects.create(user=request.user, concept=concept, concept_version=concept.version,
                                   answers=answers, score=score, question_count=len(quiz), correct_count=sum(correct))
        p, _ = Progress.objects.get_or_create(user=request.user, concept=concept)
        p = Progress.objects.select_for_update().get(pk=p.pk)
        if p.version != concept.version:
            p.parts, p.best_score = [], 0
        p.version = concept.version
        p.best_score = max(p.best_score, score)
        p.save()
        return Response({'score': score, 'feedback': [{'correct': c, 'explanation': q['explanation']} for c, q in zip(correct, quiz)], 'progress': progress_data(p)})
