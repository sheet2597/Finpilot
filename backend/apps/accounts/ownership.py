from bson import ObjectId
from rest_framework.exceptions import NotFound
from apps.mongo import connection as mongo_connection
from apps.mongo.utils import to_object_id
from .roles import UserRole

def get_company_by_id(db, company_id):
    try:
        oid = to_object_id(company_id) if not isinstance(company_id, ObjectId) else company_id
    except Exception:
        raise NotFound("Company not found.")
    company = db.companies.find_one({"_id": oid, "is_deleted": False})
    if not company:
        raise NotFound("Company not found.")
    return company

def can_access_company(user, company_id) -> bool:
    """
    Checks if a user can access a specific company.
    - Owner/User: must own the company.
    - Admin: full access.
    """
    if not user or not user.is_authenticated:
        return False
    
    role = UserRole.get_role_for_user(user)
    if role == UserRole.ADMIN:
        return True

    db = mongo_connection.get_db()
    company = get_company_by_id(db, company_id)

    return company.get("owner_id") == str(user.id)

