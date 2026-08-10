from django.urls import path

from . import views

urlpatterns = [
    # Model management
    path("ml/models/", views.ModelStatusView.as_view(), name="model-status"),
    path("ml/models/readiness/", views.MLReadinessView.as_view(), name="model-readiness"),
    path("ml/models/train-all/", views.TrainAllModelsView.as_view(), name="train-all"),
    path("ml/models/<str:model_type>/train/", views.TrainSingleModelView.as_view(), name="train-single"),
    path("ml/demo/<str:model_type>/train/", views.TrainDemoModelView.as_view(), name="train-demo"),

    # Module 1 — Expense categorization
    path("ml/expenses/categorize/", views.ExpenseCategorizationPredictView.as_view(), name="categorize-predict"),
    path("ml/expenses/apply-category/", views.ApplyCategorizationView.as_view(), name="categorize-apply"),

    # Module 2 — Duplicate Transaction Detection
    path("ml/transactions/duplicates/", views.DuplicateTransactionView.as_view(), name="duplicate-transactions"),

    # Module 3 — Compliance risk prediction
    path("ml/compliance/risk/", views.ComplianceRiskView.as_view(), name="compliance-risk"),
    path("ml/compliance/risk/rules/", views.ComplianceRiskRulesView.as_view(), name="compliance-risk-rules"),

    # Modules 4 & 5 — Forecasts
    path("ml/forecast/tax-liability/", views.TaxLiabilityForecastView.as_view(), name="forecast-tax"),
    path("ml/forecast/expenses/", views.ExpenseForecastView.as_view(), name="forecast-expenses"),

    # Reports
    path("ml/reports/<str:report_type>/", views.MLReportDownloadView.as_view(), name="ml-report-download"),
]
