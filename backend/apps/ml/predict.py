"""Prediction — loads the joblib bundle for a trained model and scores new
data. Includes explainability helpers that turn raw model outputs into
human-readable explanations for every prediction.
"""
import numpy as np
import pandas as pd
from scipy.sparse import hstack, csr_matrix
from sklearn.tree import _tree

from . import features as fe
from . import utils as ml_utils
from .train import COMPLIANCE_FEATURE_COLUMNS, FRAUD_FEATURE_COLUMNS


class ModelNotTrainedError(Exception):
    def __init__(self, model_type):
        super().__init__(
            f"No trained '{model_type}' model found yet. Train it first from the AI Dashboard."
        )
        self.model_type = model_type


def _load(owner_id, model_type):
    entry = ml_utils.get_model_registry_entry(owner_id, model_type, is_demo=False)
    if not entry:
        # Fallback to Demo model if production is missing
        entry = ml_utils.get_model_registry_entry(owner_id, model_type, is_demo=True)
    if not entry:
        raise ModelNotTrainedError(model_type)
    bundle = ml_utils.load_model_artifact(entry["file_path"])
    return bundle, entry


# ---------------------------------------------------------------------------
# Module 1 — Expense categorization
# ---------------------------------------------------------------------------

def predict_expense_categories(user, transaction_ids=None):
    bundle, entry = _load(user.id, ml_utils.MODEL_EXPENSE_CATEGORIZATION)
    rows = fe.build_categorization_inference_rows(user, transaction_ids=transaction_ids)
    if not rows:
        return []

    df = pd.DataFrame(rows)
    text_matrix = bundle["vectorizer"].transform(df["text"])
    numeric = bundle["scaler"].transform(df[["amount"]])

    pm_encoder = bundle["payment_method_encoder"]
    known = set(pm_encoder.classes_)
    pm_values = df["payment_method"].apply(lambda v: v if v in known else pm_encoder.classes_[0])
    pm_codes = pm_encoder.transform(pm_values).reshape(-1, 1)

    X = hstack([text_matrix, csr_matrix(numeric), csr_matrix(pm_codes)]).tocsr()
    model = bundle["model"]
    proba = model.predict_proba(X)
    classes = model.classes_

    results = []
    for i, row in df.iterrows():
        p = proba[i]
        top_idx = int(np.argmax(p))
        ranked = sorted(zip(classes, p), key=lambda t: -t[1])[:3]
        results.append({
            "transaction_id": row["transaction_id"],
            "predicted_category": classes[top_idx],
            "confidence": ml_utils.round2(p[top_idx]),
            "alternatives": [{"category": c, "confidence": ml_utils.round2(pr)} for c, pr in ranked[1:] if pr > 0.05],
            "text_signal": row["text"].strip(),
            "amount": row["amount"],
        })
    return results


# ---------------------------------------------------------------------------
# Module 2 — Fraud & anomaly detection
# ---------------------------------------------------------------------------

def predict_fraud_anomalies(user, company_id=None):
    bundle, entry = _load(user.id, ml_utils.MODEL_FRAUD_DETECTION)
    df = fe.build_fraud_features(user, company_id=company_id)
    if df.empty:
        return []

    X = df[FRAUD_FEATURE_COLUMNS].values
    model = bundle["model"]
    scores = model.decision_function(X)
    preds = model.predict(X)

    # Normalize decision_function scores (roughly -0.5..0.5) to a 0-100 risk scale.
    risk_scores = np.clip((0.5 - scores) * 100, 0, 100)

    results = []
    for i, row in df.iterrows():
        if preds[i] != -1:
            continue
        results.append({
            "transaction_id": row["transaction_id"],
            "risk_score": ml_utils.round2(risk_scores[i]),
            "risk_level": "High" if risk_scores[i] >= 70 else "Medium" if risk_scores[i] >= 45 else "Low",
            "amount": row["amount"],
            "vendor_id": row["vendor_id"],
            "description": row["description"],
            "signals": {
                "amount_zscore": ml_utils.round2(row["amount_zscore"]),
                "is_duplicate_signature": bool(row["is_duplicate_signature"]),
                "is_new_vendor": bool(row["is_new_vendor"]),
                "has_reference": bool(row["has_reference"]),
            },
        })
    results.sort(key=lambda r: -r["risk_score"])
    return results


# ---------------------------------------------------------------------------
# Module 3 — Compliance risk
# ---------------------------------------------------------------------------

def predict_compliance_risk(user, company_ids):
    bundle, entry = _load(user.id, ml_utils.MODEL_COMPLIANCE_RISK)
    df = fe.build_compliance_features(user, company_ids)
    if df.empty:
        return []

    X = df[COMPLIANCE_FEATURE_COLUMNS].values
    model = bundle["model"]
    preds = model.predict(X)
    proba = model.predict_proba(X)

    results = []
    for i, row in df.iterrows():
        p = proba[i]
        confidence = float(np.max(p))
        results.append({
            "company_id": str(row["company_id"]),
            "risk_level": str(preds[i]),
            "confidence": ml_utils.round2(confidence),
            "features": {col: ml_utils.round2(row[col]) for col in COMPLIANCE_FEATURE_COLUMNS},
        })
    return results


