from django.http import HttpResponse
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import RequireCompanyAccess
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ml import services as ml_services
from apps.mongo.utils import log_activity

from . import services
from .serializers import (
    BatchExportSerializer, CompareClientsSerializer,
    CompareCompaniesSerializer, ComparePeriodsSerializer, GlobalSearchQuerySerializer,
    PeriodAnalysisQuerySerializer, ReportQuerySerializer, TrendQuerySerializer,
)

# Report types delegated straight through to Part 6's existing builders — not duplicated here.
DELEGATED_ML_REPORTS = {
    "expense-forecast": lambda user, company_id, fmt: ml_services.build_expense_forecast_report(user, fmt),
    "tax-prediction": lambda user, company_id, fmt: ml_services.build_tax_prediction_report(user, fmt),
    "duplicate-transactions": lambda user, company_id, fmt: ml_services.build_duplicate_transaction_report(user, company_id, fmt),
    "compliance-risk": lambda user, company_id, fmt: ml_services.build_compliance_risk_report(user, company_id, fmt),
}


def _company_id(request):
    return request.query_params.get("company_id") or None


class AnalyticsDashboardView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        data = services.get_analytics_dashboard(request.user, _company_id(request))
        return Response({"success": True, "data": data})


class ExecutiveDashboardView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        data = services.get_executive_dashboard(request.user, _company_id(request))
        return Response({"success": True, "data": data})


class KPIView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        data = services.get_all_kpis(request.user, _company_id(request))
        return Response({"success": True, "data": data})


class BusinessInsightsView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        data = services.generate_business_insights(request.user, _company_id(request))
        return Response({"success": True, "data": data})


# ---------------------------------------------------------------------------
# Financial Analytics
# ---------------------------------------------------------------------------

FINANCIAL_ANALYSIS_HANDLERS = {
    "period": lambda user, cid, qp: services.period_analysis(user, cid, qp.get("granularity", "monthly")),
    "category-expense": lambda user, cid, qp: services.category_analysis(user, cid, "expense"),
    "category-income": lambda user, cid, qp: services.category_analysis(user, cid, "income"),
    "vendor": lambda user, cid, qp: services.party_analysis(user, cid, "vendor"),
    "customer": lambda user, cid, qp: services.party_analysis(user, cid, "customer"),
    "payment-method": lambda user, cid, qp: services.payment_method_analysis(user, cid),
    "budget": lambda user, cid, qp: services.budget_analysis(user, cid, qp.get("month")),
    "cash-flow": lambda user, cid, qp: services.cash_flow_analysis(user, cid),
    "income-vs-expense": lambda user, cid, qp: services.income_vs_expense(user, cid),
    "top-expenses": lambda user, cid, qp: services.top_transactions(user, cid, "expense", int(qp.get("limit", 10))),
    "top-income": lambda user, cid, qp: services.top_transactions(user, cid, "income", int(qp.get("limit", 10))),
    "recurring": lambda user, cid, qp: services.recurring_payments_analysis(user, cid),
    "loan": lambda user, cid, qp: services.loan_analysis(user, cid),
    "investment": lambda user, cid, qp: services.investment_analysis(user, cid),
    "insurance": lambda user, cid, qp: services.insurance_analysis(user, cid),
}


class FinancialAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request, analysis_type):
        handler = FINANCIAL_ANALYSIS_HANDLERS.get(analysis_type)
        if not handler:
            raise NotFound(f"Unknown analysis type '{analysis_type}'.")
        if analysis_type == "period":
            serializer = PeriodAnalysisQuerySerializer(data=request.query_params)
            serializer.is_valid(raise_exception=True)
        data = handler(request.user, _company_id(request), request.query_params)
        return Response({"success": True, "data": data})


# ---------------------------------------------------------------------------
# Trend Analysis
# ---------------------------------------------------------------------------

class TrendAnalysisView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        serializer = TrendQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        data = services.get_trend(request.user, v["metric"], v.get("granularity", "monthly"), v.get("company_id"))
        return Response({"success": True, "data": data})


