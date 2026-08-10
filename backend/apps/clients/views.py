from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .serializers import ClientCreateSerializer, ClientUpdateSerializer

class ClientListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = {
            "page": request.query_params.get("page", 1),
            "page_size": request.query_params.get("page_size", 10),
            "search": request.query_params.get("search"),
            "status": request.query_params.get("status"),
            "sort_by": request.query_params.get("sort_by", "created_at"),
            "sort_dir": request.query_params.get("sort_dir", "desc"),
        }
        result = services.list_clients(request.user, params)
        return Response({"success": True, "data": result["items"], "pagination": result["pagination"]})

    def post(self, request):
        serializer = ClientCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client = services.create_client(request.user, serializer.validated_data)
        return Response({"success": True, "message": "Client created successfully.", "data": client}, status=status.HTTP_201_CREATED)

class ClientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        client = services.get_client_detail(request.user, client_id)
        return Response({"success": True, "data": client})

    def put(self, request, client_id):
        serializer = ClientUpdateSerializer(data=request.data, context={"client_id": client_id})
        serializer.is_valid(raise_exception=True)
        client = services.update_client(request.user, client_id, serializer.validated_data)
        return Response({"success": True, "message": "Client updated successfully.", "data": client})

    def delete(self, request, client_id):
        services.delete_client(request.user, client_id)
        return Response({"success": True, "message": "Client deleted successfully."})
