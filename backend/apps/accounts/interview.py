import json
import re
from functools import lru_cache
from pathlib import Path
from django.db import transaction
from django.db.models import Q
from django.http import Http404, HttpResponsePermanentRedirect
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import InterviewState


@lru_cache(maxsize=1)
def catalog():
    return json.loads((Path(__file__).parent / 'interview_catalog.json').read_text())


@lru_cache(maxsize=1)
def by_url():
    return {row['url']: row for row in catalog()}


def legacy_redirect(request, remainder=''):
    target = '/interview/' + remainder
    if not target.endswith('/'):
        target += '/'
    if request.META.get('QUERY_STRING'):
        target += '?' + request.META['QUERY_STRING']
    return HttpResponsePermanentRedirect(target)


class Page(PageNumberPagination):
    page_size = 24


class Resources(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        terms = request.query_params.get('q', '')[:200].casefold().split()
        category = request.query_params.get('category', '')
        difficulty = request.query_params.get('difficulty', '')
        kind = request.query_params.get('kind', '')
        rows = catalog()
        results = [row for row in rows if (not category or row['category'] == category) and (not difficulty or row['difficulty'] == difficulty) and (not kind or row['kind'] == kind) and all(term in (row['title'] + ' ' + row['summary'] + ' ' + row['search']).casefold() for term in terms)]
        if terms and kind in ('', 'question'):
            from apps.courses.models import CourseQuestion
            questions = CourseQuestion.objects.filter(is_published=True)
            for term in terms:
                questions = questions.filter(Q(question__icontains=term) | Q(answer__icontains=term) | Q(explanation__icontains=term) | Q(topic__icontains=term) | Q(example__icontains=term))
            for question in questions.order_by('id').iterator(chunk_size=200):
                source = by_url().get(f'/interview/{question.course_slug}/')
                if not source:
                    from apps.courses.roadmap import allowed_ids
                    try:
                        allowed_ids(question.course_slug)
                    except Http404:
                        continue
                    name = question.course_name
                    category_name = 'Cloud & Security' if re.search(r'cloud|aws|azure|security|cyber', name, re.I) else 'SQL & Data' if re.search(r'data|analytics|sql', name, re.I) else 'Languages' if re.search(r'full.stack|java|python|react|developer|coding', name, re.I) else 'AI & Technology'
                    source = {'category': category_name}
                level = {'basic':'Beginner', 'intermediate':'Intermediate', 'advanced':'Advanced'}[question.level]
                if (category and category != source['category']) or (difficulty and difficulty != level):
                    continue
                results.append({'url':f'/interview/{question.course_slug}/?question={question.pk}#practice', 'title':question.question[:180], 'category':source['category'], 'difficulty':level, 'summary':question.explanation[:320], 'kind':'question'})
        public = [{key: value for key, value in row.items() if key != 'search'} for row in results]
        pager = Page()
        selected = pager.paginate_queryset(public, request, view=self)
        response = pager.get_paginated_response(selected)
        response.data['categories'] = sorted({row['category'] for row in rows})
        response.data['difficulties'] = ['Beginner', 'Intermediate', 'Advanced']
        return response


class StateSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()

    class Meta:
        model = InterviewState
        fields = ['resource', 'title', 'bookmarked', 'completed', 'viewed_at', 'updated_at']

    def get_title(self, obj):
        return by_url().get(obj.resource, {}).get('title', 'Interview resource')


class PrivateState(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'private, no-store'
        return response


class StateList(PrivateState):
    def get(self, request):
        rows = InterviewState.objects.filter(user=request.user)
        if request.query_params.get('bookmarked') == 'true':
            rows = rows.filter(bookmarked=True)
        if request.query_params.get('completed') == 'true':
            rows = rows.filter(completed=True)
        pager = Page()
        return pager.get_paginated_response(StateSerializer(pager.paginate_queryset(rows, request, view=self), many=True).data)


class ResourceState(PrivateState):
    def resource(self, request):
        value = request.query_params.get('resource') if request.method == 'GET' else request.data.get('resource')
        if not isinstance(value, str) or value not in by_url():
            raise ValidationError({'resource': 'Use a known canonical Interview resource URL.'})
        return value

    def get(self, request):
        resource = self.resource(request)
        obj = InterviewState.objects.filter(user=request.user, resource=resource).first()
        return Response(StateSerializer(obj).data if obj else {'resource': resource, 'title': by_url()[resource]['title'], 'bookmarked': False, 'completed': False, 'viewed_at': None})

    @transaction.atomic
    def put(self, request):
        resource = self.resource(request)
        fields = {key: value for key, value in request.data.items() if key != 'resource'}
        if set(fields) - {'bookmarked', 'completed', 'viewed'} or any(type(value) is not bool for value in fields.values()):
            raise ValidationError('Use boolean bookmark, completion and view actions only.')
        obj, _ = InterviewState.objects.get_or_create(user=request.user, resource=resource)
        obj = InterviewState.objects.select_for_update().get(pk=obj.pk)
        for key in ['bookmarked', 'completed']:
            if key in fields:
                setattr(obj, key, fields[key])
        if fields.get('viewed'):
            obj.viewed_at = timezone.now()
        obj.save()
        return Response(StateSerializer(obj).data)
