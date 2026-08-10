from rest_framework.exceptions import PermissionDenied
from apps.mongo import connection as mongo_connection
from apps.mongo.utils import get_or_404, log_activity, now, paginate, serialize, to_object_id
from apps.accounts.roles import UserRole

def get_accessible_client(db, user, client_id):
    """Returns (client_doc, is_owner). Raises 404/403 if inaccessible."""
    oid = to_object_id(client_id, field="client_id")
    client = get_or_404(db.clients, {"_id": oid, "is_deleted": False}, "Client not found.")

    role = UserRole.get_role_for_user(user)
    if role == UserRole.ADMIN:
        return client, True

    if client.get("owner_id") == str(user.id):
        return client, True

    raise PermissionDenied("You do not have access to this client.")

def list_clients(user, params):
    db = mongo_connection.get_db()
    role = UserRole.get_role_for_user(user)

    if role == UserRole.ADMIN:
        query = {"is_deleted": False}
    else:
        query = {"owner_id": str(user.id), "is_deleted": False}

    search = params.get("search")
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"pan_number": {"$regex": search, "$options": "i"}},
            {"gstin": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    status_filter = params.get("status")
    if status_filter:
        query["status"] = status_filter

    sort_field = params.get("sort_by", "created_at")
    sort_dir = -1 if params.get("sort_dir", "desc") == "desc" else 1
    allowed_sort_fields = {"full_name", "created_at", "status", "client_type"}
    if sort_field not in allowed_sort_fields:
        sort_field = "created_at"

    return paginate(
        db.clients, query,
        page=params.get("page", 1), page_size=params.get("page_size", 10),
        sort_field=sort_field, sort_dir=sort_dir,
    )

def create_client(user, data):
    db = mongo_connection.get_db()
    
    doc = {
        **data,
        "owner_id": str(user.id),
        "status": data.get("status", "active"),
        "is_deleted": False,
        "deleted_at": None,
        "created_at": now(),
        "updated_at": now(),
    }
    result = db.clients.insert_one(doc)
    doc["_id"] = result.inserted_id

    log_activity(user, "client_created", "client", result.inserted_id, {"full_name": data["full_name"]})
    return serialize(doc)

def get_client_detail(user, client_id):
    db = mongo_connection.get_db()
    client, is_owner = get_accessible_client(db, user, client_id)

    # Calculate statistics
    companies = list(db.companies.find({"client_id": str(client["_id"]), "is_deleted": False}))
    total_companies = len(companies)
    
    total_documents = sum(c.get("documents_count", 0) for c in companies)
    total_transactions = sum(c.get("transactions_count", 0) for c in companies)

    result = serialize(client)
    result["is_owner"] = is_owner
    result["statistics"] = {
        "total_companies": total_companies,
        "total_documents": total_documents,
        "total_transactions": total_transactions,
        "compliance_score": 100,  # Placeholder or calculated later
    }
    
    # We also return the companies list for convenience
    result["companies"] = serialize(companies)
    return result

def update_client(user, client_id, data):
    db = mongo_connection.get_db()
    client, is_owner = get_accessible_client(db, user, client_id)
    if not is_owner:
        raise PermissionDenied("Only the client owner can edit this client.")

    update_fields = {**data, "updated_at": now()}
    db.clients.update_one({"_id": client["_id"]}, {"$set": update_fields})
    updated = db.clients.find_one({"_id": client["_id"]})
    log_activity(user, "client_updated", "client", client["_id"])
    return serialize(updated)

def delete_client(user, client_id):
    db = mongo_connection.get_db()
    client, is_owner = get_accessible_client(db, user, client_id)
    if not is_owner:
        raise PermissionDenied("Only the client owner can delete this client.")

    # Cascade delete all companies owned by this client
    companies = list(db.companies.find({"client_id": str(client["_id"]), "is_deleted": False}))
    
    for company in companies:
        # Soft delete the company
        db.companies.update_one(
            {"_id": company["_id"]},
            {"$set": {"is_deleted": True, "deleted_at": now(), "status": "inactive"}},
        )
        log_activity(user, "company_deleted", "company", company["_id"])
        
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

    db.clients.update_one(
        {"_id": client["_id"]},
        {"$set": {"is_deleted": True, "deleted_at": now(), "status": "inactive"}},
    )
    log_activity(user, "client_deleted", "client", client["_id"])
