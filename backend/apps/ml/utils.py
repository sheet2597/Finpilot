"""Shared helpers for the ML module: model file storage, the `ml_models`
registry collection (versioning/metrics bookkeeping), and small numeric
utilities used across feature engineering / explainability.

Design notes
------------
Models are trained **per requesting user** (i.e. per accountant / business
owner), scoped to the companies that user can access, exactly like every
other Part 6 dependency (`get_accessible_company`, `get_user_company_ids`).
This keeps company/client isolation identical to the rest of the app: a
model trained on one owner's data is never loaded for another owner.

Artifacts are saved with joblib under `MEDIA_ROOT/ml_models/<owner_id>/
<model_type>_v<version>.joblib`. Metadata (algorithm, version, metrics,
feature names, training row count, timestamps) lives in Mongo so the
dashboard/model-management endpoints don't need to touch the filesystem.
"""
from pathlib import Path

import joblib
from django.conf import settings

from apps.mongo import connection as mongo_connection
from apps.mongo.utils import now, serialize

MODEL_DIR = Path(settings.MEDIA_ROOT) / "ml_models"
DEMO_MODEL_DIR = Path(settings.MEDIA_ROOT) / "demo_models"

# Canonical model_type identifiers used throughout the module.
MODEL_EXPENSE_CATEGORIZATION = "expense_categorization"
MODEL_FRAUD_DETECTION = "fraud_detection"          # Duplicate Transaction Detection
MODEL_COMPLIANCE_RISK = "compliance_risk"
MODEL_TAX_LIABILITY = "tax_liability_forecast"
MODEL_EXPENSE_FORECAST = "expense_forecast"

ALL_MODEL_TYPES = [
    MODEL_EXPENSE_CATEGORIZATION,
    MODEL_FRAUD_DETECTION,
    MODEL_COMPLIANCE_RISK,
    MODEL_TAX_LIABILITY,
    MODEL_EXPENSE_FORECAST,
]

MODEL_ALGORITHMS = {
    MODEL_EXPENSE_CATEGORIZATION: "RandomForestClassifier",
    MODEL_FRAUD_DETECTION: "IsolationForest",
    MODEL_COMPLIANCE_RISK: "DecisionTreeClassifier",
    MODEL_TAX_LIABILITY: "LinearRegression",
    MODEL_EXPENSE_FORECAST: "LinearRegression",
}


def safe_div(a, b, default=0.0):
    try:
        if not b:
            return default
        return a / b
    except (TypeError, ZeroDivisionError):
        return default


def round2(value):
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return 0.0


def owner_model_dir(owner_id, is_demo=False):
    base = DEMO_MODEL_DIR if is_demo else MODEL_DIR
    path = base / str(owner_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_model_artifact(owner_id, model_type, bundle, is_demo=False):
    """Persist a joblib bundle (dict with model + any encoders) and return
    the absolute file path used."""
    filename = f"{model_type}_demo.joblib" if is_demo else f"{model_type}.joblib"
    path = owner_model_dir(owner_id, is_demo) / filename
    joblib.dump(bundle, path)
    return str(path)


import functools
import joblib

@functools.lru_cache(maxsize=16)
def load_model_artifact(path):
    return joblib.load(path)


def upsert_model_registry(owner_id, model_type, *, metrics, feature_names,
                           training_rows, file_path, extra=None, is_demo=False):
    """Create/replace the registry entry for a model type, bumping the
    version number. One active version per (owner, model_type) — older
    joblib files are overwritten on disk, but we keep the version counter
    and history log in Mongo for auditability."""
    db = mongo_connection.get_db()
    existing = db.ml_models.find_one({"owner_id": str(owner_id), "model_type": model_type, "is_demo_model": is_demo})
    version = (existing["version"] + 1) if existing else 1

    doc = {
        "owner_id": str(owner_id),
        "model_type": model_type,
        "is_demo_model": is_demo,
        "training_mode": "demo" if is_demo else "production",
        "algorithm": MODEL_ALGORITHMS.get(model_type, "Unknown"),
        "version": version,
        "metrics": metrics or {},
        "feature_names": feature_names or [],
        "training_rows": training_rows,
        "file_path": file_path,
        "status": "ready",
        "extra": extra or {},
        "trained_at": now(),
        "updated_at": now(),
    }
    db.ml_models.update_one(
        {"owner_id": str(owner_id), "model_type": model_type, "is_demo_model": is_demo},
        {"$set": doc, "$setOnInsert": {"created_at": now()}},
        upsert=True,
    )
    db.ml_model_history.insert_one({**doc, "created_at": now()})
    return serialize(db.ml_models.find_one({"owner_id": str(owner_id), "model_type": model_type, "is_demo_model": is_demo}))


def get_model_registry_entry(owner_id, model_type, is_demo=False):
    db = mongo_connection.get_db()
    return db.ml_models.find_one({"owner_id": str(owner_id), "model_type": model_type, "status": "ready", "is_demo_model": is_demo})


def list_model_registry(owner_id):
    db = mongo_connection.get_db()
    # List both production and demo
    entries_prod = {e["model_type"]: e for e in db.ml_models.find({"owner_id": str(owner_id), "is_demo_model": {"$ne": True}})}
    entries_demo = {e["model_type"]: e for e in db.ml_models.find({"owner_id": str(owner_id), "is_demo_model": True})}
    
    out = []
    for model_type in ALL_MODEL_TYPES:
        entry = entries_prod.get(model_type)
        demo_entry = entries_demo.get(model_type)
        
        # We can return production entry normally, and append demo data if it exists.
        # But wait, frontend expects list of models. To not break existing structure drastically,
        # we can attach demo metadata to the production entry or return them separately.
        # The user requested: "AIDashboardPage.jsx Display Production Ready, Demo Ready ... Current Model ... Demo Banner ... Production Banner"
        # We will embed demo info into the same model object for easy frontend consumption.
        base_obj = {
            "model_type": model_type,
            "algorithm": MODEL_ALGORITHMS.get(model_type),
            "status": "not_trained",
            "version": 0,
            "metrics": {},
            "training_rows": 0,
            "is_demo_model": False,
        }
        if entry:
            base_obj = serialize(entry)
        
        if demo_entry:
            base_obj["demo_model"] = serialize(demo_entry)
            
        out.append(base_obj)
    return out


def log_prediction(owner_id, model_type, subject_type, subject_id, result):
    """Append-only audit trail of predictions served, for the model
    management / explainability history views."""
    db = mongo_connection.get_db()
    db.ml_predictions.insert_one({
        "owner_id": str(owner_id),
        "model_type": model_type,
        "subject_type": subject_type,
        "subject_id": str(subject_id) if subject_id else None,
        "result": result,
        "created_at": now(),
    })
