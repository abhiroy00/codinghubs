from rest_framework import serializers

from .models import Course, CourseCategory


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
