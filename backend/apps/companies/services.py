import os
import uuid

from django.conf import settings
from rest_framework.exceptions import PermissionDenied

from apps.mongo import connection as mongo_connection
from apps.mongo.utils import get_or_404, log_activity, now, paginate, serialize, to_object_id
from apps.accounts.roles import UserRole

LOGO_UPLOAD_DIR = "company_logos"


def _save_logo(file_obj):
    if not file_obj:
        return None
    ext = os.path.splitext(file_obj.name)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    rel_dir = os.path.join(LOGO_UPLOAD_DIR)
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)
    abs_path = os.path.join(abs_dir, filename)
    with open(abs_path, "wb") as dest:
        for chunk in file_obj.chunks():
            dest.write(chunk)
    return f"{settings.MEDIA_URL}{rel_dir}/{filename}"


def _assert_unique_gst(db, gst_number, exclude_id=None, owner_id=None):
    query = {"gst_number": gst_number, "is_deleted": False}
    if owner_id:
        query["owner_id"] = owner_id
    if exclude_id is not None:
        query["_id"] = {"$ne": exclude_id}
    if db.companies.find_one(query):
        from rest_framework.exceptions import ValidationError
        raise ValidationError({"gst_number": "A company with this GST number already exists."})


def get_accessible_company(db, user, company_id):
    """Returns (company_doc, is_owner). Raises 404/403 if inaccessible."""
    oid = to_object_id(company_id, field="company_id")
    company = get_or_404(db.companies, {"_id": oid, "is_deleted": False}, "Company not found.")

    role = UserRole.get_role_for_user(user)
    if role == UserRole.ADMIN:
        return company, True

    if company.get("owner_id") == str(user.id):
        return company, True
        
    client_id = company.get("client_id")
    if client_id:
        client = db.clients.find_one({"_id": to_object_id(client_id), "owner_id": str(user.id), "is_deleted": False})
        if client:
            return company, True

    raise PermissionDenied("You do not have access to this company.")


def list_companies(user, params):
    db = mongo_connection.get_db()
    role = UserRole.get_role_for_user(user)

    if role == UserRole.ADMIN:
        query = {"is_deleted": False}
    else:
        # Fetch companies that belong to clients owned by this CA
        ca_clients = list(db.clients.find({"owner_id": str(user.id), "is_deleted": False}, {"_id": 1}))
        client_ids = [str(c["_id"]) for c in ca_clients]
        query = {"client_id": {"$in": client_ids}, "is_deleted": False}

    client_id_filter = params.get("client_id")
    if client_id_filter:
        query["client_id"] = client_id_filter

    search = params.get("search")
    if search:
        # Resolve client names matching the search to include in company query
        matched_clients = list(db.clients.find(
            {"full_name": {"$regex": search, "$options": "i"}, "is_deleted": False},
            {"_id": 1}
        ))
        matched_client_ids = [str(c["_id"]) for c in matched_clients]

        or_conditions = [
            {"name": {"$regex": search, "$options": "i"}},
            {"gst_number": {"$regex": search, "$options": "i"}},
            {"pan_number": {"$regex": search, "$options": "i"}},
        ]
        if matched_client_ids:
            or_conditions.append({"client_id": {"$in": matched_client_ids}})
            
        query["$or"] = or_conditions

    business_type = params.get("business_type")
    if business_type:
        query["business_type"] = business_type

    status_filter = params.get("status")
    if status_filter:
        query["status"] = status_filter

    sort_field = params.get("sort_by", "created_at")
    sort_dir = -1 if params.get("sort_dir", "desc") == "desc" else 1
    allowed_sort_fields = {"name", "created_at", "financial_year", "status", "business_type"}
    if sort_field not in allowed_sort_fields:
        sort_field = "created_at"

    paginated_result = paginate(
        db.companies, query,
        page=params.get("page", 1), page_size=params.get("page_size", 10),
        sort_field=sort_field, sort_dir=sort_dir,
    )
    
    # Attach client names
    for item in paginated_result["items"]:
        if "client_id" in item:
            from apps.mongo.utils import to_object_id
            try:
                client = db.clients.find_one({"_id": to_object_id(item["client_id"])})
                if client:
                    item["client_name"] = client.get("full_name", "Unknown Client")
            except:
                pass
                
    return paginated_result