# ---------------------------------------------------------------------------
# Comparative Analytics
# ---------------------------------------------------------------------------

class ComparePeriodsView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        serializer = ComparePeriodsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        data = services.compare_periods(request.user, v.get("company_id"), v["period_a"], v["period_b"], v.get("granularity", "monthly"))
        return Response({"success": True, "data": data})


class CompareCompaniesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CompareCompaniesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = services.compare_companies(request.user, serializer.validated_data["company_ids"])
        return Response({"success": True, "data": data})


class CompareClientsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CompareClientsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = services.compare_clients(request.user, serializer.validated_data["client_ids"])
        return Response({"success": True, "data": data})


class BudgetVsActualView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        company_id = _company_id(request)
        if not company_id:
            raise ValidationError("company_id is required for Budget vs Actual.")
        data = services.budget_vs_actual(request.user, company_id, request.query_params.get("month"))
        return Response({"success": True, "data": data})


class ForecastVsActualView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        data = services.forecast_vs_actual(request.user, _company_id(request))
        return Response({"success": True, "data": data})


class TaxEstimatedVsPaidView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        data = services.tax_estimated_vs_paid(request.user, _company_id(request))
        return Response({"success": True, "data": data})


# ---------------------------------------------------------------------------
# Report Center
# ---------------------------------------------------------------------------

class ReportCatalogView(APIView):
    """Lists every report type the Report Center can generate — new Part 7
    reports plus the Part 6 ones it delegates to, so the frontend Export
    Center has one source of truth instead of hardcoding two lists."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        catalog = [
            {"report_type": k, "label": k.replace("-", " ").title(), "source": "analytics"}
            for k in services.NEW_REPORT_BUILDERS
        ] + [
            {"report_type": k, "label": k.replace("-", " ").title(), "source": "ml"}
            for k in DELEGATED_ML_REPORTS
        ] + [{"report_type": "compliance", "label": "Compliance Report", "source": "analytics"}]
        return Response({"success": True, "data": catalog})


class ReportDownloadView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request, report_type):
        serializer = ReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        fmt, company_id, client_id, fy = v["file_format"], v.get("company_id"), v.get("client_id"), v.get("financial_year")

        if report_type in DELEGATED_ML_REPORTS:
            if fmt == "csv":
                raise ValidationError("This report supports xlsx/pdf only.")
            content, content_type, ext = DELEGATED_ML_REPORTS[report_type](request.user, company_id, fmt)
        elif report_type == "compliance":
            content, content_type, ext = services.build_compliance_report(request.user, company_id, client_id, fmt, fy)
        elif report_type in services.NEW_REPORT_BUILDERS:
            content, content_type, ext = services.NEW_REPORT_BUILDERS[report_type](request.user, company_id, fmt, fy)
        else:
            raise NotFound(f"Unknown report type '{report_type}'.")

        services.log_report_generation(request.user, report_type, fmt)
        log_activity(request.user, "analytics.download_report", "analytics_report", report_type, {"format": fmt})
        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{report_type}-report.{ext}"'
        return response


class BatchExportView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def post(self, request):
        serializer = BatchExportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        unknown = [r for r in v["report_types"] if r not in services.NEW_REPORT_BUILDERS]
        if unknown:
            raise ValidationError(f"Unsupported for batch export: {', '.join(unknown)}. Use single-report download for AI/ML reports.")
        content, content_type, ext = services.batch_export(request.user, v["report_types"], v["format"], v.get("company_id"))
        log_activity(request.user, "analytics.batch_export", "analytics_report", "batch", {"report_types": v["report_types"]})
        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="reports-batch.{ext}"'
        return response


# ---------------------------------------------------------------------------
# Global search
# ---------------------------------------------------------------------------

class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        serializer = GlobalSearchQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        data = services.global_search(request.user, v["q"], v.get("company_id"))
        return Response({"success": True, "data": data})
