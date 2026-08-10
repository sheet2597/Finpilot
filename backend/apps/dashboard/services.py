from apps.accounts.roles import UserRole
from apps.documents.services import get_user_company_ids
from apps.mongo import connection as mongo_connection
from apps.mongo.utils import serialize, to_object_id


def _transaction_match(user, company_id=None):
    """Scope transactions to one company or all companies the user can access."""
    if company_id:
        try:
            return {"company_id": to_object_id(company_id)}
        except Exception:
            pass
    company_ids = get_user_company_ids(user)
    if company_ids:
        return {"company_id": {"$in": company_ids}}
    return {"company_id": None}


def _sum_by_type(db, match, txn_type):
    agg = list(db.transactions.aggregate([
        {"$match": {**match, "type": txn_type, "status": {"$ne": "deleted"}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]))
    return float(agg[0]["total"]) if agg else 0.0


def _category_ids(db, names):
    return [c["_id"] for c in db.transaction_categories.find({"name": {"$in": names}})]


def _sum_by_categories(db, match, txn_type, category_names):
    cat_ids = _category_ids(db, category_names)
    if not cat_ids:
        return 0.0
    agg = list(db.transactions.aggregate([
        {"$match": {
            **match,
            "type": txn_type,
            "category_id": {"$in": cat_ids},
            "status": {"$ne": "deleted"},
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]))
    return float(agg[0]["total"]) if agg else 0.0


def _tax_liability(db, match):
    agg = list(db.transactions.aggregate([
        {"$match": {**match, "status": {"$ne": "deleted"}}},
        {"$group": {
            "_id": None,
            "gst": {"$sum": {"$ifNull": ["$gst_amount", 0]}},
            "tds": {"$sum": {"$ifNull": ["$tds_amount", 0]}},
        }},
    ]))
    if not agg:
        return 0.0
    return float(agg[0].get("gst", 0) or 0) + float(agg[0].get("tds", 0) or 0)


def get_summary(user, company_id=None):
    db = mongo_connection.get_db()
    role = UserRole.get_role_for_user(user)

    if role == UserRole.ADMIN:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        recent_companies = list(db.companies.find({"is_deleted": False}).sort("created_at", -1).limit(5))
        total_companies = db.companies.count_documents({"is_deleted": False})
        active_companies = db.companies.count_documents({"is_deleted": False, "status": "active"})
        total_clients = db.clients.count_documents({"is_deleted": False})
        
        summary_data = {
            "role": role.value,
            "total_companies": total_companies,
            "active_companies": active_companies,
            "recent_companies": serialize(recent_companies),
            "company_id": company_id,
            "total_clients": total_clients,
            "metrics": {
                "users": User.objects.count(),
                "total_clients": total_clients,
                "total_companies": total_companies,
            }
        }
        return summary_data

    # CA Role
    # Fetch CA's clients
    total_clients = db.clients.count_documents({"owner_id": str(user.id), "is_deleted": False})
    
    # Fetch CA's companies
    ca_clients = list(db.clients.find({"owner_id": str(user.id), "is_deleted": False}, {"_id": 1}))
    client_ids = [str(c["_id"]) for c in ca_clients]
    total_companies = db.companies.count_documents({"client_id": {"$in": client_ids}, "is_deleted": False})
    
    recent_companies = list(db.companies.find({"client_id": {"$in": client_ids}, "is_deleted": False}).sort("created_at", -1).limit(5))
    active_companies = db.companies.count_documents({"client_id": {"$in": client_ids}, "is_deleted": False, "status": "active"})

    summary_data = {
        "role": role.value,
        "total_companies": total_companies,
        "active_companies": active_companies,
        "recent_companies": serialize(recent_companies),
        "company_id": company_id,
        "total_clients": total_clients,
        "metrics": {
            "clients": total_clients,
            "companies": total_companies,
            "review_queue": 0,
            "compliance_score": 100.0,
            "audit_cases": 0,
        }
    }
    
    # Optionally calculate aggregate income/expenses if needed
    match_criteria = _transaction_match(user, company_id)
    summary_data["metrics"]["income"] = _sum_by_type(db, match_criteria, "income")
    summary_data["metrics"]["expenses"] = _sum_by_type(db, match_criteria, "expense")
    summary_data["metrics"]["tax_summary"] = _tax_liability(db, match_criteria)

    return summary_data
