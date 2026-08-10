from rest_framework import status
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .serializers import CompanyCreateSerializer, CompanyUpdateSerializer
from apps.accounts.permissions_registry import Permission
from apps.accounts.authorization import has_permission
from apps.accounts.ownership import can_access_company


class CompanyPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method == "GET":
            return has_permission(request.user, Permission.COMPANY_VIEW)
        elif request.method == "POST":
            return has_permission(request.user, Permission.COMPANY_CREATE)
        return False


class CompanyDetailPermission(BasePermission):
    def has_permission(self, request, view):
        company_id = view.kwargs.get("company_id")
        if not can_access_company(request.user, company_id):
            return False
        
        if request.method == "GET":
            return has_permission(request.user, Permission.COMPANY_VIEW)
        elif request.method in ("PUT", "PATCH"):
            return has_permission(request.user, Permission.COMPANY_UPDATE)
        elif request.method == "DELETE":
            return has_permission(request.user, Permission.COMPANY_DELETE)
        return False





class CompanyListCreateView(APIView):
    permission_classes = [IsAuthenticated, CompanyPermission]

    def get(self, request):
        params = {
            "page": request.query_params.get("page", 1),
            "page_size": request.query_params.get("page_size", 10),
            "search": request.query_params.get("search"),
            "business_type": request.query_params.get("business_type"),
            "status": request.query_params.get("status"),
            "sort_by": request.query_params.get("sort_by", "created_at"),
            "sort_dir": request.query_params.get("sort_dir", "desc"),
            "client_id": request.query_params.get("client_id"),
        }
        result = services.list_companies(request.user, params)
        return Response({"success": True, "data": result["items"], "pagination": result["pagination"]})

    def post(self, request):
        serializer = CompanyCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        logo_file = request.FILES.get("logo")
        company = services.create_company(request.user, serializer.validated_data, logo_file)
        return Response({"success": True, "message": "Company created successfully.", "data": company}, status=status.HTTP_201_CREATED)


class CompanyDetailView(APIView):
    permission_classes = [IsAuthenticated, CompanyDetailPermission]

    def get(self, request, company_id):
        company = services.get_company_detail(request.user, company_id)
        return Response({"success": True, "data": company})

    def put(self, request, company_id):
        serializer = CompanyUpdateSerializer(data=request.data, context={"company_id": company_id, "request": request})
        serializer.is_valid(raise_exception=True)
        logo_file = request.FILES.get("logo")
        company = services.update_company(request.user, company_id, serializer.validated_data, logo_file)
        return Response({"success": True, "message": "Company updated successfully.", "data": company})

    def delete(self, request, company_id):
        services.delete_company(request.user, company_id)
        return Response({"success": True, "message": "Company deleted successfully."})



