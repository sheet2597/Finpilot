from django.urls import path

from . import views

urlpatterns = [
    path("tax/dashboard", views.TaxDashboardView.as_view(), name="tax-dashboard"),
    path("tax/income-tax/estimate", views.IncomeTaxEstimateView.as_view(), name="tax-income-tax-estimate"),
    path("tax/income-tax/history", views.IncomeTaxHistoryView.as_view(), name="tax-income-tax-history"),

    path("tax/gst/dashboard", views.GstDashboardView.as_view(), name="tax-gst-dashboard"),
    path("tax/gst/summary", views.GstSummaryView.as_view(), name="tax-gst-summary"),
    path("tax/gst/itc-reconciliation", views.GstItcReconciliationView.as_view(), name="tax-gst-itc-reconciliation"),
    path("tax/gst/return-preparation", views.GstReturnPreparationView.as_view(), name="tax-gst-return-preparation"),
    path("tax/gst/calculator", views.GstCalculatorView.as_view(), name="tax-gst-calculator"),
    path("tax/gst/validate-gstin", views.GstinValidateView.as_view(), name="tax-gst-validate-gstin"),

    path("tax/tds/dashboard", views.TdsDashboardView.as_view(), name="tax-tds-dashboard"),
    path("tax/tds/summary", views.TdsSummaryView.as_view(), name="tax-tds-summary"),
    path("tax/tds/deduction-history", views.TdsDeductionHistoryView.as_view(), name="tax-tds-deduction-history"),
    path("tax/tds/calculator", views.TdsCalculatorView.as_view(), name="tax-tds-calculator"),

    path("tax/compliance-center", views.ComplianceCenterView.as_view(), name="tax-compliance-center"),
    path("tax/filing-readiness", views.FilingReadinessView.as_view(), name="tax-filing-readiness"),
]
