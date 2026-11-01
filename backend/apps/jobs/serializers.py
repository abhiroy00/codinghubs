from urllib.parse import urlparse

from rest_framework import serializers

from .models import Job


class JobSerializer(serializers.ModelSerializer):
    is_open = serializers.BooleanField(read_only=True)
    work_mode_label = serializers.CharField(source='get_work_mode_display', read_only=True)
    job_type_label = serializers.CharField(source='get_job_type_display', read_only=True)
    experience_level_label = serializers.CharField(source='get_experience_level_display', read_only=True)

    class Meta:
        model = Job
        fields = (
            'id', 'slug', 'title', 'company_name', 'company_logo', 'company_about', 'location',
            'work_mode', 'work_mode_label', 'job_type', 'job_type_label', 'experience_level',
            'experience_level_label', 'experience', 'salary', 'description', 'responsibilities',
            'skills', 'qualifications', 'benefits', 'how_to_apply', 'application_url',
            'application_email', 'application_deadline', 'published_at', 'is_open',
        )


def _list_field(max_length=300):
    return serializers.ListField(
        child=serializers.CharField(max_length=max_length, trim_whitespace=True, allow_blank=True),
        max_length=30,
        required=False,
    )


class JobAdminSerializer(JobSerializer):
    responsibilities = _list_field()
    skills = _list_field(80)
    qualifications = _list_field()
    benefits = _list_field()

    class Meta(JobSerializer.Meta):
        fields = JobSerializer.Meta.fields + ('is_published', 'is_expired', 'created_at', 'updated_at')
        read_only_fields = ('id', 'slug', 'published_at', 'created_at', 'updated_at')

    def validate_company_logo(self, value):
        if not value:
            return value
        if value.startswith('/media/') and '..' not in value and '//' not in value[1:]:
            return value
        parsed = urlparse(value)
        if parsed.scheme == 'https' and parsed.netloc and ' ' not in value:
            return value
        raise serializers.ValidationError('Enter an https:// URL or an uploaded /media/ path.')

    def validate_application_url(self, value):
        if value and urlparse(value).scheme not in ('http', 'https'):
            raise serializers.ValidationError('Enter an http:// or https:// link.')
        return value

    def validate(self, attrs):
        url = attrs.get('application_url', getattr(self.instance, 'application_url', ''))
        email = attrs.get('application_email', getattr(self.instance, 'application_email', ''))
        if not url and not email:
            raise serializers.ValidationError({'application_url': 'Add an application link or an application email.'})
        for field in ('responsibilities', 'skills', 'qualifications', 'benefits'):
            if field in attrs:
                attrs[field] = list(dict.fromkeys(item.strip() for item in attrs[field] if item.strip()))
        return attrs
