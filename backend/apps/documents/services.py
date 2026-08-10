import hashlib
import mimetypes
import os
import uuid

from django.conf import settings
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.companies.services import get_accessible_company
from apps.mongo import connection as mongo_connection
from apps.mongo.utils import get_or_404, log_activity, now, paginate, serialize, to_object_id

DOCUMENT_UPLOAD_DIR = "documents"

# Extension -> allowed mime types (kept loose since browsers/OSes disagree on
# the exact mime string for office/csv files).
ALLOWED_EXTENSIONS = {
    ".pdf": {"application/pdf"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".png": {"image/png"},
    ".csv": {"text/csv", "application/vnd.ms-excel", "text/plain"},
    ".xls": {"application/vnd.ms-excel"},
    ".xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"},
}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_UPLOAD_SIZE_BYTES = getattr(settings, "DOCUMENT_MAX_UPLOAD_SIZE_MB", 25) * 1024 * 1024

CATEGORY_LABELS = {
    "invoice": "Invoice",
    "bank_statement": "Bank Statement",
    "gst": "GST",
    "tds": "TDS",
    "income_tax": "Income Tax",
    "receipt": "Receipt",
    "excel": "Excel",
    "other": "Other",
}


# ---------------------------------------------------------------------------
# Access helpers
# ---------------------------------------------------------------------------

def get_user_company_ids(user):
    """All company ObjectIds this user may see documents for: companies they
    own, plus (for CAs) companies assigned to any of their clients.
    """
    db = mongo_connection.get_db()
    from apps.accounts.roles import UserRole
    role = UserRole.get_role_for_user(user)
    if role == UserRole.ADMIN:
        return [c["_id"] for c in db.companies.find({"is_deleted": False}, {"_id": 1})]

    # 1. Fetch companies directly owned by the user
    owned = [c["_id"] for c in db.companies.find({"owner_id": str(user.id), "is_deleted": False}, {"_id": 1})]

    # 2. Fetch companies owned by clients that this CA manages
    client_ids = [c["_id"] for c in db.clients.find({"owner_id": str(user.id), "is_deleted": False}, {"_id": 1})]
    if client_ids:
        client_companies = [c["_id"] for c in db.companies.find({"client_id": {"$in": [str(cid) for cid in client_ids]}, "is_deleted": False}, {"_id": 1})]
        owned = list({*owned, *client_companies})

    return owned


def _validate_extension(filename, file_obj):
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            {"file": f"Unsupported file type '{ext or 'unknown'}'. Allowed: PDF, JPG, JPEG, PNG, CSV, XLS, XLSX."}
        )
    
    # Magic byte validation
    header = file_obj.read(8)
    file_obj.seek(0)
    
    if ext == ".pdf" and not header.startswith(b"%PDF"):
        raise ValidationError({"file": "Invalid PDF file."})
    elif ext in {".jpg", ".jpeg"} and not header.startswith(b"\xFF\xD8\xFF"):
        raise ValidationError({"file": "Invalid JPEG file."})
    elif ext == ".png" and not header.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValidationError({"file": "Invalid PNG file."})
    elif ext == ".xlsx" and not header.startswith(b"PK\x03\x04"):
        raise ValidationError({"file": "Invalid XLSX file."})
    elif ext == ".xls" and not header.startswith(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"):
        raise ValidationError({"file": "Invalid XLS file."})
    elif ext == ".csv":
        # CSV shouldn't contain null bytes
        chunk = file_obj.read(1024)
        file_obj.seek(0)
        if b"\x00" in chunk:
            raise ValidationError({"file": "Invalid CSV file. Contains binary data."})

    return ext


def _checksum(file_obj):
    sha256 = hashlib.sha256()
    for chunk in file_obj.chunks():
        sha256.update(chunk)
    file_obj.seek(0)
    return sha256.hexdigest()


def _save_file(file_obj, company_id, ext):
    rel_dir = os.path.join(DOCUMENT_UPLOAD_DIR, str(company_id))
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    abs_path = os.path.join(abs_dir, stored_name)
    with open(abs_path, "wb") as dest:
        for chunk in file_obj.chunks():
            dest.write(chunk)
    return abs_path, f"{settings.MEDIA_URL}{rel_dir}/{stored_name}".replace("\\", "/")


def _try_ocr(abs_path, ext):
    """Best-effort OCR for images. Returns extracted text or None.

    Silently no-ops (returns None) if Tesseract / pytesseract isn't
    installed on the host, per spec: "If OCR is unavailable, continue
    normally." Scanned-PDF OCR is intentionally out of scope here since it
    needs a Poppler/pdf2image dependency on top of Tesseract; this can be
    added later without touching the upload API.
    """
    if ext not in IMAGE_EXTENSIONS:
        return None
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return None
    try:
        text = pytesseract.image_to_string(Image.open(abs_path))
        return text.strip() or None
    except Exception:
        return None


def _log_document_activity(user, document_id, action, metadata=None):
    db = mongo_connection.get_db()
    db.document_activity.insert_one({
        "document_id": document_id,
        "user_id": str(user.id),
        "user_name": getattr(user, "full_name", ""),
        "action": action,
        "metadata": metadata or {},
        "created_at": now(),
    })
    # Also feed the workspace-wide activity feed used elsewhere in the app.
    log_activity(user, f"document_{action}", "document", document_id, metadata)


def get_accessible_document(db, user, document_id):
    """Returns (document_doc, company_doc, is_owner). Raises 404/403."""
    oid = to_object_id(document_id, field="document_id")
    document = get_or_404(db.documents, {"_id": oid, "status": {"$ne": "deleted"}}, "Document not found.")
    company, is_owner = get_accessible_company(db, user, str(document["company_id"]))
    return document, company, is_owner


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def get_dashboard_summary(user, company_id=None):
    db = mongo_connection.get_db()
    if company_id:
        from apps.mongo.utils import to_object_id
        company_ids = [to_object_id(company_id)]
    else:
        company_ids = get_user_company_ids(user)
    base_query = {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}}

    total_documents = db.documents.count_documents(base_query)

    def count_category(category):
        return db.documents.count_documents({**base_query, "category": category})

    storage_agg = list(db.documents.aggregate([
        {"$match": base_query},
        {"$group": {"_id": None, "total_size": {"$sum": "$size_bytes"}}},
    ]))
    storage_used_bytes = storage_agg[0]["total_size"] if storage_agg else 0

    recent_uploads = list(
        db.documents.find(base_query).sort("created_at", -1).limit(5)
    )

    return {
        "total_documents": total_documents,
        "total_invoices": count_category("invoice"),
        "total_bank_statements": count_category("bank_statement"),
        "total_gst_documents": count_category("gst"),
        "storage_used_bytes": storage_used_bytes,
        "recent_uploads": serialize(recent_uploads),
    }


