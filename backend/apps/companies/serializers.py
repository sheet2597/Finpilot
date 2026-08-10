import re

from rest_framework import serializers

GST_REGEX = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$")
PAN_REGEX = re.compile(r"^[A-Z]{5}\d{4}[A-Z]{1}$")
FINANCIAL_YEAR_REGEX = re.compile(r"^\d{4}-\d{4}$")
PINCODE_REGEX = re.compile(r"^[A-Za-z0-9\- ]{3,10}$")

BUSINESS_TYPE_CHOICES = [
    "individual", "sole_proprietorship", "partnership", "llp",
    "private_limited", "public_limited", "huf", "other",
]


class CompanyBaseSerializer(serializers.Serializer):
    client_id = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=150)
    business_type = serializers.ChoiceField(choices=BUSINESS_TYPE_CHOICES)
    gst_number = serializers.CharField(max_length=15)
    pan_number = serializers.CharField(max_length=10)
    cin = serializers.CharField(max_length=25, required=False, allow_blank=True, default="")
    address = serializers.CharField()
    country = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=100)
    pincode = serializers.CharField(max_length=10)
    financial_year = serializers.CharField(max_length=9)
    currency = serializers.CharField(max_length=3)
    status = serializers.ChoiceField(choices=["active", "inactive"], required=False)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")

    def validate_gst_number(self, value):
        value = value.upper().strip()
        if not GST_REGEX.match(value):
            raise serializers.ValidationError("Enter a valid 15-character GST number.")
        return value

    def validate_pan_number(self, value):
        value = value.upper().strip()
        if not PAN_REGEX.match(value):
            raise serializers.ValidationError("Enter a valid 10-character PAN number.")
        return value

    def validate_financial_year(self, value):
        value = value.strip()
        if not FINANCIAL_YEAR_REGEX.match(value):
            raise serializers.ValidationError("Financial year must look like 2024-2025.")
        start, end = value.split("-")
        if int(end) != int(start) + 1:
            raise serializers.ValidationError("Financial year end must be one year after start.")
        return value

    def validate_currency(self, value):
        value = value.upper().strip()
        if not re.match(r"^[A-Z]{3}$", value):
            raise serializers.ValidationError("Currency must be a 3-letter code, e.g. INR, USD.")
        return value

    def validate_pincode(self, value):
        value = value.strip()
        if not PINCODE_REGEX.match(value):
            raise serializers.ValidationError("Enter a valid pincode.")
        return value

    def validate(self, attrs):
        from apps.mongo import connection as mongo_connection
        from apps.mongo.utils import to_object_id
        from bson import ObjectId

        db = mongo_connection.get_db()
        company_id = self.context.get("company_id")
        request = self.context.get("request")
        owner_id = str(request.user.id) if request and request.user else None
        
        exclude_oid = None
        if company_id:
            try:
                exclude_oid = to_object_id(company_id) if not isinstance(company_id, ObjectId) else company_id
            except Exception:
                pass
                
        base_query = {"is_deleted": False}
        if owner_id:
            base_query["owner_id"] = owner_id

        # Check name uniqueness
        name = attrs.get("name")
        client_id = attrs.get("client_id") or (db.companies.find_one({"_id": exclude_oid}).get("client_id") if exclude_oid else None)
        if name and client_id:
            query = {**base_query, "name": name, "client_id": client_id}
            if exclude_oid:
                query["_id"] = {"$ne": exclude_oid}
            if db.companies.find_one(query):
                raise serializers.ValidationError({"name": "This client already has a company with this name."})

        # Check gst_number uniqueness
        gst_number = attrs.get("gst_number")
        if gst_number:
            query = {**base_query, "gst_number": gst_number}
            if exclude_oid:
                query["_id"] = {"$ne": exclude_oid}
            if db.companies.find_one(query):
                raise serializers.ValidationError({"gst_number": "A company with this GST number already exists."})

        # Check pan_number uniqueness
        pan_number = attrs.get("pan_number")
        if pan_number:
            query = {**base_query, "pan_number": pan_number}
            if exclude_oid:
                query["_id"] = {"$ne": exclude_oid}
            if db.companies.find_one(query):
                raise serializers.ValidationError({"pan_number": "A company with this PAN number already exists."})

        # Check email uniqueness
        email = attrs.get("email")
        if email:
            query = {**base_query, "email": email}
            if exclude_oid:
                query["_id"] = {"$ne": exclude_oid}
            if db.companies.find_one(query):
                raise serializers.ValidationError({"email": "A company with this email already exists."})

        # Check phone uniqueness
        phone = attrs.get("phone")
        if phone:
            query = {**base_query, "phone": phone}
            if exclude_oid:
                query["_id"] = {"$ne": exclude_oid}
            if db.companies.find_one(query):
                raise serializers.ValidationError({"phone": "A company with this phone number already exists."})

        return attrs



class CompanyCreateSerializer(CompanyBaseSerializer):
    pass


class CompanyUpdateSerializer(CompanyBaseSerializer):
    """All fields optional on update - partial edits are allowed."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.required = False



