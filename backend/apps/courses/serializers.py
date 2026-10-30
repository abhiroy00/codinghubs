from rest_framework import serializers

from .models import Course, CourseCategory, LearningProgress


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
        fields = ('course_slug', 'current_day', 'completed_days', 'quiz_scores', 'completed_challenges', 'updated_at')
        read_only_fields = ('course_slug', 'updated_at')

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