# ---------------------------------------------------------------------------
# List / detail
# ---------------------------------------------------------------------------

def list_documents(user, params):
    db = mongo_connection.get_db()
    company_ids = get_user_company_ids(user)

    company_filter = params.get("company_id")
    if company_filter:
        company, _ = get_accessible_company(db, user, company_filter)
        query = {"company_id": company["_id"]}
    else:
        query = {"company_id": {"$in": company_ids}}

    status_filter = params.get("status") or "active"
    if status_filter != "all":
        query["status"] = status_filter
    else:
        query["status"] = {"$ne": "deleted"}

    category = params.get("category")
    if category:
        query["category"] = category

    search = params.get("search")
    if search:
        query["$or"] = [
            {"filename": {"$regex": search, "$options": "i"}},
            {"original_filename": {"$regex": search, "$options": "i"}},
        ]

    sort_field = params.get("sort_by", "created_at")
    sort_dir = -1 if params.get("sort_dir", "desc") == "desc" else 1
    allowed_sort_fields = {"filename", "created_at", "size_bytes", "category", "status"}
    if sort_field not in allowed_sort_fields:
        sort_field = "created_at"

    result = paginate(
        db.documents, query,
        page=params.get("page", 1), page_size=params.get("page_size", 10),
        sort_field=sort_field, sort_dir=sort_dir,
    )

    company_lookup = {str(c["_id"]): c["name"] for c in db.companies.find({"_id": {"$in": company_ids}}, {"name": 1})}
    for item in result["items"]:
        item["company_name"] = company_lookup.get(item["company_id"], "Unknown company")
        item["category_label"] = CATEGORY_LABELS.get(item["category"], item["category"])
    return result


def get_document_detail(user, document_id):
    db = mongo_connection.get_db()
    document, company, is_owner = get_accessible_document(db, user, document_id)

    versions = list(db.document_versions.find({"document_id": document["_id"]}).sort("version", -1))
    activity = list(db.document_activity.find({"document_id": document["_id"]}).sort("created_at", -1).limit(20))

    result = serialize(document)
    result["is_owner"] = is_owner
    result["company_name"] = company["name"]
    result["category_label"] = CATEGORY_LABELS.get(document["category"], document["category"])
    result["versions"] = serialize(versions)
    result["activity"] = serialize(activity)
    return result


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

