import logging

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.permissions import RequireCompanyAccess

from . import import_export_services, preference_services, settings_services
from .serializers import CompanySettingsSerializer, UserPreferencesSerializer

logger = logging.getLogger("apps.system")


# ---------------------------------------------------------------------------
# User & Company Settings
# ---------------------------------------------------------------------------

class UserPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"success": True, "data": settings_services.get_user_preferences(request.user)})

    def patch(self, request):
        serializer = UserPreferencesSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = settings_services.update_user_preferences(request.user, serializer.validated_data)
        return Response({"success": True, "data": data})


class CompanySettingsView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request, company_id):
        return Response({"success": True, "data": settings_services.get_company_settings(request.user, company_id)})

    def patch(self, request, company_id):
        serializer = CompanySettingsSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = settings_services.update_company_settings(request.user, company_id, serializer.validated_data)
        return Response({"success": True, "data": data})


# ---------------------------------------------------------------------------
# Personalization (UI preferences: theme, layout, widgets)
# ---------------------------------------------------------------------------

class PersonalizationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"success": True, "data": preference_services.get_personalization(request.user)})

    def patch(self, request):
        data = preference_services.update_personalization(request.user, request.data)
        return Response({"success": True, "data": data})


# ---------------------------------------------------------------------------
# Import / Export Catalog
# ---------------------------------------------------------------------------

class ExportCatalogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"success": True, "data": import_export_services.get_export_catalog(request.user)})


class ImportCatalogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"success": True, "data": import_export_services.get_import_catalog(request.user)})
