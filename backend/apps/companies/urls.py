from django.urls import path

from . import views

urlpatterns = [
    path("companies", views.CompanyListCreateView.as_view(), name="company-list-create"),
    path("companies/<str:company_id>", views.CompanyDetailView.as_view(), name="company-detail"),
]
