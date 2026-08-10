from rest_framework import serializers

CATEGORY_CHOICES = [
    "invoice", "bank_statement", "gst", "tds",
    "income_tax", "receipt", "excel", "other",
]


class DocumentUploadSerializer(serializers.Serializer):
    company_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    category = serializers.ChoiceField(choices=CATEGORY_CHOICES, default="other")

    def validate(self, attrs):
        company_id = attrs.get("company_id")
        request = self.context.get("request")
        if not company_id and request:
            from apps.mongo.utils import get_active_company_id
            company_id = get_active_company_id(request)
            
        if not company_id:
            raise serializers.ValidationError({"company_id": "No active company selected."})
            
        if request:
            from apps.accounts.ownership import can_access_company
            if not can_access_company(request.user, company_id):
                raise serializers.ValidationError({"company_id": "You do not have access to this company."})
                
        attrs["company_id"] = company_id
        return attrs



class DocumentUpdateSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255, required=False)
    category = serializers.ChoiceField(choices=CATEGORY_CHOICES, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one field to update.")
        return attrs


class DocumentIdListSerializer(serializers.Serializer):
    """Used by the bulk archive/restore endpoints."""

    document_ids = serializers.ListField(child=serializers.CharField(), min_length=1)
