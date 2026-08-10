"""User personalization / UI-state preferences stored in MongoDB.
Used by the frontend to persist theme, layout, and display preferences
per user without requiring a full settings object.
"""
from apps.mongo import connection as mongo_connection
from apps.mongo.utils import now, serialize


def get_personalization(user):
    """Return the stored personalization document for this user.
    Returns sensible defaults if no document exists yet.
    """
    db = mongo_connection.get_db()
    doc = db.user_personalization.find_one({"user_id": str(user.id)})
    if doc:
        return serialize(doc)
    return {
        "user_id": str(user.id),
        "theme": "light",
        "sidebar_collapsed": False,
        "dashboard_widgets": [],
        "date_format": "DD/MM/YYYY",
        "number_format": "en-IN",
        "chart_type": "bar",
        "items_per_page": 10,
    }


def update_personalization(user, data):
    """Upsert personalization fields. Only the provided keys are updated;
    existing keys not in `data` are preserved.
    """
    db = mongo_connection.get_db()
    # Strip any attempt to change ownership
    safe_data = {k: v for k, v in data.items() if k not in ("user_id", "_id")}
    safe_data["updated_at"] = now()
    db.user_personalization.update_one(
        {"user_id": str(user.id)},
        {"$set": safe_data, "$setOnInsert": {"user_id": str(user.id), "created_at": now()}},
        upsert=True,
    )
    return serialize(db.user_personalization.find_one({"user_id": str(user.id)}))
