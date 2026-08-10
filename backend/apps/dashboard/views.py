from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.mongo.utils import get_active_company_id
        company_id = get_active_company_id(request)
        return Response({"success": True, "data": services.get_summary(request.user, company_id)})
