from rest_framework.routers import DefaultRouter

from .views import CourseCategoryViewSet, CourseViewSet

router = DefaultRouter()
router.register('categories', CourseCategoryViewSet, basename='course-category')
router.register('', CourseViewSet, basename='course')

urlpatterns = router.urls