def create_company(user, data, logo_file=None):
    db = mongo_connection.get_db()
    
    client_id = data.get("client_id")
    from rest_framework.exceptions import PermissionDenied, ValidationError
    if not client_id:
        raise ValidationError({"client_id": "A Company must belong to a Client."})
        
    from apps.mongo.utils import to_object_id
    client = db.clients.find_one({"_id": to_object_id(client_id), "is_deleted": False})
    if not client:
        raise ValidationError({"client_id": "Client not found."})
    
    if client.get("owner_id") != str(user.id) and not getattr(user, "is_superuser", False):
        raise PermissionDenied("You do not own this client.")

    _assert_unique_gst(db, data.get("gst_number", ""), owner_id=str(user.id))

    logo_url = _save_logo(logo_file)
    doc = {
        **data,
        "owner_id": str(user.id), # keeping for legacy/convenience
        "logo_url": logo_url,
        "status": "active",
        "is_deleted": False,
        "deleted_at": None,
        "documents_count": 0,
        "transactions_count": 0,
        "created_at": now(),
        "updated_at": now(),
    }
    result = db.companies.insert_one(doc)
    doc["_id"] = result.inserted_id

    log_activity(user, "company_created", "company", result.inserted_id, {"name": data["name"]})
    return serialize(doc)


def get_company_detail(user, company_id):
    db = mongo_connection.get_db()
    company, is_owner = get_accessible_company(db, user, company_id)

    members_count = db.company_members.count_documents({"company_id": company["_id"]})
    owner = db.users.find_one({"user_id": company.get("owner_id")})

    result = serialize(company)
    
    if "client_id" in company:
        from apps.mongo.utils import to_object_id
        client = db.clients.find_one({"_id": to_object_id(company["client_id"])})
        if client:
            result["client_name"] = client.get("full_name")

    result["is_owner"] = is_owner
    result["members_count"] = members_count
    result["owner"] = serialize(owner) if owner else {"user_id": company.get("owner_id")}
    return result


def update_company(user, company_id, data, logo_file=None):
    db = mongo_connection.get_db()
    company, is_owner = get_accessible_company(db, user, company_id)
    if not is_owner:
        raise PermissionDenied("Only the company owner can edit this company.")

    if "gst_number" in data:
        _assert_unique_gst(db, data["gst_number"], exclude_id=company["_id"], owner_id=str(user.id))

    update_fields = {**data, "updated_at": now()}
    if logo_file:
        update_fields["logo_url"] = _save_logo(logo_file)

    db.companies.update_one({"_id": company["_id"]}, {"$set": update_fields})
    updated = db.companies.find_one({"_id": company["_id"]})
    log_activity(user, "company_updated", "company", company["_id"])
    return serialize(updated)


def delete_company(user, company_id):
    db = mongo_connection.get_db()
    company, is_owner = get_accessible_company(db, user, company_id)
    if not is_owner:
        raise PermissionDenied("Only the company owner can delete this company.")

    db.companies.update_one(
        {"_id": company["_id"]},
        {"$set": {"is_deleted": True, "deleted_at": now(), "status": "inactive"}},
    )
    
    # Soft delete related documents
    db.documents.update_many(
        {"company_id": company["_id"], "status": {"$ne": "deleted"}},
        {"$set": {"status": "deleted", "deleted_at": now(), "updated_at": now()}}
    )
    
    # Soft delete related transactions
    db.transactions.update_many(
        {"company_id": company["_id"], "status": {"$ne": "deleted"}},
        {"$set": {"status": "deleted", "updated_at": now()}}
    )
    
    # Hard delete company members link
    db.company_members.delete_many({"company_id": company["_id"]})
    
    log_activity(user, "company_deleted", "company", company["_id"])
