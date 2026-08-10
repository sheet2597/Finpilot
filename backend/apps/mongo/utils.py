from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from rest_framework.exceptions import NotFound, ValidationError

from . import connection


def now():
    # PyMongo stores/reads BSON dates as naive UTC datetimes by default, so we
    # keep everything naive here to avoid aware/naive comparison bugs.
    return datetime.utcnow()


def to_object_id(value, field="id"):
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        raise ValidationError({field: "Invalid identifier."})


def serialize(doc):
    """Recursively convert a Mongo document into a JSON-safe dict."""
    if doc is None:
        return None
    if isinstance(doc, (list, tuple, set)):
        return [serialize(item) for item in doc]
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    from decimal import Decimal
    from bson.decimal128 import Decimal128
    from bson.binary import Binary
    if isinstance(doc, Decimal128):
        return float(doc.to_decimal())
    if isinstance(doc, Decimal):
        return float(doc)
    if isinstance(doc, Binary):
        try:
            return doc.decode("utf-8")
        except Exception:
            import base64
            return base64.b64encode(doc).decode("utf-8")
    if isinstance(doc, dict):
        out = {}
        for key, value in doc.items():
            if key == "_id":
                out["id"] = str(value)
            else:
                out[key] = serialize(value)
        return out
    return doc



def get_or_404(collection, query, message="Resource not found."):
    doc = collection.find_one(query)
    if not doc:
        raise NotFound(message)
    return doc


def paginate(collection, query, page=1, page_size=10, sort_field="created_at", sort_dir=-1):
    page = max(int(page or 1), 1)
    page_size = min(max(int(page_size or 10), 1), 100)
    total = collection.count_documents(query)
    cursor = (
        collection.find(query)
        .sort(sort_field, sort_dir)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    items = [serialize(doc) for doc in cursor]
    return {
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if page_size else 0,
        },
    }


def log_activity(user, action, entity_type, entity_id, metadata=None):
    db = connection.get_db()
    db.activity_logs.insert_one({
        "user_id": str(user.id),
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "metadata": metadata or {},
        "created_at": now(),
    })


def sync_user(user):
    """Mirror the minimal profile fields Part 2 needs into the Mongo `users`
    collection, keyed by the Postgres user id. Called from Part 1's
    register/login/profile-update views so Mongo stays in sync without
    Part 2 ever touching the Django ORM."""
    db = connection.get_db()
    db.users.update_one(
        {"user_id": str(user.id)},
        {
            "$set": {
                "user_id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "mobile_number": user.mobile_number,
                "role": "CA",
                "updated_at": now(),
            },
            "$setOnInsert": {"created_at": now()},
        },
        upsert=True,
    )


def get_active_company_id(request):
    company_id = None
    if request.query_params:
        company_id = request.query_params.get("company_id")
    if not company_id and isinstance(request.data, dict):
        company_id = request.data.get("company_id")
    if not company_id and hasattr(request, "parser_context") and request.parser_context:
        company_id = request.parser_context.get("kwargs", {}).get("company_id")
        
    if not company_id:
        from apps.system.settings_services import get_user_preferences
        pref = get_user_preferences(request.user)
        company_id = pref.get("active_company_id")
    return company_id

