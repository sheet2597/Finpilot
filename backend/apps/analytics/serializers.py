from rest_framework import serializers

GRANULARITY_CHOICES = ["daily", "weekly", "monthly", "quarterly", "yearly"]
REPORT_FORMAT_CHOICES = ["xlsx", "pdf", "csv"]
TREND_METRICS = [
    "income", "expense", "cash_flow", "budget", "tax", "gst", "tds",
    "compliance", "financial_health", "ml_predictions",
]


class TrendQuerySerializer(serializers.Serializer):
    metric = serializers.ChoiceField(choices=TREND_METRICS)
    granularity = serializers.ChoiceField(choices=GRANULARITY_CHOICES, required=False, default="monthly")
    company_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class PeriodAnalysisQuerySerializer(serializers.Serializer):
    granularity = serializers.ChoiceField(choices=["monthly", "quarterly", "yearly"], required=False, default="monthly")
    company_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class ComparePeriodsSerializer(serializers.Serializer):
    company_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    period_a = serializers.CharField()
    period_b = serializers.CharField()
    granularity = serializers.ChoiceField(choices=["monthly", "quarterly", "yearly"], required=False, default="monthly")


class CompareCompaniesSerializer(serializers.Serializer):
    company_ids = serializers.ListField(child=serializers.CharField(), min_length=2)


class CompareClientsSerializer(serializers.Serializer):
    client_ids = serializers.ListField(child=serializers.CharField(), min_length=2)


class ReportQuerySerializer(serializers.Serializer):
    # Named file_format, not format: on a GET request, DRF reads a query
    # parameter literally named `format` for its own content-negotiation
    # before the view body runs. A field named `format` here collided with
    # that - `?format=csv`/`?format=pdf` 404'd unconditionally, and only
    # the unset default (xlsx) ever worked. Found + fixed in Part 10
    # testing (same root cause as the Audit Export fix).
    file_format = serializers.ChoiceField(choices=REPORT_FORMAT_CHOICES, required=False, default="xlsx")
    company_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    client_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    financial_year = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class BatchExportSerializer(serializers.Serializer):
    report_types = serializers.ListField(child=serializers.CharField(), min_length=1)
    format = serializers.ChoiceField(choices=REPORT_FORMAT_CHOICES, required=False, default="xlsx")
    company_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class GlobalSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=1)
    company_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
