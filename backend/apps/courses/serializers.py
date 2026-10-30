from rest_framework import serializers

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


class LearningProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningProgress
        fields = ('course_slug', 'current_day', 'completed_days', 'quiz_scores', 'completed_challenges', 'completed_questions', 'completed_projects', 'last_learning_date', 'updated_at')
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

    def validate_completed_questions(self, value):
        if not isinstance(value, list) or any(not isinstance(question_id, int) or question_id < 1 for question_id in value):
            raise serializers.ValidationError('Completed questions must be a list of question IDs.')
        return sorted(set(value))

    def validate_completed_projects(self, value):
        if not isinstance(value, list) or any(not isinstance(slug, str) or len(slug) > 160 for slug in value):
            raise serializers.ValidationError('Completed projects must be a list of project identifiers.')
        return sorted(set(value))


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
