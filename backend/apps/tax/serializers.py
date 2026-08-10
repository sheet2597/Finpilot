from decimal import Decimal

from rest_framework import serializers

from .gst_rules import GST_RATE_SLABS
from .tds_rules import TDS_SECTIONS


class TaxEstimateRequestSerializer(serializers.Serializer):
    company_id = serializers.CharField(required=False, allow_null=True, default=None)
    financial_year = serializers.RegexField(
        r"^\d{4}-\d{2}$", required=False, allow_null=True, default=None,
        error_messages={"invalid": "Provide a financial year like '2025-26'."},
    )


class GstCalculatorSerializer(serializers.Serializer):
    taxable_value = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"))
    rate = serializers.ChoiceField(choices=GST_RATE_SLABS)
    supply_type = serializers.ChoiceField(choices=["intra_state", "inter_state"], default="intra_state")


class TdsCalculatorSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"))
    section = serializers.ChoiceField(choices=list(TDS_SECTIONS.keys()))