def upload_documents(user, company_id, category, files):
    if not files:
        raise ValidationError({"file": "No file was provided."})

    db = mongo_connection.get_db()
    company, is_owner = get_accessible_company(db, user, company_id)

    results = []
    for file_obj in files:
        ext = _validate_extension(file_obj.name, file_obj)

        if file_obj.size > MAX_UPLOAD_SIZE_BYTES:
            results.append({
                "filename": file_obj.name, "success": False,
                "error": f"File exceeds the {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB limit.",
            })
            continue

        checksum = _checksum(file_obj)
        duplicate = db.documents.find_one({
            "company_id": company["_id"], "checksum": checksum, "status": {"$ne": "deleted"},
        })
        if duplicate:
            results.append({
                "filename": file_obj.name, "success": False, "duplicate": True,
                "error": "An identical file already exists for this company.",
                "existing_document_id": str(duplicate["_id"]),
            })
            continue

        abs_path, url = _save_file(file_obj, company["_id"], ext)
        mime_type = mimetypes.guess_type(file_obj.name)[0] or "application/octet-stream"
        ocr_text = _try_ocr(abs_path, ext)

        doc = {
            "filename": file_obj.name,
            "original_filename": file_obj.name,
            "company_id": company["_id"],
            "category": category,
            "mime_type": mime_type,
            "extension": ext,
            "size_bytes": file_obj.size,
            "storage_url": url,
            "checksum": checksum,
            "ocr_text": ocr_text,
            "status": "active",
            "version": 1,
            "uploaded_by": str(user.id),
            "uploaded_by_name": getattr(user, "full_name", ""),
            "created_at": now(),
            "updated_at": now(),
        }
        inserted = db.documents.insert_one(doc)
        doc["_id"] = inserted.inserted_id

        db.document_versions.insert_one({
            "document_id": inserted.inserted_id, "version": 1, "storage_url": url,
            "size_bytes": file_obj.size, "uploaded_by": str(user.id), "created_at": now(),
        })
        _log_document_activity(user, inserted.inserted_id, "uploaded", {"filename": file_obj.name})

        result = serialize(doc)
        result["success"] = True
        results.append(result)

    return results


# ---------------------------------------------------------------------------
# Mutations
# ---------------------------------------------------------------------------

def update_document(user, document_id, data):
    db = mongo_connection.get_db()
    document, company, is_owner = get_accessible_document(db, user, document_id)
    if not is_owner:
        raise PermissionDenied("Only the company owner can edit this document.")

    update_fields = {**data, "updated_at": now()}
    db.documents.update_one({"_id": document["_id"]}, {"$set": update_fields})
    updated = db.documents.find_one({"_id": document["_id"]})
    _log_document_activity(user, document["_id"], "renamed" if "filename" in data else "updated", data)
    return serialize(updated)


def archive_document(user, document_id):
    db = mongo_connection.get_db()
    document, company, is_owner = get_accessible_document(db, user, document_id)
    if not is_owner:
        raise PermissionDenied("Only the company owner can archive this document.")

    db.documents.update_one({"_id": document["_id"]}, {"$set": {"status": "archived", "updated_at": now()}})
    _log_document_activity(user, document["_id"], "archived")
    return serialize(db.documents.find_one({"_id": document["_id"]}))


def restore_document(user, document_id):
    db = mongo_connection.get_db()
    document, company, is_owner = get_accessible_document(db, user, document_id)
    if not is_owner:
        raise PermissionDenied("Only the company owner can restore this document.")

    db.documents.update_one({"_id": document["_id"]}, {"$set": {"status": "active", "updated_at": now()}})
    _log_document_activity(user, document["_id"], "restored")
    return serialize(db.documents.find_one({"_id": document["_id"]}))


def delete_document(user, document_id):
    db = mongo_connection.get_db()
    document, company, is_owner = get_accessible_document(db, user, document_id)
    if not is_owner:
        raise PermissionDenied("Only the company owner can delete this document.")

    db.documents.update_one(
        {"_id": document["_id"]}, {"$set": {"status": "deleted", "deleted_at": now(), "updated_at": now()}}
    )
    _log_document_activity(user, document["_id"], "deleted")


def get_document_for_download(user, document_id):
    """Returns (document_doc, absolute_file_path) after verifying access."""
    db = mongo_connection.get_db()
    document, company, is_owner = get_accessible_document(db, user, document_id)

    rel_path = document["storage_url"].replace(settings.MEDIA_URL, "", 1)
    abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
    if not os.path.exists(abs_path):
        from rest_framework.exceptions import NotFound
        raise NotFound("The file for this document could not be found on the server.")

    _log_document_activity(user, document["_id"], "downloaded")
    return document, abs_path
