"""Who may read a guide / project resource. Enforced on the server for every request (hiding a button is not access control)."""
from apps.enrollments.models import Enrollment

from .models import DownloadPermission, Order, Product, Project, ProjectGuide


def has_purchased(user, product: Product | None) -> bool:
    if not user or not user.is_authenticated or not product:
        return False
    return Order.objects.filter(user=user, payment_status__in=[Order.PAY_PAID, Order.PAY_PART], items__product=product).exists()


def guide_access(user, guide: ProjectGuide) -> bool:
    if guide.access_type == ProjectGuide.ACCESS_FREE:
        return True
    if user and user.is_authenticated and user.is_staff:
        return True
    if guide.access_type == ProjectGuide.ACCESS_ACCOUNT:
        return bool(user and user.is_authenticated)
    if not user or not user.is_authenticated:
        return False
    if guide.product_id and has_purchased(user, guide.product):
        return True
    if guide.access_type == ProjectGuide.ACCESS_INCLUDED:
        course_ids = list(guide.included_courses.values_list('id', flat=True))
        if course_ids and Enrollment.objects.filter(user=user, course_id__in=course_ids).exists():
            return True
    return False


def project_access(user, project: Project) -> bool:
    if not project.is_paid:
        return True
    if user and user.is_authenticated and user.is_staff:
        return True
    return has_purchased(user, project.product)


def order_for_request(request, number: str) -> Order | None:
    """The caller's own order: logged-in owner, or a guest holding the order token. Anything else gets None (a 404)."""
    order = Order.objects.filter(number=number).first()
    if not order:
        return None
    user = request.user
    if user.is_authenticated and order.user_id == user.id:
        return order
    token = request.headers.get('X-Order-Token') or request.query_params.get('token', '')
    from secrets import compare_digest

    if token and compare_digest(token, order.public_token):
        return order
    return None
