from rest_framework.throttling import UserRateThrottle


class UploadRateThrottle(UserRateThrottle):
    """Applied to file-upload / bulk-import endpoints, which are heavier
    than a typical CRUD call and worth a stricter per-user rate."""

    scope = "upload"