# ---------------------------------------------------------------------------
# Modules 4 & 5 — Forecasts
# ---------------------------------------------------------------------------

def _forecast_linear(user, model_type, periods_ahead=3):
    bundle, entry = _load(user.id, model_type)
    model = bundle["model"]
    last_index = bundle["last_index"]
    residual_std = bundle["residual_std"]
    year, month = bundle["last_year"], bundle["last_month"]

    future = []
    for step in range(1, periods_ahead + 1):
        idx = last_index + step
        pred = float(model.predict([[idx]])[0])
        pred = max(pred, 0.0)
        m = month + step
        y = year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        future.append({
            "year": y, "month": m,
            "predicted_total": ml_utils.round2(pred),
            "lower_bound": ml_utils.round2(max(pred - 1.96 * residual_std, 0)),
            "upper_bound": ml_utils.round2(pred + 1.96 * residual_std),
        })
    return future, entry


def predict_tax_liability(user, periods_ahead=3):
    return _forecast_linear(user, ml_utils.MODEL_TAX_LIABILITY, periods_ahead)


def predict_expense_forecast(user, periods_ahead=3):
    return _forecast_linear(user, ml_utils.MODEL_EXPENSE_FORECAST, periods_ahead)


# ---------------------------------------------------------------------------
# Explainability helpers
# ---------------------------------------------------------------------------

def top_feature_importances(model, feature_names, top_n=5):
    importances = getattr(model, "feature_importances_", None)
    if importances is None:
        return []
    order = np.argsort(importances)[::-1][:top_n]
    return [
        {"feature": feature_names[i] if i < len(feature_names) else f"feature_{i}",
         "importance": round(float(importances[i]), 3)}
        for i in order if importances[i] > 0
    ]


def explain_categorization(prediction):
    conf_pct = round(prediction["confidence"] * 100, 1)
    alt = prediction["alternatives"]
    alt_text = f" (also considered: {', '.join(a['category'] for a in alt)})" if alt else ""
    return (
        f"Classified as '{prediction['predicted_category']}' with {conf_pct}% confidence "
        f"based on the description/vendor text and the ₹{prediction['amount']:.2f} amount{alt_text}."
    )


def explain_fraud(anomaly):
    reasons = []
    s = anomaly["signals"]
    if abs(s["amount_zscore"]) >= 2:
        reasons.append("amount is a significant outlier versus typical transactions")
    if s["is_duplicate_signature"]:
        reasons.append("matches another transaction with the same date, amount and type")
    if s["is_new_vendor"]:
        reasons.append("vendor has little or no prior transaction history")
    if not s["has_reference"]:
        reasons.append("no reference/invoice number attached")
    if not reasons:
        reasons.append("unusual combination of amount, timing and vendor pattern")
    return f"Flagged as {anomaly['risk_level']} risk (score {anomaly['risk_score']}/100): " + "; ".join(reasons) + "."


def explain_compliance_risk(prediction, model, feature_names):
    contributions = top_feature_importances(model, feature_names, top_n=3)
    labels = {
        "missing_gst_ratio": "missing GST details on transactions",
        "missing_tds_ratio": "missing TDS details on transactions",
        "missing_doc_categories": "required document categories not uploaded",
        "documents_count": "overall document coverage",
        "duplicate_invoice_count": "duplicate invoices detected",
        "pending_ratio": "share of transactions still pending",
    }
    driver_text = ", ".join(labels.get(c["feature"], c["feature"]) for c in contributions) or "overall compliance history"
    return (
        f"Predicted {prediction['risk_level']} compliance risk ({round(prediction['confidence'] * 100, 1)}% confidence), "
        f"driven mainly by: {driver_text}."
    )


def explain_forecast(model_type, forecast_point, metrics):
    direction = "increasing" if metrics.get("slope_per_month", 0) > 0 else "decreasing" if metrics.get("slope_per_month", 0) < 0 else "stable"
    subject = "tax liability" if "tax" in model_type else "expenses"
    return (
        f"Projected {subject} for {forecast_point['year']}-{forecast_point['month']:02d} is "
        f"₹{forecast_point['predicted_total']:.2f} (range ₹{forecast_point['lower_bound']:.2f}–₹{forecast_point['upper_bound']:.2f}), "
        f"based on a linear trend that has been {direction} (R²={metrics.get('r2_score', 0)})."
    )


def decision_tree_rules_text(model, feature_names, class_names, max_rules=6):
    tree_ = model.tree_
    names = [feature_names[i] if i != _tree.TREE_UNDEFINED else "undefined" for i in tree_.feature]
    rules = []

    def recurse(node, conditions):
        if len(rules) >= max_rules:
            return
        if tree_.feature[node] != _tree.TREE_UNDEFINED:
            name = names[node]
            threshold = round(tree_.threshold[node], 3)
            recurse(tree_.children_left[node], conditions + [f"{name} <= {threshold}"])
            recurse(tree_.children_right[node], conditions + [f"{name} > {threshold}"])
        else:
            counts = tree_.value[node][0]
            predicted = class_names[int(np.argmax(counts))]
            rules.append(f"IF {' AND '.join(conditions)} THEN risk = {predicted}")

    recurse(0, [])
    return rules

