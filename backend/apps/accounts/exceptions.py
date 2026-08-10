from pymongo.errors import PyMongoError
from rest_framework.views import exception_handler
from rest_framework.exceptions import Throttled


def custom_exception_handler(exc, context):
    """Normalize all DRF errors into { "success": False, "message": str, "errors": {...} }"""
    response = exception_handler(exc, context)

    if response is None:
        # Part 9 QA fix: DRF's default handler only formats APIException /
        # Http404 / PermissionDenied. Anything else (e.g. a PyMongo
        # connectivity error while MongoDB is briefly unavailable) used to
        # fall straight through to Django's raw 500 error page, breaking the
        # API's "every response is JSON" contract and, with DEBUG=True,
        # leaking a full stack trace. We now catch known infrastructure
        # errors here and answer with the same envelope as everything else;
        # anything truly unexpected still propagates so it's visible in logs.
        if isinstance(exc, PyMongoError):
            from rest_framework.response import Response
            return Response(
                {
                    "success": False,
                    "message": "A backend service is temporarily unavailable. Please try again shortly.",
                    "errors": {"detail": "Database connection error."},
                },
                status=503,
            )
        return response

    message = "Something went wrong."
    if isinstance(exc, Throttled):
        wait = exc.wait
        message = f"Too many attempts. Please try again in {int(wait)} seconds." if wait else "Too many attempts. Please try again later."
    elif isinstance(response.data, dict) and "detail" in response.data:
        detail = response.data["detail"]
        message = str(detail[0]) if isinstance(detail, list) and detail else str(detail)
    else:
        message = "Validation failed."

    response.data = {
        "success": False,
        "message": message,
        "errors": response.data if isinstance(response.data, dict) else {"detail": response.data},
    }
    return response
