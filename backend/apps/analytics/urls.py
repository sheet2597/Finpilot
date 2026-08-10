from django.urls import path

from . import views

urlpatterns = [
    # Dashboards
    path("analytics/dashboard/", views.AnalyticsDashboardView.as_view(), name="analytics-dashboard"),
    path("analytics/executive-dashboard/", views.ExecutiveDashboardView.as_view(), name="analytics-executive-dashboard"),
    path("analytics/kpis/", views.KPIView.as_view(), name="analytics-kpis"),
    path("analytics/insights/", views.BusinessInsightsView.as_view(), name="analytics-insights"),

    # Financial Analytics
    path("analytics/financial/<str:analysis_type>/", views.FinancialAnalyticsView.as_view(), name="analytics-financial"),

    # Trend Analysis
    path("analytics/trends/", views.TrendAnalysisView.as_view(), name="analytics-trends"),

    # Comparative Analytics
    path("analytics/compare/periods/", views.ComparePeriodsView.as_view(), name="analytics-compare-periods"),
    path("analytics/compare/companies/", views.CompareCompaniesView.as_view(), name="analytics-compare-companies"),
    path("analytics/compare/clients/", views.CompareClientsView.as_view(), name="analytics-compare-clients"),
    path("analytics/compare/budget-vs-actual/", views.BudgetVsActualView.as_view(), name="analytics-budget-vs-actual"),
    path("analytics/compare/forecast-vs-actual/", views.ForecastVsActualView.as_view(), name="analytics-forecast-vs-actual"),
    path("analytics/compare/tax-estimated-vs-paid/", views.TaxEstimatedVsPaidView.as_view(), name="analytics-tax-estimated-vs-paid"),

    # Report Center
    path("analytics/reports/", views.ReportCatalogView.as_view(), name="analytics-report-catalog"),
    path("analytics/reports/batch-export/", views.BatchExportView.as_view(), name="analytics-batch-export"),
    path("analytics/reports/<str:report_type>/", views.ReportDownloadView.as_view(), name="analytics-report-download"),

    # Global search
    path("analytics/search/", views.GlobalSearchView.as_view(), name="analytics-search"),
]
