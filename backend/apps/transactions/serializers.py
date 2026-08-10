import re
from decimal import Decimal

from rest_framework import serializers

TRANSACTION_TYPES = [
    "income", "expense", "transfer", "adjustment", "refund",
    "investment", "loan", "salary", "tax", "other",
]
STATUS_CHOICES = ["pending", "completed", "cancelled"]
PAYMENT_METHODS = [
    "cash", "bank_transfer", "net_banking", "cheque", "credit_card",
    "debit_card", "upi", "wallet", "other",
]
CATEGORY_TYPES = ["income", "expense"]

# Canonical tag vocabulary from the brief. `tags` on a transaction stays a
# free-form list (so nothing existing breaks), but the UI/API expose this
# set as suggestions, and Part 5's rule engine keys off these exact values.
TRANSACTION_TAGS = [
    "salary", "gst", "tds", "investment", "insurance", "loan",
    "medical", "donation", "business", "personal", "recurring",
]

GST_REGEX = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")


def _validate_gst(value):
    value = (value or "").upper().strip()
    if value and not GST_REGEX.match(value):
        raise serializers.ValidationError("Enter a valid 15-character GST number.")
    return value


class TransactionBaseSerializer(serializers.Serializer):
    date = serializers.DateField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    type = serializers.ChoiceField(choices=TRANSACTION_TYPES)
    category_id = serializers.CharField()
    description = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    company_id = serializers.CharField()
    vendor_id = serializers.CharField(required=False, allow_null=True, default=None)
    customer_id = serializers.CharField(required=False, allow_null=True, default=None)
    payment_method = serializers.ChoiceField(choices=PAYMENT_METHODS, default="bank_transfer")
    reference_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    invoice_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    gst_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=Decimal("0"))
    tds_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=Decimal("0"))
    document_id = serializers.CharField(required=False, allow_null=True, default=None)
    status = serializers.ChoiceField(choices=STATUS_CHOICES, default="completed")
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False, default=list)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate_gst_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("GST amount cannot be negative.")
        return value

    def validate_tds_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("TDS amount cannot be negative.")
        return value

    def validate_company_id(self, value):
        request = self.context.get("request") if self.context else None
        if not request:
            return value
        user = request.user
        from apps.accounts.ownership import can_access_company
        if not can_access_company(user, value):
            raise serializers.ValidationError("You do not have access to this company.")
        return value


class TransactionCreateSerializer(TransactionBaseSerializer):
    pass


class TransactionUpdateSerializer(TransactionBaseSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.required = False


class BulkIdsSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.CharField(), min_length=1)


class BulkUpdateSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.CharField(), min_length=1)
    category_id = serializers.CharField(required=False)
    status = serializers.ChoiceField(choices=STATUS_CHOICES, required=False)
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False)
    add_tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False)

    def validate(self, attrs):
        if not any(k in attrs for k in ("category_id", "status", "tags", "add_tags")):
            raise serializers.ValidationError("Provide category_id, status, tags, and/or add_tags to bulk update.")
        return attrs


class CategorySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    type = serializers.ChoiceField(choices=CATEGORY_TYPES)
    color = serializers.CharField(max_length=20, required=False, default="#6366F1")
    icon = serializers.CharField(max_length=50, required=False, default="tag")
    description = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class PartySerializer(serializers.Serializer):
    """Shared shape for Vendors and Customers - same fields, per the brief."""

    name = serializers.CharField(max_length=150)
    gst_number = serializers.CharField(max_length=15, required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    address = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_gst_number(self, value):
        return _validate_gst(value)


class PartyUpdateSerializer(PartySerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.required = False


class BudgetSerializer(serializers.Serializer):
    company_id = serializers.CharField()
    category_id = serializers.CharField(required=False, allow_null=True, default=None)
    month = serializers.RegexField(r"^\d{4}-(0[1-9]|1[0-2])$", error_messages={"invalid": "Provide a month as YYYY-MM."})
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Budget amount must be greater than zero.")
        return value

    def validate_company_id(self, value):
        request = self.context.get("request") if self.context else None
        if not request:
            return value
        user = request.user
        from apps.accounts.ownership import can_access_company
        if not can_access_company(user, value):
            raise serializers.ValidationError("You do not have access to this company.")
        return value
