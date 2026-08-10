import os

from django.http import FileResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import RequireCompanyAccess
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .serializers import DocumentIdListSerializer, DocumentUpdateSerializer, DocumentUploadSerializer


class DocumentDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.mongo.utils import get_active_company_id
        company_id = get_active_company_id(request)
        return Response({"success": True, "data": services.get_dashboard_summary(request.user, company_id)})


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        from apps.mongo.utils import get_active_company_id
        company_id = get_active_company_id(request)
        params = {
            "page": request.query_params.get("page", 1),
            "page_size": request.query_params.get("page_size", 10),
            "search": request.query_params.get("search"),
            "category": request.query_params.get("category"),
            "status": request.query_params.get("status"),
            "company_id": company_id,
            "sort_by": request.query_params.get("sort_by", "created_at"),
            "sort_dir": request.query_params.get("sort_dir", "desc"),
        }
        result = services.list_documents(request.user, params)
        return Response({"success": True, "data": result["items"], "pagination": result["pagination"]})

    def post(self, request):
        # POST /api/documents behaves identically to POST /api/documents/upload.
        return _handle_upload(request)


class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def post(self, request):
        return _handle_upload(request)


def _handle_upload(request):
    serializer = DocumentUploadSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    files = request.FILES.getlist("files") or (
        [request.FILES["file"]] if "file" in request.FILES else []
    )
    results = services.upload_documents(
        request.user,
        serializer.validated_data["company_id"],
        serializer.validated_data["category"],
        files,
    )
    any_success = any(r.get("success") for r in results)
    return Response(
        {"success": any_success, "message": "Upload processed.", "data": results},
        status=status.HTTP_201_CREATED if any_success else status.HTTP_400_BAD_REQUEST,
    )


class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, document_id):
        return Response({"success": True, "data": services.get_document_detail(request.user, document_id)})

    def put(self, request, document_id):
        serializer = DocumentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = services.update_document(request.user, document_id, serializer.validated_data)
        return Response({"success": True, "message": "Document updated successfully.", "data": document})

    def delete(self, request, document_id):
        services.delete_document(request.user, document_id)
        return Response({"success": True, "message": "Document deleted successfully."})


class DocumentArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DocumentIdListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = [services.archive_document(request.user, doc_id) for doc_id in serializer.validated_data["document_ids"]]
        return Response({"success": True, "message": "Document(s) archived.", "data": results})


class DocumentRestoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DocumentIdListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = [services.restore_document(request.user, doc_id) for doc_id in serializer.validated_data["document_ids"]]
        return Response({"success": True, "message": "Document(s) restored.", "data": results})


class DocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, document_id):
        document, abs_path = services.get_document_for_download(request.user, document_id)
        response = FileResponse(open(abs_path, "rb"), content_type=document.get("mime_type", "application/octet-stream"))
        filename = document.get("filename") or os.path.basename(abs_path)
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
