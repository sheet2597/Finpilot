from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.permissions import RequirePermission, RequireCompanyAccess
from apps.accounts.permissions_registry import Permission

from apps.accounts.utils import log_audit

from . import gst_rules, services, tds_rules
from .serializers import GstCalculatorSerializer, TaxEstimateRequestSerializer, TdsCalculatorSerializer


class TaxDashboardView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.TAX_VIEW)]

    def get(self, request):
        data = services.get_tax_dashboard(request.user, request.query_params.get("company_id"))
        log_audit(request, "tax_dashboard_viewed", user=request.user, metadata={"company_id": request.query_params.get("company_id")})
        return Response({"success": True, "data": data})


class IncomeTaxEstimateView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.TAX_VIEW)]

    def post(self, request):
        serializer = TaxEstimateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.estimate_income_tax(
            request.user,
            company_id=serializer.validated_data.get("company_id"),
            financial_year=serializer.validated_data.get("financial_year"),
        )
        log_audit(request, "tax_estimate_generated", user=request.user, metadata={
            "financial_year": result["financial_year"],
            "recommended_regime": result["result"]["recommended_regime"],
        })
        return Response({"success": True, "data": result})


class IncomeTaxHistoryView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.TAX_VIEW)]

    def get(self, request):
        history = services.get_income_tax_history(request.user, request.query_params.get("company_id"))
        return Response({"success": True, "data": history})


# ---------------------------------------------------------------------------
# GST
# ---------------------------------------------------------------------------

class GstDashboardView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.TAX_VIEW)]

    def get(self, request):
        data = services.get_gst_dashboard(request.user, request.query_params.get("company_id"))
        log_audit(request, "gst_dashboard_viewed", user=request.user, metadata={"company_id": request.query_params.get("company_id")})
        return Response({"success": True, "data": data})


class GstSummaryView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.TAX_VIEW)]

    def get(self, request):
        data = services.get_gst_summary(
            request.user, request.query_params.get("company_id"), request.query_params.get("financial_year"),
        )
        return Response({"success": True, "data": data})


class GstItcReconciliationView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.TAX_VIEW)]

    def get(self, request):
        data = services.get_itc_reconciliation(
            request.user, request.query_params.get("company_id"), request.query_params.get("financial_year"),
        )
        return Response({"success": True, "data": data})


class GstReturnPreparationView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.TAX_VIEW)]

    def get(self, request):
        data = services.get_gst_return_preparation(
            request.user, request.query_params.get("company_id"), request.query_params.get("financial_year"),
        )
        return Response({"success": True, "data": data})


class GstCalculatorView(APIView):
    """Standalone what-if calculator — does not read or write any
    transaction data, purely computes a breakdown for the given inputs."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GstCalculatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = gst_rules.compute_gst_breakdown(
            float(serializer.validated_data["taxable_value"]),
            float(serializer.validated_data["rate"]),
            serializer.validated_data["supply_type"],
        )
        return Response({"success": True, "data": result})


class GstinValidateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_valid, normalized = gst_rules.validate_gstin(request.query_params.get("gstin", ""))
        return Response({"success": True, "data": {"is_valid": is_valid, "normalized": normalized}})


# ---------------------------------------------------------------------------
# TDS
# ---------------------------------------------------------------------------

class TdsDashboardView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.TAX_VIEW)]

    def get(self, request):
        data = services.get_tds_dashboard(request.user, request.query_params.get("company_id"))
        log_audit(request, "tds_dashboard_viewed", user=request.user, metadata={"company_id": request.query_params.get("company_id")})
        return Response({"success": True, "data": data})


class TdsSummaryView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.TAX_VIEW)]

    def get(self, request):
        data = services.get_tds_summary(
            request.user, request.query_params.get("company_id"), request.query_params.get("financial_year"),
        )
        return Response({"success": True, "data": data})


class TdsDeductionHistoryView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.TAX_VIEW)]

    def get(self, request):
        data = services.get_deduction_history(
            request.user, request.query_params.get("company_id"), request.query_params.get("financial_year"),
        )
        return Response({"success": True, "data": data})


class TdsCalculatorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TdsCalculatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = tds_rules.compute_tds(float(serializer.validated_data["amount"]), serializer.validated_data["section"])
        return Response({"success": True, "data": result})


# ---------------------------------------------------------------------------
# Compliance Center & Filing Readiness
# ---------------------------------------------------------------------------

class ComplianceCenterView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.COMPLIANCE_VIEW)]

    def get(self, request):
        data = services.get_compliance_center(
            request.user,
            company_id=request.query_params.get("company_id"),
            client_id=request.query_params.get("client_id"),
            financial_year=request.query_params.get("financial_year"),
        )
        log_audit(request, "compliance_center_viewed", user=request.user, metadata={
            "company_id": request.query_params.get("company_id"), "client_id": request.query_params.get("client_id"),
        })
        return Response({"success": True, "data": data})


class FilingReadinessView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess, RequirePermission(Permission.COMPLIANCE_VIEW)]

    def get(self, request):
        data = services.get_overall_filing_readiness(
            request.user,
            request.query_params.get("company_id"),
            request.query_params.get("financial_year"),
        )
        return Response({"success": True, "data": data})
