from rest_framework import serializers

CLIENT_TYPE_CHOICES = ["Individual", "Company"]
STATUS_CHOICES = ["active", "inactive"]

class ClientBaseSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    client_type = serializers.ChoiceField(choices=CLIENT_TYPE_CHOICES)
    pan_number = serializers.CharField(max_length=15, required=False, allow_blank=True, default="")
    gstin = serializers.CharField(max_length=15, required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    address = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=STATUS_CHOICES, default="active")

    def validate(self, attrs):
        # We could enforce uniqueness per CA owner if needed, but for now just validate standard format
        return attrs

class ClientCreateSerializer(ClientBaseSerializer):
    pass

class ClientUpdateSerializer(ClientBaseSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.required = False
