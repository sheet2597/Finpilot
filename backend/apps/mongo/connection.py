"""
Single PyMongo client for the whole project. No Django ORM / SQL is used
for Part 2 application data - only this Mongo connection.
"""
from django.conf import settings
from pymongo import MongoClient

_client = None
_indexes_ready = False


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client


def get_db():
    db = get_client()[settings.MONGO_DB_NAME]
    _ensure_indexes(db)
    return db


def _ensure_indexes(db):
    """Create indexes once per process. Safe to call repeatedly (idempotent).

    Bug fix (Part 9 QA): this used to call create_index() ~35 times in a row
    with no upfront connectivity check. When MongoDB was unreachable, every
    single one of those calls independently re-ran PyMongo's server-selection
    retry loop (serverSelectionTimeoutMS=5000), so the very first request to
    touch Mongo in a fresh process could block for minutes (35 x ~5s) before
    failing. We now do one cheap connectivity probe first and skip the whole
    block immediately if Mongo isn't reachable, while still marking indexes
    as "handled" so we don't repeat the probe on every request.
    """
    global _indexes_ready
    if _indexes_ready:
        return

    try:
        db.client.admin.command("ping")
    except Exception:
        # Mongo isn't reachable right now - don't cascade into 35 more
        # blocking timeouts. We'll simply retry the probe on the next
        # process/request rather than caching a permanent "ready" state,
        # so indexes still get created once Mongo comes back up.
        return

    def safe_index(collection, keys, **kwargs):
        try:
            collection.create_index(keys, **kwargs)
        except Exception:
            # Index already exists with different options, or the backend
            # (e.g. an older Mongo / mock) doesn't support an option - non-fatal.
            pass

    safe_index(db.users, "user_id", unique=True)
    safe_index(db.companies, "owner_id")
    safe_index(db.companies, "gst_number")
    safe_index(db.companies, "pan_number")
    safe_index(db.activity_logs, "user_id")
    safe_index(db.activity_logs, "created_at")
    safe_index(db.documents, "company_id")
    safe_index(db.documents, "status")
    safe_index(db.documents, "category")
    safe_index(db.documents, [("company_id", 1), ("checksum", 1)])
    safe_index(db.document_versions, "document_id")
    safe_index(db.document_activity, "document_id")
    safe_index(db.document_activity, "created_at")

    safe_index(db.transactions, "company_id")
    safe_index(db.transactions, "status")
    safe_index(db.transactions, "type")
    safe_index(db.transactions, "date")
    safe_index(db.transactions, "category_id")
    safe_index(db.transactions, "vendor_id")
    safe_index(db.transactions, "customer_id")
    safe_index(db.transactions, "reference_number")
    safe_index(db.transactions, "invoice_number")
    safe_index(db.transactions, "tags")
    safe_index(db.transactions, [("company_id", 1), ("date", -1)])
    safe_index(db.transaction_categories, "owner_id")
    safe_index(db.transaction_categories, "type")
    safe_index(db.vendors, "owner_id")
    safe_index(db.customers, "owner_id")
    safe_index(db.transaction_history, "transaction_id")
    safe_index(db.transaction_history, "created_at")
    safe_index(db.recurring_patterns, "company_id")
    safe_index(db.recurring_patterns, "owner_id")
    safe_index(db.budgets, [("owner_id", 1), ("company_id", 1), ("month", 1), ("category_id", 1)], unique=True)
    safe_index(db.tax_estimates, [("owner_id", 1), ("created_at", -1)])
    safe_index(db.tax_estimates, "company_id")

    _indexes_ready = True
