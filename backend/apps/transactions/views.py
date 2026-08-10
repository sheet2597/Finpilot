from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import RequireCompanyAccess
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.system.throttles import UploadRateThrottle

from . import services
from .serializers import (
    BulkIdsSerializer, BulkUpdateSerializer, BudgetSerializer, CategorySerializer,
    PartySerializer, PartyUpdateSerializer, TransactionCreateSerializer, TransactionUpdateSerializer,
)


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

class CategoryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categories = services.list_categories(request.user, request.query_params.get("type"))
        return Response({"success": True, "data": categories})

    def post(self, request):
        serializer = CategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = services.create_category(request.user, serializer.validated_data)
        return Response({"success": True, "message": "Category created.", "data": category}, status=status.HTTP_201_CREATED)


class CategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, category_id):
        services.delete_category(request.user, category_id)
        return Response({"success": True, "message": "Category deleted."})


# ---------------------------------------------------------------------------
# Vendors / Customers
# ---------------------------------------------------------------------------

class _PartyListCreateView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]
    party_type = None

    def get(self, request):
        params = {
            "page": request.query_params.get("page", 1),
            "page_size": request.query_params.get("page_size", 10),
            "search": request.query_params.get("search"),
        }
        result = services.list_parties(request.user, self.party_type, params)
        return Response({"success": True, "data": result["items"], "pagination": result["pagination"]})

    def post(self, request):
        serializer = PartySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        party = services.create_party(request.user, self.party_type, serializer.validated_data)
        return Response({"success": True, "message": f"{self.party_type.title()} created.", "data": party}, status=status.HTTP_201_CREATED)


class _PartyDetailView(APIView):
    permission_classes = [IsAuthenticated]
    party_type = None

    def get(self, request, party_id):
        return Response({"success": True, "data": services.get_party_detail(request.user, self.party_type, party_id)})

    def put(self, request, party_id):
        serializer = PartyUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        party = services.update_party(request.user, self.party_type, party_id, serializer.validated_data)
        return Response({"success": True, "message": f"{self.party_type.title()} updated.", "data": party})

    def delete(self, request, party_id):
        services.delete_party(request.user, self.party_type, party_id)
        return Response({"success": True, "message": f"{self.party_type.title()} deleted."})


class VendorListCreateView(_PartyListCreateView):
    party_type = "vendor"


class VendorDetailView(_PartyDetailView):
    party_type = "vendor"


class CustomerListCreateView(_PartyListCreateView):
    party_type = "customer"


class CustomerDetailView(_PartyDetailView):
    party_type = "customer"


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

class TransactionDashboardView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        from apps.mongo.utils import get_active_company_id
        company_id = get_active_company_id(request)
        summary = services.get_dashboard_summary(request.user, company_id)
        return Response({"success": True, "data": summary})


class PaymentAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        from apps.mongo.utils import get_active_company_id
        company_id = get_active_company_id(request)
        data = services.get_payment_analytics(
            request.user,
            company_id=company_id,
            date_from=request.query_params.get("date_from"),
            date_to=request.query_params.get("date_to"),
        )
        return Response({"success": True, "data": data})


class TransactionListCreateView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        from apps.mongo.utils import get_active_company_id
        company_id = get_active_company_id(request)
        params = {k: v for k, v in request.query_params.items()}
        if company_id:
            params["company_id"] = company_id
        result = services.list_transactions(request.user, params)
        return Response({"success": True, "data": result["items"], "pagination": result["pagination"]})

    def post(self, request):
        serializer = TransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transaction = services.create_transaction(request.user, serializer.validated_data)
        return Response({"success": True, "message": "Transaction created.", "data": transaction}, status=status.HTTP_201_CREATED)


class TransactionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transaction_id):
        return Response({"success": True, "data": services.get_transaction_detail(request.user, transaction_id)})

    def put(self, request, transaction_id):
        serializer = TransactionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transaction = services.update_transaction(request.user, transaction_id, serializer.validated_data)
        return Response({"success": True, "message": "Transaction updated.", "data": transaction})

    def delete(self, request, transaction_id):
        services.delete_transaction(request.user, transaction_id)
        return Response({"success": True, "message": "Transaction deleted."})


class TransactionBulkDeleteView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def post(self, request):
        serializer = BulkIdsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = services.bulk_delete_transactions(request.user, serializer.validated_data["ids"])
        return Response({"success": True, "data": results})


class TransactionBulkUpdateView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def post(self, request):
        serializer = BulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data.pop("ids")
        results = services.bulk_update_transactions(request.user, ids, serializer.validated_data)
        return Response({"success": True, "data": results})


class TransactionExportView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        params = {k: v for k, v in request.query_params.items() if k != "format"}
        if request.query_params.get("format") == "xlsx":
            content = services.export_transactions_xlsx(request.user, params)
            response = HttpResponse(content, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            response["Content-Disposition"] = 'attachment; filename="transactions.xlsx"'
            return response
        csv_content = services.export_transactions_csv(request.user, params)
        response = HttpResponse(csv_content, content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="transactions.csv"'
        return response


class TransactionImportView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]
    throttle_classes = [UploadRateThrottle]

    def post(self, request):
        company_id = request.data.get("company_id")
        file_obj = request.FILES.get("file")
        if not company_id or not file_obj:
            return Response({"success": False, "message": "company_id and file are required."}, status=status.HTTP_400_BAD_REQUEST)
        results = services.import_transactions_file(request.user, company_id, file_obj, file_obj.name)
        any_success = any(r["success"] for r in results)
        return Response({"success": any_success, "data": results}, status=status.HTTP_201_CREATED if any_success else status.HTTP_400_BAD_REQUEST)


class TransactionTagsView(APIView):
    """Canonical tag vocabulary + any custom tags already in use, for the
    tag picker in the transaction form and bulk-tag-update UI.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"success": True, "data": services.list_transaction_tags(request.user)})


class RecurringTransactionsView(APIView):
    """Read-only recurring-pattern list/detection. Never touches the
    `transactions` collection itself — writes only to `recurring_patterns`.
    """
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        from apps.mongo.utils import get_active_company_id
        company_id = get_active_company_id(request)
        patterns = services.list_recurring_patterns(request.user, company_id)
        return Response({"success": True, "data": patterns})

    def post(self, request):
        """Re-runs detection over the user's transactions and refreshes the
        stored patterns for the given (or all) company.
        """
        from apps.mongo.utils import get_active_company_id
        company_id = get_active_company_id(request)
        patterns = services.detect_recurring_transactions(request.user, company_id)
        return Response({"success": True, "message": f"Detected {len(patterns)} recurring pattern(s).", "data": patterns})


# ---------------------------------------------------------------------------
# Budgets
# ---------------------------------------------------------------------------

class BudgetListCreateView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        company_id = request.query_params.get("company_id")
        month = request.query_params.get("month")
        if not company_id or not month:
            return Response({"success": False, "message": "company_id and month are required."}, status=status.HTTP_400_BAD_REQUEST)
        budgets = services.list_budgets(request.user, company_id, month)
        return Response({"success": True, "data": budgets})

    def post(self, request):
        serializer = BudgetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        budget = services.set_budget(request.user, serializer.validated_data)
        return Response({"success": True, "message": "Budget saved.", "data": budget}, status=status.HTTP_201_CREATED)


class BudgetDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, budget_id):
        services.delete_budget(request.user, budget_id)
        return Response({"success": True, "message": "Budget deleted."})


class BudgetSummaryView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        company_id = request.query_params.get("company_id")
        month = request.query_params.get("month")
        if not company_id or not month:
            return Response({"success": False, "message": "company_id and month are required."}, status=status.HTTP_400_BAD_REQUEST)
        summary = services.get_budget_summary(request.user, company_id, month)
        return Response({"success": True, "data": summary})
