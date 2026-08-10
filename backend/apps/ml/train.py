"""Model training. Every `train_*` function:
  1. Builds features via `feature_engineering.py`
  2. Fits a scikit-learn estimator (only sklearn/pandas/numpy — no LLMs,
     no deep learning, per the Part 6 brief)
  3. Wraps model + any encoders/vectorizers/scaler + feature_names into a
     single dict ("bundle") so predict-time preprocessing is identical
  4. Saves the bundle via joblib and records it in the `ml_models` registry

Returns a plain dict describing what was trained (algorithm, metrics,
rows used) — this is what the "Train Model" API responds with and what
PART6_AUDIT.md's accuracy table is generated from.
"""
from datetime import datetime

import numpy as np
import pandas as pd
from scipy.sparse import hstack, csr_matrix
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

from . import features as fe
from . import utils as ml_utils
from .features import (
    InsufficientDataError, MIN_ROWS_CLASSIFIER,  MIN_ROWS_REGRESSION,
    build_label_encoder, build_scaler, build_text_vectorizer, require_min_rows,
)


class InsufficientDataError(Exception):
    def __init__(self, message, rows_available=0, rows_required=0):
        super().__init__(message)
        self.rows_available = rows_available
        self.rows_required = rows_required

class InsufficientSamplesError(Exception):
    def __init__(self, message, rows_available=0, rows_required=0):
        super().__init__(message)
        self.rows_available = rows_available
        self.rows_required = rows_required

class InsufficientClassDiversityError(Exception):
    def __init__(self, message, unique_classes=0, class_distribution=None, rows_available=0, rows_required=0):
        super().__init__(message)
        self.unique_classes = unique_classes
        self.class_distribution = class_distribution or {}
        self.rows_available = rows_available
        self.rows_required = rows_required

def require_min_rows(rows_available, rows_required, context_msg):
    if rows_available < rows_required:
        raise InsufficientSamplesError(
            f"Not enough data: {rows_available} available, {rows_required} required for {context_msg}.",
            rows_available=rows_available,
            rows_required=rows_required
        )


# ---------------------------------------------------------------------------
# Module 1 — Expense categorization (Random Forest)
# ---------------------------------------------------------------------------

