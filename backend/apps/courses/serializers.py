from rest_framework import serializers

from django.conf import settings

from .models import Course, CourseCategory, CourseCertificate, CourseQuestion, LearningProgress


class CourseSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)

    class Meta:
        model = Course
        fields = (
            'id', 'slug', 'name', 'category', 'category_name', 'category_color',
            'duration_display', 'placement_rate', 'salary_range_display', 'price',
        )


class CourseCategorySerializer(serializers.ModelSerializer):
    courses = CourseSerializer(many=True, read_only=True)

    class Meta:
        model = CourseCategory
        fields = ('id', 'slug', 'name', 'color', 'tagline', 'description', 'courses')


PASS_SCORE = 3


class LearningProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningProgress
        fields = ('course_slug', 'current_day', 'completed_days', 'quiz_scores', 'completed_challenges', 'completed_theory', 'completed_questions', 'completed_projects', 'last_learning_date', 'updated_at')
        read_only_fields = ('course_slug', 'last_learning_date', 'updated_at')

    def validate_current_day(self, value):
        if not 1 <= value <= 30:
            raise serializers.ValidationError('Day must be between 1 and 30.')
        return value

    def validate_completed_days(self, value):
        if not isinstance(value, list) or any(not isinstance(day, int) or day < 1 or day > 30 for day in value):
            raise serializers.ValidationError('Completed days must be a list of day numbers from 1 to 30.')
        return sorted(set(value))

    def validate_completed_challenges(self, value):
        if not isinstance(value, list) or any(not isinstance(day, int) or day < 1 or day > 30 for day in value):
            raise serializers.ValidationError('Completed challenges must be a list of day numbers from 1 to 30.')
        return sorted(set(value))

    def validate_completed_theory(self, value):
        if not isinstance(value, list) or any(not isinstance(day, int) or day < 1 or day > 30 for day in value):
            raise serializers.ValidationError('Completed lessons must be a list of day numbers from 1 to 30.')
        return sorted(set(value))

    def validate_quiz_scores(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Quiz scores must map a day to a score.')
        scores = {}
        for day, score in value.items():
            if not str(day).isdigit() or not 1 <= int(day) <= 30 or not isinstance(score, int) or not 0 <= score <= 5:
                raise serializers.ValidationError('Quiz scores must map days 1–30 to a score from 0 to 5.')
            scores[str(int(day))] = score
        return scores

    def validate_completed_questions(self, value):
        if not isinstance(value, list) or any(not isinstance(question_id, int) or question_id < 1 for question_id in value):
            raise serializers.ValidationError('Completed questions must be a list of question IDs.')
        return sorted(set(value))

    def validate_completed_projects(self, value):
        if not isinstance(value, list) or any(not isinstance(slug, str) or len(slug) > 160 for slug in value):
            raise serializers.ValidationError('Completed projects must be a list of project identifiers.')
        return sorted(set(value))

    def validate(self, attrs):
        # Days unlock one at a time: a day can only be newly completed once the day before it is completed.
        sequential = getattr(settings, 'PREP_REQUIRE_SEQUENTIAL_UNLOCK', False)
        previous = set(self.instance.completed_days or []) if self.instance else set()
        done = set(attrs.get('completed_days', previous))
        accepted = set(previous)
        theory = set(attrs.get('completed_theory', getattr(self.instance, 'completed_theory', None) or []))
        practice = set(attrs.get('completed_challenges', getattr(self.instance, 'completed_challenges', None) or []))
        scores = {str(k): v for k, v in (attrs.get('quiz_scores', getattr(self.instance, 'quiz_scores', None) or {})).items()}
        for day in sorted(done - previous):
            if sequential and day != 1 and day - 1 not in accepted:
                raise serializers.ValidationError({'completed_days': f'Complete Day {day - 1} to unlock Day {day}.'})
            # A day is complete once its lesson is read, its practice is solved and its quiz is passed.
            if day not in theory or day not in practice or scores.get(str(day), 0) < PASS_SCORE:
                raise serializers.ValidationError({'completed_days': f'Finish the lesson, practice and quiz (at least {PASS_SCORE}/5) for Day {day} first.'})
            accepted.add(day)
        # With sequential unlocking the open day must be a completed day or the first day not yet completed.
        if sequential and 'current_day' in attrs:
            frontier = next((day for day in range(1, 31) if day not in done), 30)
            if attrs['current_day'] not in done and attrs['current_day'] != frontier:
                attrs['current_day'] = frontier
        return attrs


class CourseQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseQuestion
        fields = ('id', 'course_slug', 'course_name', 'level', 'topic', 'question', 'answer', 'explanation', 'coding_prompt', 'coding_solution', 'example')


class CourseCertificateSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    course_name = serializers.SerializerMethodField()
    certificate_id = serializers.UUIDField(format='hex')

    class Meta:
        model = CourseCertificate
        fields = ('course_slug', 'course_name', 'user_name', 'certificate_id', 'completed_at')

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_course_name(self, obj):
        from .course_catalog import COURSES
        return next((name for slug, name, _track in COURSES if slug == obj.course_slug), obj.course_slug.replace('-', ' ').title())
