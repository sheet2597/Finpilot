"""Feature engineering and preprocessing for all ML models.
Merged from feature_engineering.py and preprocessing.py.

Contains:
- Data preprocessing helpers (encoders, scalers, constants)
- Feature building functions for each ML model
"""
from collections import defaultdict
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder, StandardScaler

from apps.mongo import connection as mongo_connection


# ---------------------------------------------------------------------------
# Preprocessing helpers (from preprocessing.py)
# ---------------------------------------------------------------------------

MIN_ROWS_CLASSIFIER = 15
MIN_ROWS_CLUSTERING = 4
MIN_ROWS_REGRESSION = 4


class InsufficientDataError(Exception):
    """Raised when there isn't enough historical data to train a reliable model.
    New accounts will see this until they add enough transaction history."""

    def __init__(self, message, rows_available=0, rows_required=0):
        super().__init__(message)
        self.rows_available = rows_available
        self.rows_required = rows_required


def require_min_rows(n, minimum, what):
    if n < minimum:
        raise InsufficientDataError(
            f"Not enough {what} to train a reliable model yet "
            f"({n} available, {minimum} needed). Add more transaction history and try again.",
            rows_available=n, rows_required=minimum,
        )


def build_text_vectorizer():
    return TfidfVectorizer(max_features=200, ngram_range=(1, 2), min_df=1)


def build_label_encoder():
    return LabelEncoder()


def build_scaler():
    return StandardScaler()


# ---------------------------------------------------------------------------
# Date parsing helper
# ---------------------------------------------------------------------------

