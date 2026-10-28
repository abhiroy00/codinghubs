from .models import AuditLog


def client_prefix(request) -> str:
    """Coarse client address for the audit trail: IPv4 /24 or IPv6 /48-ish, not the full address."""
    if request is None:
        return ''
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
    if ':' in ip:
        return ':'.join(ip.split(':')[:3]) + '::'
    parts = ip.split('.')
    return '.'.join(parts[:3]) + '.0' if len(parts) == 4 else ''


def log(actor, action, obj, detail=None, request=None):
    AuditLog.objects.create(
        actor=actor if getattr(actor, 'is_authenticated', False) else None,
        action=action,
        object_type=obj.__class__.__name__,
        object_id=str(getattr(obj, 'pk', obj)),
        detail=detail or {},
        ip_prefix=client_prefix(request),
    )
