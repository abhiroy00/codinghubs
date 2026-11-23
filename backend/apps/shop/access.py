"""Who may read a guide / project resource. Enforced on the server for every request (hiding a button is not access control)."""
from apps.enrollments.models import Enrollment

from .models import Project, ProjectGuide


def guide_access(user, guide: ProjectGuide) -> bool:
    if guide.access_type == ProjectGuide.ACCESS_FREE:
        return True
    if user and user.is_authenticated and user.is_staff:
        return True
    if guide.access_type == ProjectGuide.ACCESS_ACCOUNT:
        return bool(user and user.is_authenticated)
    if not user or not user.is_authenticated:
        return False
    if guide.access_type == ProjectGuide.ACCESS_INCLUDED:
        course_ids = list(guide.included_courses.values_list('id', flat=True))
        if course_ids and Enrollment.objects.filter(user=user, course_id__in=course_ids).exists():
            return True
    return False


def project_access(user, project: Project) -> bool:
    if project.files_restricted:
        return bool(user and user.is_authenticated and user.is_staff)
    return True
