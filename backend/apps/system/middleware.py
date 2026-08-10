import logging
import time

logger = logging.getLogger("apps.system")


class RequestLoggingMiddleware:
    """Centralized request/response logging: method, path, status, duration,
    and the authenticated user id when available. Keeps things simple with
    a single structured log line per request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration_ms = round((time.monotonic() - start) * 1000, 2)

        user = getattr(request, "user", None)
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))
        user_id = str(user.id) if is_authenticated else "anonymous"

        logger.info(
            "%s %s -> %s (%sms) user=%s",
            request.method, request.get_full_path(), response.status_code, duration_ms, user_id,
        )

        return response


class SecurityHeadersMiddleware:
    """Adds standard security headers to every response."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data: https:; "
            "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
            "connect-src 'self';"
        )
        response["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response["Cross-Origin-Opener-Policy"] = "same-origin"
        response["Cross-Origin-Embedder-Policy"] = "credentialless"
        response["Cross-Origin-Resource-Policy"] = "same-origin"
        return response
