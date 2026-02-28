"""Middleware and FastAPI dependencies for MedOS platform."""

from medos.middleware.audit import build_audit_event, log_audit_event
from medos.middleware.auth import get_current_user, get_tenant_db, require_roles
from medos.middleware.request_logging import RequestLoggingMiddleware

__all__ = [
    "RequestLoggingMiddleware",
    "build_audit_event",
    "get_current_user",
    "get_tenant_db",
    "log_audit_event",
    "require_roles",
]
