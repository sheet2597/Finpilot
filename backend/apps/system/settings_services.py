"""User Settings + Company Settings.

Fields already owned by Part 1 (profile, password) and Part 2 (company
profile, GST/PAN, business type, financial year, currency, logo) are
**not** duplicated here — this module only adds the genuinely new
settings the Part 8 brief asks for, and otherwise points callers at the
existing Part 1/2 endpoints. Two new Mongo collections:
`user_preferences` (one doc per user) and `company_settings` (one doc
per company, owner-only to edit).
"""
from apps.companies.services import get_accessible_company
from apps.mongo import connection as mongo_connection
from apps.mongo.utils import now, serialize

DEFAULT_USER_PREFERENCES = {
    "language": "en",
    "timezone": "Asia/Kolkata",
    "display_currency": "INR",
    "theme": "system",
    "default_financial_year": None,  # None = always use the current FY
    "default_landing_page": "/dashboard",
    "dashboard_widgets": ["kpis", "insights", "alerts", "recent_reports"],
    "accessibility": {"high_contrast": False, "reduce_motion": False, "screen_reader_optimized": False},
    "active_company_id": None,
}

DEFAULT_COMPANY_SETTINGS = {
    "invoice_prefix": "INV",
    "invoice_starting_number": 1,
    "invoice_notes": "",
    "tax_preferences": {"default_gst_rate": 18.0, "default_tds_section": None, "auto_apply_gst": False},
    "business_hours": {"start": "09:00", "end": "18:00", "days": ["MO", "TU", "WE", "TH", "FR"]},
    "report_branding": {"accent_color": "#1E293B", "footer_text": "", "show_logo_on_reports": True},
}


def get_user_preferences(user):
    db = mongo_connection.get_db()
    doc = db.user_preferences.find_one({"user_id": str(user.id)})
    if not doc:
        pref = {**DEFAULT_USER_PREFERENCES, "user_id": str(user.id)}
    else:
        pref = {**DEFAULT_USER_PREFERENCES, **serialize(doc)}

    # Auto-select active company if not set or invalid
    active_id = pref.get("active_company_id")
    
    from apps.accounts.roles import UserRole
    role = UserRole.get_role_for_user(user)
    
    accessible_company_ids = []
    if role == UserRole.ADMIN:
        accessible_company_ids = [str(c["_id"]) for c in db.companies.find({"is_deleted": False})]
    else:
        # 1. Fetch companies directly owned by the user (legacy or admin-assigned)
        owned = [str(c["_id"]) for c in db.companies.find({"owner_id": str(user.id), "is_deleted": False})]
        accessible_company_ids.extend(owned)
        
        # 2. Fetch companies owned by clients that this CA manages
        clients = list(db.clients.find({"owner_id": str(user.id), "is_deleted": False}))
        if clients:
            client_ids = [str(c["_id"]) for c in clients]
            client_companies = list(db.companies.find({"client_id": {"$in": client_ids}, "is_deleted": False}))
            for c in client_companies:
                accessible_company_ids.append(str(c["_id"]))
                
    accessible_company_ids = list(set(accessible_company_ids))
    
    if not active_id or active_id not in accessible_company_ids:
        if accessible_company_ids:
            new_active_id = accessible_company_ids[0]
            db.user_preferences.update_one(
                {"user_id": str(user.id)},
                {"$set": {"active_company_id": new_active_id, "updated_at": now()}, "$setOnInsert": {"created_at": now()}},
                upsert=True
            )
            pref["active_company_id"] = new_active_id
        else:
            if active_id is not None:
                db.user_preferences.update_one(
                    {"user_id": str(user.id)},
                    {"$set": {"active_company_id": None, "updated_at": now()}},
                )
            pref["active_company_id"] = None

    return pref


def update_user_preferences(user, data):
    db = mongo_connection.get_db()
    allowed = set(DEFAULT_USER_PREFERENCES.keys())
    update_fields = {k: v for k, v in data.items() if k in allowed}
    update_fields["updated_at"] = now()
    db.user_preferences.update_one(
        {"user_id": str(user.id)}, {"$set": update_fields, "$setOnInsert": {"created_at": now()}}, upsert=True,
    )
    return get_user_preferences(user)


def get_company_settings(user, company_id):
    db = mongo_connection.get_db()
    get_accessible_company(db, user, company_id)  # 404/403 if inaccessible
    doc = db.company_settings.find_one({"company_id": company_id})
    if not doc:
        return {**DEFAULT_COMPANY_SETTINGS, "company_id": company_id}
    return {**DEFAULT_COMPANY_SETTINGS, **serialize(doc)}


def update_company_settings(user, company_id, data):
    db = mongo_connection.get_db()
    company, is_owner = get_accessible_company(db, user, company_id)
    if not is_owner:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Only the company owner can edit company settings.")

    allowed = set(DEFAULT_COMPANY_SETTINGS.keys())
    update_fields = {k: v for k, v in data.items() if k in allowed}
    update_fields["updated_at"] = now()
    db.company_settings.update_one(
        {"company_id": company_id},
        {"$set": update_fields, "$setOnInsert": {"company_id": company_id, "created_at": now()}},
        upsert=True,
    )
    return get_company_settings(user, company_id)
