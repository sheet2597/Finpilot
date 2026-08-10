from django.urls import path

from . import views

urlpatterns = [
    path("transactions/dashboard", views.TransactionDashboardView.as_view(), name="transaction-dashboard"),
    path("transactions/payment-analytics", views.PaymentAnalyticsView.as_view(), name="transaction-payment-analytics"),
    path("transactions/export", views.TransactionExportView.as_view(), name="transaction-export"),
    path("transactions/import", views.TransactionImportView.as_view(), name="transaction-import"),
    path("transactions/bulk-delete", views.TransactionBulkDeleteView.as_view(), name="transaction-bulk-delete"),
    path("transactions/bulk-update", views.TransactionBulkUpdateView.as_view(), name="transaction-bulk-update"),
    path("transactions/tags", views.TransactionTagsView.as_view(), name="transaction-tags"),
    path("transactions/recurring", views.RecurringTransactionsView.as_view(), name="transaction-recurring"),
    path("transactions", views.TransactionListCreateView.as_view(), name="transaction-list"),
    path("transactions/<str:transaction_id>", views.TransactionDetailView.as_view(), name="transaction-detail"),

    path("categories", views.CategoryListCreateView.as_view(), name="category-list"),
    path("categories/<str:category_id>", views.CategoryDetailView.as_view(), name="category-detail"),

    path("vendors", views.VendorListCreateView.as_view(), name="vendor-list"),
    path("vendors/<str:party_id>", views.VendorDetailView.as_view(), name="vendor-detail"),

    path("customers", views.CustomerListCreateView.as_view(), name="customer-list"),
    path("customers/<str:party_id>", views.CustomerDetailView.as_view(), name="customer-detail"),

    path("budgets/summary", views.BudgetSummaryView.as_view(), name="budget-summary"),
    path("budgets", views.BudgetListCreateView.as_view(), name="budget-list"),
    path("budgets/<str:budget_id>", views.BudgetDetailView.as_view(), name="budget-detail"),
]
