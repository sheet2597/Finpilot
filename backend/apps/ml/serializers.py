from rest_framework import serializers

from . import utils as ml_utils


class TrainModelSerializer(serializers.Serializer):
    model_type = serializers.ChoiceField(choices=ml_utils.ALL_MODEL_TYPES, required=False)


class CompanyScopedQuerySerializer(serializers.Serializer):
    company_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class CategorizationPredictSerializer(serializers.Serializer):
    transaction_ids = serializers.ListField(child=serializers.CharField(), required=False)


class ApplyCategorizationSerializer(serializers.Serializer):
    transaction_id = serializers.CharField()
    category_name = serializers.CharField()


class ForecastQuerySerializer(serializers.Serializer):
    periods_ahead = serializers.IntegerField(required=False, min_value=1, max_value=12, default=3)


class ReportQuerySerializer(serializers.Serializer):
    # Named file_format, not format - see apps/system/serializers.py and
    # apps/analytics/serializers.py for the full explanation. A field named
    # `format` on a GET-query serializer collides with DRF's own reserved
    # `format` query parameter (used for content-negotiation before the
    # view body runs), so `?format=pdf` 404'd unconditionally here too -
    # only the unset default (xlsx) ever worked. Found + fixed in Part 10.
    file_format = serializers.ChoiceField(choices=["xlsx", "pdf"], required=False, default="xlsx")
    company_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
