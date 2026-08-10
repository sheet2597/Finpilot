from django.urls import path

from . import views

urlpatterns = [
    path("documents/dashboard", views.DocumentDashboardView.as_view(), name="document-dashboard"),
    path("documents", views.DocumentListView.as_view(), name="document-list"),
    path("documents/upload", views.DocumentUploadView.as_view(), name="document-upload"),
    path("documents/archive", views.DocumentArchiveView.as_view(), name="document-archive"),
    path("documents/restore", views.DocumentRestoreView.as_view(), name="document-restore"),
    path("documents/download/<str:document_id>", views.DocumentDownloadView.as_view(), name="document-download"),
    path("documents/<str:document_id>", views.DocumentDetailView.as_view(), name="document-detail"),
]
