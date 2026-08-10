from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AuditLog, EmailVerificationOTP, PasswordResetOTP, Profile, User


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = [ProfileInline]
    list_display = ("email", "full_name", "is_email_verified", "account_status", "created_at")
    list_filter = ("account_status", "is_email_verified")
    search_fields = ("email", "full_name")
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("full_name", "mobile_number", "country", "state")}),
        ("Status", {"fields": ("account_status", "is_email_verified", "accepted_terms", "is_active", "is_staff", "is_superuser")}),
        ("Important dates", {"fields": ("last_login", "last_login_at", "created_at", "updated_at")}),
    )
    readonly_fields = ("created_at", "updated_at")
    add_fieldsets = (
        (None, {"fields": ("email", "full_name", "password1", "password2")}),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "user", "ip_address", "created_at")
    list_filter = ("action",)
    readonly_fields = [f.name for f in AuditLog._meta.fields]


admin.site.register(EmailVerificationOTP)
admin.site.register(PasswordResetOTP)
