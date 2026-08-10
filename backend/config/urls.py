from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# All versioned API routes. Mounted at both /api/ (what the frontend has
# always called) and /api/v1/ (explicit version, for new/external
# consumers) so introducing versioning doesn't break anything existing.
api_urlpatterns = [
    path("", include("apps.system.urls")),
    path("auth/", include("apps.accounts.urls")),
    path("clients/", include("apps.clients.urls")),
    path("", include("apps.companies.urls")),
    path("", include("apps.dashboard.urls")),
    path("", include("apps.documents.urls")),
    path("", include("apps.transactions.urls")),
    path("", include("apps.tax.urls")),
    path("", include("apps.ml.urls")),
    path("", include("apps.analytics.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_urlpatterns)),
    path("api/v1/", include(api_urlpatterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
