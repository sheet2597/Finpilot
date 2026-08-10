from django.urls import path

from . import views

urlpatterns = [
    path("register", views.RegisterView.as_view(), name="register"),
    path("verify-otp", views.VerifyOTPView.as_view(), name="verify-otp"),
    path("resend-otp", views.ResendOTPView.as_view(), name="resend-otp"),

    path("login", views.LoginView.as_view(), name="login"),
    path("refresh-token", views.RefreshTokenView.as_view(), name="refresh-token"),
    path("logout", views.LogoutView.as_view(), name="logout"),

    path("forgot-password", views.ForgotPasswordView.as_view(), name="forgot-password"),
    path("verify-reset-otp", views.VerifyResetOTPView.as_view(), name="verify-reset-otp"),
    path("reset-password", views.ResetPasswordView.as_view(), name="reset-password"),

    path("profile", views.ProfileView.as_view(), name="profile"),
    path("profile/stats", views.UserStatsView.as_view(), name="profile-stats"),
    path("change-password", views.ChangePasswordView.as_view(), name="change-password"),
    path("delete", views.DeleteAccountView.as_view(), name="delete-account"),
]
