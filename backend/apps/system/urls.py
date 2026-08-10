from django.urls import path

from . import views

urlpatterns = [
    # User & Company Settings
    path("system/settings/user/", views.UserPreferencesView.as_view(), name="system-settings-user"),
    path("system/settings/company/<str:company_id>/", views.CompanySettingsView.as_view(), name="system-settings-company"),

    # Personalization (theme, layout, widget preferences)
    path("system/personalization/", views.PersonalizationView.as_view(), name="system-personalization"),

    # Import / Export catalog metadata
    path("system/data/export-catalog/", views.ExportCatalogView.as_view(), name="system-export-catalog"),
    path("system/data/import-catalog/", views.ImportCatalogView.as_view(), name="system-import-catalog"),
]
