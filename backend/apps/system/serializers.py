from rest_framework import serializers


class UserPreferencesSerializer(serializers.Serializer):
    language = serializers.CharField(required=False)
    timezone = serializers.CharField(required=False)
    display_currency = serializers.CharField(required=False)
    theme = serializers.ChoiceField(choices=["light", "dark", "system"], required=False)
    default_financial_year = serializers.CharField(required=False, allow_null=True)
    default_landing_page = serializers.CharField(required=False)
    dashboard_widgets = serializers.ListField(child=serializers.CharField(), required=False)
    accessibility = serializers.DictField(required=False)
    active_company_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class CompanySettingsSerializer(serializers.Serializer):
    invoice_prefix = serializers.CharField(required=False)
    invoice_starting_number = serializers.IntegerField(required=False)
    invoice_notes = serializers.CharField(required=False, allow_blank=True)
    tax_preferences = serializers.DictField(required=False)
    business_hours = serializers.DictField(required=False)
    report_branding = serializers.DictField(required=False)