def parse_txn_date(date_str):
    """Parses a transaction date string to a datetime object.
    Returns None if the string cannot be parsed."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
        try:
            return datetime.strptime(date_str[:len(fmt)], fmt)
        except (ValueError, TypeError):
            continue
    try:
        return datetime.fromisoformat(str(date_str)[:19])
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Module 1 - Expense Categorization features
# ---------------------------------------------------------------------------

def build_categorization_dataset(user, company_id=None):
    """Builds a training DataFrame from all categorized expense transactions.
    Returns (df, meta) where meta contains the categories map."""
    db = mongo_connection.get_db()
    categories = {str(c["_id"]): c["name"] for c in db.transaction_categories.find()}

    from apps.ml.services import resolve_company_scope
    company_ids, _ = resolve_company_scope(user, company_id)
    
    txns = list(db.transactions.find({
        "company_id": {"$in": company_ids},
        "type": "expense",
        "status": {"$ne": "deleted"},
        "category_id": {"$ne": None},
    }).sort("date", -1).limit(2000))

    rows = []
    for t in txns:
        cat_name = categories.get(str(t.get("category_id", "")))
        if not cat_name:
            continue
        text = " ".join(filter(None, [t.get("description", ""), t.get("notes", "")]))
        rows.append({
            "text": text.lower().strip() or "no description",
            "amount": float(t.get("amount", 0) or 0),
            "payment_method": t.get("payment_method", "other") or "other",
            "label": cat_name,
        })

    return pd.DataFrame(rows), {"categories": categories}


def build_categorization_inference_rows(user, transaction_ids=None, company_id=None):
    """Builds inference rows for uncategorized or selected transactions."""
    db = mongo_connection.get_db()
    from apps.ml.services import resolve_company_scope
    company_ids, _ = resolve_company_scope(user, company_id)
    
    query = {"company_id": {"$in": company_ids}, "type": "expense", "status": {"$ne": "deleted"}}
    if transaction_ids:
        from apps.mongo.utils import to_object_id
        oids = [to_object_id(tid, "transaction_id") for tid in transaction_ids]
        query["_id"] = {"$in": oids}
    else:
        query["category_id"] = None

    txns = list(db.transactions.find(query).sort("date", -1).limit(2000))
    rows = []
    for t in txns:
        text = " ".join(filter(None, [t.get("description", ""), t.get("notes", "")]))
        rows.append({
            "transaction_id": str(t["_id"]),
            "text": text.lower().strip() or "no description",
            "amount": float(t.get("amount", 0) or 0),
            "payment_method": t.get("payment_method", "other") or "other",
        })
    return rows


# ---------------------------------------------------------------------------
# Module 2 - Fraud/Anomaly Detection features
# ---------------------------------------------------------------------------

def build_fraud_features(user, company_id=None):
    """Builds a DataFrame of fraud detection features for all expense transactions."""
    from apps.ml.services import resolve_company_scope
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    if not company_ids:
        return pd.DataFrame()

    docs = list(db.transactions.find(
        {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}, "type": {"$in": ["income", "expense"]}},
    ).sort("date", -1).limit(2000))
    if not docs:
        return pd.DataFrame()

    vendor_counts = defaultdict(int)
    for d in docs:
        if d.get("vendor_id"):
            vendor_counts[d["vendor_id"]] += 1

    amounts = [float(d.get("amount", 0) or 0) for d in docs]
    mean_amt = float(np.mean(amounts)) if amounts else 0.0
    std_amt = float(np.std(amounts)) or 1.0

    sig_counts = defaultdict(int)
    for d in docs:
        sig = (d.get("date"), float(d.get("amount", 0) or 0), d.get("type"))
        sig_counts[sig] += 1

    payment_methods = sorted({d.get("payment_method", "other") for d in docs})
    pm_index = {pm: i for i, pm in enumerate(payment_methods)}

    rows = []
    for d in docs:
        amt = float(d.get("amount", 0) or 0)
        sig = (d.get("date"), amt, d.get("type"))
        vendor_freq = vendor_counts.get(d.get("vendor_id"), 0)
        rows.append({
            "transaction_id": str(d["_id"]),
            "amount": amt,
            "amount_zscore": (amt - mean_amt) / std_amt,
            "is_duplicate_signature": 1 if sig_counts[sig] > 1 else 0,
            "vendor_frequency": vendor_freq,
            "is_new_vendor": 1 if vendor_freq <= 1 else 0,
            "payment_method_code": pm_index.get(d.get("payment_method", "other"), 0),
            "has_reference": 1 if d.get("reference_number") else 0,
            "day_of_month": (parse_txn_date(d.get("date")) or datetime(2000, 1, 15)).day,
            "type": d.get("type"),
            "vendor_id": str(d.get("vendor_id")) if d.get("vendor_id") else None,
            "customer_id": str(d.get("customer_id")) if d.get("customer_id") else None,
            "payment_method": d.get("payment_method"),
            "description": d.get("description", ""),
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Module 3 - Compliance Risk features
# ---------------------------------------------------------------------------

def build_compliance_features(user, company_ids):
    """One row per company: heuristic compliance signals."""
    db = mongo_connection.get_db()
    rows = []
    for cid in company_ids:
        txns = list(db.transactions.find({"company_id": cid, "status": {"$ne": "deleted"}}).sort("date", -1).limit(2000))
        total = len(txns)
        missing_gst = sum(1 for t in txns if t.get("type") in ("income", "expense") and not t.get("gst_amount"))
        missing_tds = sum(1 for t in txns if t.get("type") in ("expense", "salary") and not t.get("tds_amount"))
        docs_count = db.documents.count_documents({"company_id": cid, "status": {"$ne": "deleted"}})
        required_categories = {"invoice", "bank_statement", "gst", "tds"}
        present_categories = set(db.documents.distinct("category", {"company_id": cid, "status": {"$ne": "deleted"}}))
        missing_doc_categories = len(required_categories - present_categories)
        sig_counts = defaultdict(int)
        for t in txns:
            sig_counts[(t.get("date"), float(t.get("amount", 0) or 0), t.get("type"))] += 1
        duplicate_count = sum(1 for c in sig_counts.values() if c > 1)
        pending_count = sum(1 for t in txns if t.get("status") == "pending")
        rows.append({
            "company_id": str(cid),
            "total_transactions": total,
            "missing_gst_ratio": missing_gst / total if total else 0.0,
            "missing_tds_ratio": missing_tds / total if total else 0.0,
            "missing_doc_categories": missing_doc_categories,
            "documents_count": docs_count,
            "duplicate_invoice_count": duplicate_count,
            "pending_ratio": pending_count / total if total else 0.0,
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Modules 4 & 5 - Time Series features for forecasting
# ---------------------------------------------------------------------------

def build_monthly_series(user, company_ids, field="amount", txn_type=None, months_back=18):
    """Builds a monthly time series of transaction totals."""
    db = mongo_connection.get_db()
    match = {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}}
    if txn_type:
        match["type"] = {"$in": txn_type} if isinstance(txn_type, list) else txn_type
    totals = defaultdict(lambda: [0.0, 0])
    for doc in db.transactions.find(match, {"date": 1, field: 1}):
        date_str = doc.get("date")
        if not date_str or len(date_str) < 7:
            continue
        key = date_str[:7]
        totals[key][0] += float(doc.get(field, 0) or 0)
        totals[key][1] += 1
    series = []
    for key in sorted(totals):
        year, month = int(key[:4]), int(key[5:7])
        series.append({"year": year, "month": month, "total": totals[key][0], "count": totals[key][1]})
    return series[-months_back:] if months_back else series


def build_tax_liability_series(user, company_ids, months_back=18):
    """Monthly GST + TDS liability trend."""
    db = mongo_connection.get_db()
    match = {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}}
    totals = defaultdict(float)
    for doc in db.transactions.find(match, {"date": 1, "gst_amount": 1, "tds_amount": 1}):
        date_str = doc.get("date")
        if not date_str or len(date_str) < 7:
            continue
        key = date_str[:7]
        totals[key] += float(doc.get("gst_amount", 0) or 0) + float(doc.get("tds_amount", 0) or 0)
    series = []
    for key in sorted(totals):
        year, month = int(key[:4]), int(key[5:7])
        series.append({"year": year, "month": month, "total": totals[key]})
    return series[-months_back:] if months_back else series


def build_party_features(user, company_ids, party_type="vendor"):
    """Vendor/customer clustering features."""
    db = mongo_connection.get_db()
    field = "vendor_id" if party_type == "vendor" else "customer_id"
    collection = db.vendors if party_type == "vendor" else db.customers
    parties = list(collection.find({"owner_id": str(user.id), "is_deleted": False}))
    if not parties:
        return pd.DataFrame()
    agg = list(db.transactions.aggregate([
        {"$match": {"company_id": {"$in": company_ids}, field: {"$ne": None}, "status": {"$ne": "deleted"}}},
        {"$group": {
            "_id": f"${field}",
            "total_spend": {"$sum": "$amount"},
            "txn_count": {"$sum": 1},
            "gst_txns": {"$sum": {"$cond": [{"$gt": ["$gst_amount", 0]}, 1, 0]}},
            "last_date": {"$max": "$date"},
        }},
    ]))
    agg_by_id = {a["_id"]: a for a in agg}
    now_ts = datetime.utcnow()
    rows = []
    for p in parties:
        a = agg_by_id.get(p["_id"])
        total_spend = float(a["total_spend"]) if a else 0.0
        txn_count = int(a["txn_count"]) if a else 0
        gst_txns = int(a["gst_txns"]) if a else 0
        last_date_raw = a["last_date"] if a else None
        last_date = parse_txn_date(last_date_raw)
        days_since_last = (now_ts - last_date).days if last_date else 999
        rows.append({
            "party_id": str(p["_id"]),
            "name": p["name"],
            "total_spend": total_spend,
            "txn_count": txn_count,
            "gst_activity_ratio": gst_txns / txn_count if txn_count else 0.0,
            "days_since_last_txn": days_since_last,
            "has_gst_number": 1 if p.get("gst_number") else 0,
        })
    return pd.DataFrame(rows)