def train_expense_categorization(user, company_id=None):
    df, meta = fe.build_categorization_dataset(user, company_id=company_id)
    require_min_rows(len(df), MIN_ROWS_CLASSIFIER, "categorized expense transactions")
    if df["label"].nunique() < 2:
        raise InsufficientDataError(
            "Need expenses across at least 2 categories to train a classifier.",
            rows_available=len(df), rows_required=MIN_ROWS_CLASSIFIER,
        )

    vectorizer = build_text_vectorizer()
    text_matrix = vectorizer.fit_transform(df["text"])

    scaler = build_scaler()
    numeric = scaler.fit_transform(df[["amount"]])

    pm_encoder = build_label_encoder()
    pm_codes = pm_encoder.fit_transform(df["payment_method"]).reshape(-1, 1)

    X = hstack([text_matrix, csr_matrix(numeric), csr_matrix(pm_codes)]).tocsr()
    y = df["label"].values

    stratify = y if pd.Series(y).value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify,
    )

    model = RandomForestClassifier(n_estimators=200, max_depth=12, random_state=42, class_weight="balanced")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test) if len(y_test) else model.predict(X_train)
    y_true = y_test if len(y_test) else y_train
    metrics = {
        "accuracy": ml_utils.round2(accuracy_score(y_true, y_pred)),
        "f1_weighted": ml_utils.round2(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
        "classes": sorted(set(y)),
    }

    feature_names = (
        list(vectorizer.get_feature_names_out()) + ["amount", "payment_method"]
    )

    bundle = {
        "model": model, "vectorizer": vectorizer, "scaler": scaler,
        "payment_method_encoder": pm_encoder, "classes": list(model.classes_),
    }
    path = ml_utils.save_model_artifact(user.id, ml_utils.MODEL_EXPENSE_CATEGORIZATION, bundle)
    registry = ml_utils.upsert_model_registry(
        user.id, ml_utils.MODEL_EXPENSE_CATEGORIZATION,
        metrics=metrics, feature_names=feature_names[:50], training_rows=len(df), file_path=path,
    )
    return registry


# ---------------------------------------------------------------------------
# Module 2 — Fraud & anomaly detection (Isolation Forest)
# ---------------------------------------------------------------------------

FRAUD_FEATURE_COLUMNS = [
    "amount_zscore", "is_duplicate_signature", "vendor_frequency",
    "is_new_vendor", "payment_method_code", "has_reference", "day_of_month",
]


def train_fraud_detection(user, company_id=None):
    df = fe.build_fraud_features(user, company_id=company_id)
    require_min_rows(len(df), MIN_ROWS_CLASSIFIER, "transactions")

    X = df[FRAUD_FEATURE_COLUMNS].values
    contamination = min(max(0.02, 10 / len(df)), 0.15)
    model = IsolationForest(n_estimators=200, contamination=contamination, random_state=42)
    model.fit(X)

    scores = model.decision_function(X)
    preds = model.predict(X)
    flagged = int((preds == -1).sum())
    metrics = {
        "flagged_count": flagged,
        "flagged_ratio": ml_utils.round2(flagged / len(df)),
        "contamination_used": ml_utils.round2(contamination),
        "score_mean": ml_utils.round2(float(np.mean(scores))),
    }

    bundle = {"model": model, "feature_columns": FRAUD_FEATURE_COLUMNS}
    path = ml_utils.save_model_artifact(user.id, ml_utils.MODEL_FRAUD_DETECTION, bundle)
    registry = ml_utils.upsert_model_registry(
        user.id, ml_utils.MODEL_FRAUD_DETECTION,
        metrics=metrics, feature_names=FRAUD_FEATURE_COLUMNS, training_rows=len(df), file_path=path,
    )
    return registry


# ---------------------------------------------------------------------------
# Module 3 — Compliance risk (Decision Tree)
# ---------------------------------------------------------------------------

COMPLIANCE_FEATURE_COLUMNS = [
    "missing_gst_ratio", "missing_tds_ratio", "missing_doc_categories",
    "documents_count", "duplicate_invoice_count", "pending_ratio",
]


def _production_risk_label(row):
    """Real business rules representing genuine accounting/tax principles.
    If the data is completely uniform (e.g. all missing GST), this correctly
    produces a single class and fails validation."""
    if row["missing_gst_ratio"] > 0.5 or row["missing_tds_ratio"] > 0.5:
        return "FAIL"
    
    if row["duplicate_invoice_count"] > 1:
        return "FAIL"
        
    if row["duplicate_invoice_count"] == 1 or row["missing_doc_categories"] > 0:
        return "WARNING"
        
    if row["pending_ratio"] > 0.5:
        return "WARNING"
        
    return "PASS"


class DemoComplianceLabelEngine:
    """Deterministic, transparent, rule-based label generator for Demo Mode.
    Generates PASS, WARNING, FAIL using real transaction characteristics
    to guarantee class diversity for demonstration purposes."""
    
    @staticmethod
    def generate_label(row):
        # Large pending ratio -> WARNING
        if row["pending_ratio"] > 0.8:
            return "WARNING"
            
        # Severe missing documents -> FAIL
        if row["missing_doc_categories"] >= 3:
            return "FAIL"
            
        # Moderate missing documents or duplicates -> WARNING
        if row["missing_doc_categories"] == 2 or row["duplicate_invoice_count"] == 1:
            return "WARNING"
            
        # Heavy duplicates -> FAIL
        if row["duplicate_invoice_count"] > 1:
            return "FAIL"
            
        # Any missing GST -> FAIL
        if row["missing_gst_ratio"] > 0:
            return "FAIL"
            
        return "PASS"


def _monthly_compliance_snapshots(user, company_ids):
    """Real (not synthetic) historical snapshots: for every month that has
    transaction activity, recompute compliance features using only data up
    to that month-end. This gives the Decision Tree many genuine training
    rows even for accounts with just a handful of companies."""
    from apps.mongo import connection as mongo_connection
    from .features import parse_txn_date
    db = mongo_connection.get_db()
    rows = []
    for cid in company_ids:
        raw_dates = db.transactions.distinct("date", {"company_id": cid, "status": {"$ne": "deleted"}})
        parsed = [parse_txn_date(d) for d in raw_dates]
        month_keys = sorted({(d.year, d.month) for d in parsed if d is not None})
        if not month_keys:
            continue
        for (y, m) in month_keys:
            cutoff_dt = datetime(y, m, 28) + pd.Timedelta(days=4)
            cutoff_str = cutoff_dt.isoformat()  # `date` is stored as an ISO string — compare lexicographically
            txns = list(db.transactions.find({
                "company_id": cid, "status": {"$ne": "deleted"}, "date": {"$lte": cutoff_str},
            }))
            total = len(txns)
            if total < 3:
                continue
            missing_gst = sum(1 for t in txns if t.get("type") in ("income", "expense") and not t.get("gst_amount"))
            missing_tds = sum(1 for t in txns if t.get("type") in ("expense", "salary") and not t.get("tds_amount"))
            docs_count = db.documents.count_documents({"company_id": cid, "status": {"$ne": "deleted"}, "created_at": {"$lte": cutoff_dt}})
            required_categories = {"invoice", "bank_statement", "gst", "tds"}
            present_categories = set(db.documents.distinct("category", {"company_id": cid, "status": {"$ne": "deleted"}, "created_at": {"$lte": cutoff_dt}}))
            missing_doc_categories = len(required_categories - present_categories)
            sig_counts = {}
            for t in txns:
                sig = (t.get("date"), float(t.get("amount", 0) or 0), t.get("type"))
                sig_counts[sig] = sig_counts.get(sig, 0) + 1
            duplicate_count = sum(1 for c in sig_counts.values() if c > 1)
            pending_count = sum(1 for t in txns if t.get("status") == "pending")

            rows.append({
                "company_id": str(cid), "year": y, "month": m,
                "missing_gst_ratio": missing_gst / total,
                "missing_tds_ratio": missing_tds / total,
                "missing_doc_categories": missing_doc_categories,
                "documents_count": docs_count,
                "duplicate_invoice_count": duplicate_count,
                "pending_ratio": pending_count / total,
            })
    return pd.DataFrame(rows)


def train_compliance_risk(user, company_ids, is_demo=False):
    df = _monthly_compliance_snapshots(user, company_ids)
    require_min_rows(len(df), MIN_ROWS_CLASSIFIER, "monthly compliance snapshots")

    label_func = DemoComplianceLabelEngine.generate_label if is_demo else _production_risk_label
    df["label"] = df.apply(label_func, axis=1)
    
    if df["label"].nunique() < 2:
        class_dist = df["label"].value_counts().to_dict()
        raise InsufficientClassDiversityError(
            "Compliance history doesn't vary enough yet to train a risk classifier.",
            unique_classes=df["label"].nunique(),
            class_distribution=class_dist,
            rows_available=len(df), 
            rows_required=MIN_ROWS_CLASSIFIER,
        )

    X = df[COMPLIANCE_FEATURE_COLUMNS].values
    y = df["label"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

    model = DecisionTreeClassifier(max_depth=4, min_samples_leaf=2, random_state=42)
    
    import logging
    import time
    logger = logging.getLogger(__name__)
    t0 = time.time()
    
    logger.info(f"User: {user.email}")
    logger.info(f"Company: {company_ids}")
    logger.info(f"Training Mode: {'Demo' if is_demo else 'Production'}")
    logger.info(f"Training Samples: {len(df)}")
    logger.info(f"Unique Classes: {df['label'].nunique()}")
    logger.info(f"Class Distribution: {df['label'].value_counts().to_dict()}")
    logger.info(f"Feature Count: {len(COMPLIANCE_FEATURE_COLUMNS)}")
    logger.info("Validation Results: Minimum Samples PASSED, Minimum Classes PASSED")
    
    model.fit(X_train, y_train)
    
    t1 = time.time()
    
    y_pred = model.predict(X_test) if len(y_test) else model.predict(X_train)
    y_true = y_test if len(y_test) else y_train
    
    accuracy = accuracy_score(y_true, y_pred)
    logger.info(f"Training Duration: {ml_utils.round2(t1 - t0)}s")
    logger.info(f"Accuracy: {ml_utils.round2(accuracy)}")

    metrics = {
        "accuracy": ml_utils.round2(accuracy_score(y_true, y_pred)),
        "f1_weighted": ml_utils.round2(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
        "training_rows": len(df),
    }

    file_path = ml_utils.save_model_artifact(user.id, ml_utils.MODEL_COMPLIANCE_RISK, {
        "model": model,
        "feature_columns": COMPLIANCE_FEATURE_COLUMNS,
    }, is_demo=is_demo)
    
    logger.info(f"Saved Model: {file_path}")

    return ml_utils.upsert_model_registry(
        user.id,
        ml_utils.MODEL_COMPLIANCE_RISK,
        metrics=metrics,
        feature_names=COMPLIANCE_FEATURE_COLUMNS,
        training_rows=len(df),
        file_path=file_path,
        is_demo=is_demo,
    )


# ---------------------------------------------------------------------------
# Modules 4 & 5 — Linear regression forecasts (tax liability / expenses)
# ---------------------------------------------------------------------------

def _train_linear_series(user, model_type, series, label):
    require_min_rows(len(series), MIN_ROWS_REGRESSION, label)
    X = np.arange(len(series)).reshape(-1, 1)
    y = np.array([s["total"] for s in series])

    model = LinearRegression()
    model.fit(X, y)
    preds = model.predict(X)
    residual_std = float(np.std(y - preds)) if len(y) > 1 else 0.0
    r2 = ml_utils.round2(model.score(X, y)) if len(series) > 1 else 0.0

    metrics = {
        "r2_score": r2,
        "slope_per_month": ml_utils.round2(model.coef_[0]),
        "residual_std": ml_utils.round2(residual_std),
        "months_used": len(series),
    }
    bundle = {"model": model, "residual_std": residual_std, "series_len": len(series), "last_index": len(series) - 1,
              "last_year": series[-1]["year"], "last_month": series[-1]["month"]}
    path = ml_utils.save_model_artifact(user.id, model_type, bundle)
    registry = ml_utils.upsert_model_registry(
        user.id, model_type, metrics=metrics, feature_names=["month_index"],
        training_rows=len(series), file_path=path,
    )
    return registry


def train_tax_liability_forecast(user, company_ids):
    series = fe.build_tax_liability_series(user, company_ids)
    return _train_linear_series(user, ml_utils.MODEL_TAX_LIABILITY, series, "months of GST/TDS history")


def train_expense_forecast(user, company_ids):
    series = fe.build_monthly_series(user, company_ids, field="amount", txn_type="expense")
    return _train_linear_series(user, ml_utils.MODEL_EXPENSE_FORECAST, series, "months of expense history")


# ---------------------------------------------------------------------------
# Train all supported models
# ---------------------------------------------------------------------------

def train_all(user):
    from apps.documents.services import get_user_company_ids
    company_ids = get_user_company_ids(user)
    results = {}
    trainers = [
        (ml_utils.MODEL_EXPENSE_CATEGORIZATION, lambda: train_expense_categorization(user)),
        (ml_utils.MODEL_FRAUD_DETECTION, lambda: train_fraud_detection(user)),
        (ml_utils.MODEL_COMPLIANCE_RISK, lambda: train_compliance_risk(user, company_ids)),
        (ml_utils.MODEL_TAX_LIABILITY, lambda: train_tax_liability_forecast(user, company_ids)),
        (ml_utils.MODEL_EXPENSE_FORECAST, lambda: train_expense_forecast(user, company_ids)),
    ]
    for model_type, fn in trainers:
        try:
            results[model_type] = {"status": "trained", "registry": fn()}
        except InsufficientDataError as exc:
            results[model_type] = {
                "status": "skipped", "reason": str(exc),
                "rows_available": exc.rows_available, "rows_required": exc.rows_required,
            }
    return results
