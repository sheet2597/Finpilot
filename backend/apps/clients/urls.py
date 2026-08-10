from django.urls import path
from . import views

urlpatterns = [
    path("", views.ClientListCreateView.as_view(), name="client-list-create"),
    path("<str:client_id>/", views.ClientDetailView.as_view(), name="client-detail"),
]
