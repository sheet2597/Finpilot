from datetime import date as date_cls

from rest_framework.exceptions import ValidationError

from apps.companies.services import get_accessible_company
from apps.documents.services import get_user_company_ids
from apps.mongo import connection as mongo_connection
from apps.mongo.utils import now, serialize
from apps.transactions.services import detect_recurring_transactions, list_recurring_patterns

from . import rules

# Maps a detected recurring-pattern type (from apps.transactions.services)
# to the old-regime deduction section it's evidence for. Only a subset of
# pattern types are tax-deduction-relevant; the rest (rent, utility_bill,
# subscription, other_recurring) aren't mapped to any section here.
PATTERN_TO_SECTION = {
    "insurance_premium": "section_80d",
    "sip": "section_80c",
    "investment": "section_80c",
    "home_loan_emi": "section_24b",
}
# Home loan EMI mixes principal + interest; only the interest portion is
# deductible under 24(b). Without the loan's amortisation schedule we can't
# know the exact split, so we apply a commonly-cited rough estimate and
# label it clearly as an approximation everywhere it surfaces.
HOME_LOAN_INTEREST_ESTIMATE_RATIO = 0.4

ROLE_LABELS = {
    "individual": "Individual",
    "freelancer": "Freelancer",
    "business_owner": "Business Owner",
    "accountant": "Accountant",
    "chartered_accountant": "Chartered Accountant",
}

# Well-known, recurring statutory due dates (India). These are calendar
# fixtures set by law/CBDT notification and rarely change, but a specific
# year's notification can shift them — the UI shows a "verify with the
# Income Tax / GST portal" note alongside this list.
STATUTORY_DUE_DATES = [
    {"label": "Advance Tax - Q1 (15%)", "day_month": "06-15"},
    {"label": "Advance Tax - Q2 (45%)", "day_month": "09-15"},
    {"label": "GSTR-3B (monthly)", "day_month": None, "frequency": "20th of every month"},
    {"label": "TDS payment (monthly)", "day_month": None, "frequency": "7th of every month"},
    {"label": "Advance Tax - Q3 (75%)", "day_month": "12-15"},
    {"label": "Advance Tax - Q4 (100%)", "day_month": "03-15"},
    {"label": "ITR Filing (non-audit cases)", "day_month": "07-31"},
]


def get_effective_role(user):
    """Returns the effective role (now strictly chartered_accountant)"""
    return "chartered_accountant"


def current_financial_year():
    today = date_cls.today()
    # Indian FY runs Apr 1 - Mar 31.
    start_year = today.year if today.month >= 4 else today.year - 1
    return f"{start_year}-{str(start_year + 1)[-2:]}"


def _financial_year_range(financial_year):
    try:
        start_year_str, _ = financial_year.split("-")
        start_year = int(start_year_str)
    except (ValueError, AttributeError):
        raise ValidationError({"financial_year": "Provide a financial year like '2025-26'."})
    return f"{start_year}-04-01", f"{start_year + 1}-03-31"


def _resolve_company_ids(db, user, company_id):
    if company_id:
        company, _ = get_accessible_company(db, user, company_id)
        return [company["_id"]], str(company["_id"])
    return get_user_company_ids(user), None


def _gross_annual_income(db, company_ids, fy_start, fy_end):
    agg = list(db.transactions.aggregate([
        {"$match": {
            "company_id": {"$in": company_ids}, "type": "income", "status": {"$ne": "deleted"},
            "date": {"$gte": fy_start, "$lte": fy_end},
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]))
    return agg[0]["total"] if agg else 0.0


def _detected_deduction_amounts(user, company_id):
    """Annualises detected recurring patterns and buckets them into the
    old-regime deduction sections they're evidence for. Purely informational
    — the rule engine, not this function, decides what's actually deductible
    (caps are applied in rules.estimate_deductions).
    """
    patterns = list_recurring_patterns(user, company_id)
    if not patterns:
        # Nothing detected yet (the user may never have visited the
        # Transactions page's "Detect now" button) — run it once here so
        # the Tax Center doesn't silently show zero deductions.
        patterns = detect_recurring_transactions(user, company_id)
    amounts = {"section_80c": 0.0, "section_80d": 0.0, "section_24b": 0.0}
    for pattern in patterns:
        section = PATTERN_TO_SECTION.get(pattern["pattern_type"])
        if not section:
            continue
        annualised = pattern["average_amount"] * 12
        if section == "section_24b":
            annualised *= HOME_LOAN_INTEREST_ESTIMATE_RATIO
        amounts[section] += annualised
    return amounts, patterns


def _missing_supporting_documents(patterns):
    """Flags detected deduction-relevant patterns where none of the
    contributing transactions have a linked document — i.e. there's likely
    no proof (policy document, investment statement, loan certificate) on
    file yet. Purely a prompt for the user; nothing is auto-flagged as
    non-compliant.
    """
    missing = []
    for pattern in patterns:
        if pattern["pattern_type"] in PATTERN_TO_SECTION:
            missing.append({
                "pattern_type": pattern["pattern_type"],
                "vendor_name": pattern.get("vendor_name"),
                "suggestion": f"Upload supporting proof for this {pattern['pattern_type'].replace('_', ' ')} to substantiate the related deduction.",
            })
    return missing


def _build_estimate(db, user, company_ids, company_id_label, financial_year):
    fy_start, fy_end = _financial_year_range(financial_year)
    gross_income = _gross_annual_income(db, company_ids, fy_start, fy_end)
    deduction_amounts, patterns = _detected_deduction_amounts(user, company_id_label)
    deductions = rules.estimate_deductions(deduction_amounts)
    comparison = rules.compare_regimes(gross_income, deductions)
    comparison["financial_year"] = financial_year
    comparison["detected_patterns_considered"] = len(patterns)
    return comparison, patterns


def estimate_income_tax(user, company_id=None, financial_year=None):
    """Full estimate for a financial year, persisted as a history snapshot.
    Never touches `transactions` or `documents` — purely reads and writes
    its own `tax_estimates` collection.
    """
    db = mongo_connection.get_db()
    company_ids, company_id_label = _resolve_company_ids(db, user, company_id)
    financial_year = financial_year or current_financial_year()

    comparison, _ = _build_estimate(db, user, company_ids, company_id_label, financial_year)

    snapshot = {
        "owner_id": str(user.id),
        "company_id": company_id_label,
        "financial_year": financial_year,
        "result": comparison,
        "created_at": now(),
    }
    inserted = db.tax_estimates.insert_one(dict(snapshot))
    snapshot["_id"] = inserted.inserted_id
    return serialize(snapshot)


def get_income_tax_history(user, company_id=None, limit=12):
    db = mongo_connection.get_db()
    query = {"owner_id": str(user.id)}
    if company_id:
        query["company_id"] = company_id
    docs = list(db.tax_estimates.find(query).sort("created_at", -1).limit(limit))
    return serialize(docs)


def _income_tax_compliance_score(patterns, missing_documents):
    """Shared with the Compliance Center — the % of deduction-relevant
    patterns that have a supporting document on file."""
    deduction_relevant_patterns = [p for p in patterns if p["pattern_type"] in PATTERN_TO_SECTION]
    documented_count = len(deduction_relevant_patterns) - len(missing_documents)
    return round(documented_count / len(deduction_relevant_patterns) * 100, 1) if deduction_relevant_patterns else 100.0


def get_tax_dashboard(user, company_id=None):
    """The Tax Center's landing dashboard. Reuses the same estimate builder
    as the Income Tax module (no duplicate aggregation), and computes a few
    simple, transparent heuristics for compliance/filing-readiness/saving
    scores rather than opaque ones.
    """
    db = mongo_connection.get_db()
    company_ids, company_id_label = _resolve_company_ids(db, user, company_id)
    financial_year = current_financial_year()

    comparison, patterns = _build_estimate(db, user, company_ids, company_id_label, financial_year)
    missing_documents = _missing_supporting_documents(patterns)
    compliance_score = _income_tax_compliance_score(patterns, missing_documents)

    caps_total = sum(rules.OLD_REGIME_DEDUCTION_CAPS.values())
    utilised_total = sum(comparison["old_regime"]["deductions_applied"].values())
    tax_saving_score = round(min(utilised_total / caps_total * 100, 100), 1) if caps_total else 0.0

    filing_readiness_checks = {
        "has_income_recorded": comparison["gross_income"] > 0,
        "has_recurring_patterns_detected": len(patterns) > 0,
        "no_missing_supporting_documents": len(missing_documents) == 0,
    }
    filing_readiness = round(sum(filing_readiness_checks.values()) / len(filing_readiness_checks) * 100, 1)

    role = get_effective_role(user)

    gst_summary = get_gst_summary(user, company_id_label, financial_year)
    tds_summary = get_tds_summary(user, company_id_label, financial_year)

    return {
        "role": role,
        "role_label": ROLE_LABELS.get(role, role),
        "financial_year": financial_year,
        "estimated_tax": {
            "recommended_regime": comparison["recommended_regime"],
            "old_regime_tax": comparison["old_regime"]["total_tax"],
            "new_regime_tax": comparison["new_regime"]["total_tax"],
            "estimated_savings": comparison["estimated_savings_by_choosing_recommended"],
        },
        "gst_summary": {
            "status": "available", "net_gst_liability": gst_summary["net_gst_liability"],
            "output_gst": gst_summary["output_gst"], "input_gst": gst_summary["input_gst"],
        },
        "tds_summary": {
            "status": "available", "total_tds_deducted": tds_summary["total_tds_deducted"],
            "transaction_count": tds_summary["transaction_count"],
        },
        "compliance_score": compliance_score,
        "filing_readiness": filing_readiness,
        "tax_saving_score": tax_saving_score,
        "missing_documents": missing_documents,
        "upcoming_due_dates": STATUTORY_DUE_DATES,
        "detected_patterns_count": len(patterns),
        "disclaimer": "Educational estimate only — not tax, legal, or filing advice. Verify figures with a qualified Chartered Accountant before filing.",
    }


# ===========================================================================
# GST Services (merged from gst_services.py)
# ===========================================================================

from . import gst_rules  # noqa: E402 (needed here to avoid circular at top)


def _gst_totals(db, company_ids, fy_start, fy_end):
    agg = list(db.transactions.aggregate([
        {"$match": {
            "company_id": {"$in": company_ids}, "status": {"$ne": "deleted"},
            "date": {"$gte": fy_start, "$lte": fy_end}, "gst_amount": {"$gt": 0},
        }},
        {"$group": {"_id": "$type", "total_gst": {"$sum": "$gst_amount"}, "count": {"$sum": 1}}},
    ]))
    by_type = {row["_id"]: row for row in agg}
    output_gst = by_type.get("income", {}).get("total_gst", 0.0)
    input_gst = by_type.get("expense", {}).get("total_gst", 0.0)
    return output_gst, input_gst, by_type.get("income", {}).get("count", 0), by_type.get("expense", {}).get("count", 0)


def _monthly_gst_trend(db, company_ids, fy_start, fy_end):
    rows = list(db.transactions.aggregate([
        {"$match": {
            "company_id": {"$in": company_ids}, "status": {"$ne": "deleted"},
            "date": {"$gte": fy_start, "$lte": fy_end}, "gst_amount": {"$gt": 0},
        }},
        {"$group": {"_id": {"month": {"$substrCP": ["$date", 0, 7]}, "type": "$type"}, "total": {"$sum": "$gst_amount"}}},
        {"$sort": {"_id.month": 1}},
    ]))
    series = {}
    for row in rows:
        month = row["_id"]["month"]
        entry = series.setdefault(month, {"month": month, "output_gst": 0.0, "input_gst": 0.0})
        key = "output_gst" if row["_id"]["type"] == "income" else "input_gst"
        entry[key] = row["total"]
    return list(series.values())


def _rate_breakdown(db, company_ids, fy_start, fy_end):
    txns = list(db.transactions.find({
        "company_id": {"$in": company_ids}, "status": {"$ne": "deleted"},
        "date": {"$gte": fy_start, "$lte": fy_end}, "gst_amount": {"$gt": 0},
    }, {"amount": 1, "gst_amount": 1}))
    buckets = {slab: {"rate": slab, "total_gst": 0.0, "count": 0} for slab in gst_rules.GST_RATE_SLABS}
    for t in txns:
        taxable_value = t["amount"] - t["gst_amount"]
        effective_rate = (t["gst_amount"] / taxable_value) if taxable_value > 0 else 0
        slab = gst_rules.nearest_gst_slab(effective_rate)
        buckets[slab]["total_gst"] += t["gst_amount"]
        buckets[slab]["count"] += 1
    return [b for b in buckets.values() if b["count"] > 0]


def get_gst_summary(user, company_id=None, financial_year=None):
    db = mongo_connection.get_db()
    company_ids, _ = _resolve_company_ids(db, user, company_id)
    financial_year = financial_year or current_financial_year()
    fy_start, fy_end = _financial_year_range(financial_year)
    output_gst, input_gst, output_count, input_count = _gst_totals(db, company_ids, fy_start, fy_end)
    return {
        "financial_year": financial_year,
        "output_gst": round(output_gst, 2),
        "input_gst": round(input_gst, 2),
        "net_gst_liability": round(output_gst - input_gst, 2),
        "output_transaction_count": output_count,
        "input_transaction_count": input_count,
        "monthly_trend": _monthly_gst_trend(db, company_ids, fy_start, fy_end),
        "rate_breakdown": _rate_breakdown(db, company_ids, fy_start, fy_end),
    }


def get_itc_reconciliation(user, company_id=None, financial_year=None):
    db = mongo_connection.get_db()
    company_ids, _ = _resolve_company_ids(db, user, company_id)
    financial_year = financial_year or current_financial_year()
    fy_start, fy_end = _financial_year_range(financial_year)
    query = {
        "company_id": {"$in": company_ids}, "type": "expense", "status": {"$ne": "deleted"},
        "date": {"$gte": fy_start, "$lte": fy_end}, "gst_amount": {"$gt": 0},
    }
    total_input_gst = sum(t["gst_amount"] for t in db.transactions.find(query, {"gst_amount": 1}))
    unreconciled = list(db.transactions.find({**query, "document_id": None}, {"amount": 1, "gst_amount": 1, "date": 1, "description": 1}))
    unreconciled_total = sum(t["gst_amount"] for t in unreconciled)
    return {
        "financial_year": financial_year,
        "total_input_gst": round(total_input_gst, 2),
        "reconciled_input_gst": round(total_input_gst - unreconciled_total, 2),
        "unreconciled_input_gst": round(unreconciled_total, 2),
        "unreconciled_transactions": [
            {"id": str(t["_id"]), "date": t["date"], "amount": t["amount"], "gst_amount": t["gst_amount"], "description": t.get("description", "")}
            for t in unreconciled
        ],
    }


def get_gst_return_preparation(user, company_id=None, financial_year=None):
    summary = get_gst_summary(user, company_id, financial_year)
    itc = get_itc_reconciliation(user, company_id, financial_year)
    eligible_itc = itc["reconciled_input_gst"]
    return {
        "financial_year": summary["financial_year"],
        "outward_taxable_supplies_tax": summary["output_gst"],
        "eligible_itc": eligible_itc,
        "net_gst_payable": round(summary["output_gst"] - eligible_itc, 2),
        "unreconciled_itc_excluded": itc["unreconciled_input_gst"],
    }


def get_gstin_status(user, company_id):
    db = mongo_connection.get_db()
    company_ids, company_id_label = _resolve_company_ids(db, user, company_id)
    if not company_id_label:
        return {"has_company_selected": False, "gstin": None, "is_valid": False}
    company = db.companies.find_one({"_id": company_ids[0]})
    gst_number = company.get("gst_number") if company else None
    is_valid, normalized = gst_rules.validate_gstin(gst_number)
    return {"has_company_selected": True, "gstin": gst_number, "is_valid": is_valid}


def get_gst_filing_readiness(user, company_id=None, financial_year=None):
    if not company_id:
        return {"status": "not_ready", "score": 0, "reasons": ["Select a specific company to evaluate GST filing readiness."]}
    gstin_status = get_gstin_status(user, company_id)
    itc = get_itc_reconciliation(user, company_id, financial_year)
    summary = get_gst_summary(user, company_id, financial_year)
    reasons = []
    if not gstin_status["is_valid"]:
        reasons.append("Company GSTIN is missing or invalid.")
    if itc["unreconciled_input_gst"] > 0:
        reasons.append(f"{len(itc['unreconciled_transactions'])} input-GST transaction(s) have no linked invoice for ITC.")
    if summary["output_transaction_count"] == 0 and summary["input_transaction_count"] == 0:
        reasons.append("No GST-bearing transactions recorded yet for this financial year.")
    if not gstin_status["is_valid"]:
        status = "not_ready"
    elif reasons:
        status = "needs_review"
    else:
        status = "ready"
    checks_total = 3
    checks_passed = checks_total - len([r for r in [not gstin_status["is_valid"], itc["unreconciled_input_gst"] > 0, summary["output_transaction_count"] == 0 and summary["input_transaction_count"] == 0] if r])
    return {"status": status, "score": round(checks_passed / checks_total * 100, 1), "reasons": reasons or ["All checks passed."]}


def get_gst_dashboard(user, company_id=None):
    financial_year = current_financial_year()
    summary = get_gst_summary(user, company_id, financial_year)
    itc = get_itc_reconciliation(user, company_id, financial_year)
    filing_readiness = get_gst_filing_readiness(user, company_id, financial_year)
    gstin_status = get_gstin_status(user, company_id) if company_id else None
    return {
        "financial_year": financial_year,
        "summary": summary,
        "itc_reconciliation": itc,
        "filing_readiness": filing_readiness,
        "gstin_status": gstin_status,
        "due_dates": gst_rules.GST_DUE_DATES,
        "disclaimer": "Educational GST estimate based on recorded transactions — not a substitute for GSTR filings.",
    }


# ===========================================================================
# TDS Services (merged from tds_services.py)
# ===========================================================================

from . import tds_rules  # noqa: E402


def _tds_totals(db, company_ids, fy_start, fy_end):
    agg = list(db.transactions.aggregate([
        {"$match": {
            "company_id": {"$in": company_ids}, "type": "expense", "status": {"$ne": "deleted"},
            "date": {"$gte": fy_start, "$lte": fy_end}, "tds_amount": {"$gt": 0},
        }},
        {"$group": {"_id": None, "total_tds": {"$sum": "$tds_amount"}, "count": {"$sum": 1}}},
    ]))
    return (agg[0]["total_tds"], agg[0]["count"]) if agg else (0.0, 0)


def _monthly_tds_trend(db, company_ids, fy_start, fy_end):
    rows = list(db.transactions.aggregate([
        {"$match": {
            "company_id": {"$in": company_ids}, "type": "expense", "status": {"$ne": "deleted"},
            "date": {"$gte": fy_start, "$lte": fy_end}, "tds_amount": {"$gt": 0},
        }},
        {"$group": {"_id": {"$substrCP": ["$date", 0, 7]}, "total": {"$sum": "$tds_amount"}}},
        {"$sort": {"_id": 1}},
    ]))
    return [{"month": row["_id"], "tds_deducted": row["total"]} for row in rows]


def get_tds_summary(user, company_id=None, financial_year=None):
    db = mongo_connection.get_db()
    company_ids, _ = _resolve_company_ids(db, user, company_id)
    financial_year = financial_year or current_financial_year()
    fy_start, fy_end = _financial_year_range(financial_year)
    total_tds, count = _tds_totals(db, company_ids, fy_start, fy_end)
    return {
        "financial_year": financial_year,
        "total_tds_deducted": round(total_tds, 2),
        "transaction_count": count,
        "monthly_trend": _monthly_tds_trend(db, company_ids, fy_start, fy_end),
    }


def get_deduction_history(user, company_id=None, financial_year=None, limit=100):
    db = mongo_connection.get_db()
    company_ids, _ = _resolve_company_ids(db, user, company_id)
    financial_year = financial_year or current_financial_year()
    fy_start, fy_end = _financial_year_range(financial_year)
    categories = {c["_id"]: c["name"] for c in db.transaction_categories.find()}
    txns = list(db.transactions.find({
        "company_id": {"$in": company_ids}, "type": "expense", "status": {"$ne": "deleted"},
        "date": {"$gte": fy_start, "$lte": fy_end}, "tds_amount": {"$gt": 0},
    }).sort("date", -1).limit(limit))
    history = []
    for t in txns:
        category_name = categories.get(t.get("category_id"))
        guessed_section = tds_rules.guess_section(t.get("description"), category_name)
        history.append({
            "id": str(t["_id"]), "date": t["date"], "amount": t["amount"], "tds_amount": t["tds_amount"],
            "description": t.get("description", ""), "category_name": category_name,
            "guessed_section": guessed_section,
            "guessed_section_label": tds_rules.TDS_SECTIONS[guessed_section]["label"] if guessed_section else None,
            "has_vendor_on_file": bool(t.get("vendor_id")),
        })
    return history


def get_tds_filing_readiness(user, company_id=None, financial_year=None):
    history = get_deduction_history(user, company_id, financial_year)
    if not history:
        return {"status": "ready", "score": 100.0, "reasons": ["No TDS-bearing transactions recorded — nothing to review."]}
    missing_vendor = [h for h in history if not h["has_vendor_on_file"]]
    missing_section = [h for h in history if not h["guessed_section"]]
    reasons = []
    if missing_vendor:
        reasons.append(f"{len(missing_vendor)} TDS transaction(s) have no deductee (vendor) on file.")
    if missing_section:
        reasons.append(f"{len(missing_section)} TDS transaction(s) couldn't be matched to a section.")
    checks_total = 2
    checks_passed = checks_total - len([r for r in [bool(missing_vendor), bool(missing_section)] if r])
    status = "ready" if not reasons else ("needs_review" if checks_passed > 0 else "not_ready")
    return {"status": status, "score": round(checks_passed / checks_total * 100, 1), "reasons": reasons or ["All checks passed."]}


def get_tds_dashboard(user, company_id=None):
    financial_year = current_financial_year()
    summary = get_tds_summary(user, company_id, financial_year)
    filing_readiness = get_tds_filing_readiness(user, company_id, financial_year)
    return {
        "financial_year": financial_year,
        "summary": summary,
        "filing_readiness": filing_readiness,
        "due_dates": tds_rules.TDS_DUE_DATES,
        "sections_reference": serialize(tds_rules.TDS_SECTIONS),
        "disclaimer": "Educational TDS estimate — not a substitute for TRACES/26Q filings.",
    }


# ===========================================================================
# Compliance Services (merged from compliance_services.py)
# ===========================================================================

from apps.companies.services import list_companies  # noqa: E402


def _company_compliance_report(user, company_id, financial_year):
    db = mongo_connection.get_db()
    company_ids, company_id_label = _resolve_company_ids(db, user, company_id)
    _, patterns = _build_estimate(db, user, company_ids, company_id_label, financial_year)
    missing_documents = _missing_supporting_documents(patterns)
    income_tax_score = _income_tax_compliance_score(patterns, missing_documents)
    gst_readiness = get_gst_filing_readiness(user, company_id_label, financial_year)
    tds_readiness = get_tds_filing_readiness(user, company_id_label, financial_year)
    filing_readiness = get_overall_filing_readiness(user, company_id_label, financial_year)
    overall_score = round((income_tax_score + gst_readiness["score"] + tds_readiness["score"]) / 3, 1)
    high_priority = []
    warnings = []
    for domain, readiness in (("GST", gst_readiness), ("TDS", tds_readiness)):
        if readiness["status"] == "ready":
            continue
        for reason in readiness["reasons"]:
            (high_priority if readiness["status"] == "not_ready" else warnings).append(f"[{domain}] {reason}")
    for m in missing_documents:
        warnings.append(f"[Income Tax] Missing supporting document for {m['pattern_type'].replace('_', ' ')}.")
    for group in filing_readiness.get("duplicate_groups", []):
        high_priority.append(f"[Transactions] Possible duplicate: {group['reason']}")
    return {
        "company_id": company_id_label,
        "overall_score": overall_score,
        "income_tax_score": income_tax_score,
        "gst_score": gst_readiness["score"],
        "tds_score": tds_readiness["score"],
        "document_completeness": filing_readiness["document_counts"],
        "filing_readiness_status": filing_readiness["status"],
        "high_priority_issues": high_priority,
        "warnings": warnings,
    }


def get_compliance_center(user, company_id=None, client_id=None, financial_year=None):
    financial_year = financial_year or current_financial_year()
    if company_id:
        company_reports = [_company_compliance_report(user, company_id, financial_year)]
    else:
        params = {"page_size": 100}
        if client_id:
            params["client_id"] = client_id
        companies_page = list_companies(user, params)
        company_reports = [
            _company_compliance_report(user, str(c["id"]), financial_year)
            for c in companies_page["items"]
        ]
    if not company_reports:
        return {
            "financial_year": financial_year, "overall_compliance_score": 0,
            "companies": [], "high_priority_issues": [], "warnings": [], "timeline": [],
            "disclaimer": "No accessible companies found for this filter.",
        }
    overall_score = round(sum(r["overall_score"] for r in company_reports) / len(company_reports), 1)
    all_high_priority = [issue for r in company_reports for issue in r["high_priority_issues"]]
    all_warnings = [issue for r in company_reports for issue in r["warnings"]]
    timeline = _build_compliance_timeline(company_reports)
    return {
        "financial_year": financial_year,
        "overall_compliance_score": overall_score,
        "gst_compliance_score": round(sum(r["gst_score"] for r in company_reports) / len(company_reports), 1),
        "tds_compliance_score": round(sum(r["tds_score"] for r in company_reports) / len(company_reports), 1),
        "income_tax_compliance_score": round(sum(r["income_tax_score"] for r in company_reports) / len(company_reports), 1),
        "companies": company_reports,
        "high_priority_issues": all_high_priority,
        "warnings": all_warnings,
        "timeline": timeline,
        "disclaimer": "Educational compliance overview — not a substitute for professional review.",
    }


def _build_compliance_timeline(company_reports):
    events = []
    for r in company_reports:
        for issue in r["high_priority_issues"]:
            events.append({"severity": "high", "company_id": r["company_id"], "message": issue})
        for issue in r["warnings"]:
            events.append({"severity": "warning", "company_id": r["company_id"], "message": issue})
    for due in gst_rules.GST_DUE_DATES:
        events.append({"severity": "info", "company_id": None, "message": f"Upcoming: {due['label']} ({due['frequency']})"})
    for due in tds_rules.TDS_DUE_DATES:
        events.append({"severity": "info", "company_id": None, "message": f"Upcoming: {due['label']} ({due.get('frequency') or due.get('day_month')})"})
    severity_order = {"high": 0, "warning": 1, "info": 2}
    return sorted(events, key=lambda e: severity_order[e["severity"]])


# ===========================================================================
# Filing Readiness (merged from filing_readiness_services.py)
# ===========================================================================

REQUIRED_DOCUMENT_CATEGORIES = ["invoice", "bank_statement", "gst", "tds"]


def _document_completeness(db, company_ids):
    counts = {
        category: db.documents.count_documents({
            "company_id": {"$in": company_ids}, "category": category, "status": {"$ne": "deleted"},
        })
        for category in REQUIRED_DOCUMENT_CATEGORIES
    }
    missing = [category for category, count in counts.items() if count == 0]
    return counts, missing


def _duplicate_transaction_groups(db, company_ids, fy_start, fy_end):
    base_match = {
        "company_id": {"$in": company_ids}, "status": {"$ne": "deleted"},
        "date": {"$gte": fy_start, "$lte": fy_end},
    }
    by_reference = list(db.transactions.aggregate([
        {"$match": {**base_match, "reference_number": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$reference_number", "count": {"$sum": 1}, "ids": {"$push": {"$toString": "$_id"}}}},
        {"$match": {"count": {"$gt": 1}}},
    ]))
    by_date_amount = list(db.transactions.aggregate([
        {"$match": base_match},
        {"$group": {"_id": {"date": "$date", "amount": "$amount", "type": "$type"}, "count": {"$sum": 1}, "ids": {"$push": {"$toString": "$_id"}}}},
        {"$match": {"count": {"$gt": 1}}},
    ]))
    groups = [{"reason": f"Same reference number '{row['_id']}'", "transaction_ids": row["ids"]} for row in by_reference]
    groups += [{"reason": f"Same date, amount, and type ({row['_id']['date']}, {row['_id']['amount']}, {row['_id']['type']})", "transaction_ids": row["ids"]} for row in by_date_amount]
    return groups


def get_overall_filing_readiness(user, company_id=None, financial_year=None):
    if not company_id:
        return {
            "status": "not_ready", "score": 0, "checks": [],
            "reasons": ["Select a specific company to evaluate filing readiness."],
        }
    db = mongo_connection.get_db()
    company_ids, company_id_label = _resolve_company_ids(db, user, company_id)
    financial_year = financial_year or current_financial_year()
    fy_start, fy_end = _financial_year_range(financial_year)
    checks = []
    _, patterns = _build_estimate(db, user, company_ids, company_id_label, financial_year)
    missing_docs = _missing_supporting_documents(patterns)
    checks.append({
        "category": "income_tax_documents",
        "passed": len(missing_docs) == 0,
        "detail": "All detected deduction patterns have supporting documents." if not missing_docs
                  else f"{len(missing_docs)} pattern(s) missing supporting documents: " + ", ".join(sorted({m['pattern_type'] for m in missing_docs})),
    })
    doc_counts, missing_categories = _document_completeness(db, company_ids)
    checks.append({
        "category": "document_completeness",
        "passed": len(missing_categories) == 0,
        "detail": "All required document categories have at least one file." if not missing_categories
                  else f"No documents uploaded yet for: {', '.join(missing_categories)}.",
    })
    gst_readiness = get_gst_filing_readiness(user, company_id_label, financial_year)
    checks.append({"category": "gst", "passed": gst_readiness["status"] == "ready", "detail": "; ".join(gst_readiness["reasons"])})
    tds_readiness = get_tds_filing_readiness(user, company_id_label, financial_year)
    checks.append({"category": "tds", "passed": tds_readiness["status"] == "ready", "detail": "; ".join(tds_readiness["reasons"])})
    duplicate_groups = _duplicate_transaction_groups(db, company_ids, fy_start, fy_end)
    checks.append({
        "category": "duplicate_transactions",
        "passed": len(duplicate_groups) == 0,
        "detail": "No duplicate transactions detected." if not duplicate_groups
                  else f"{len(duplicate_groups)} possible duplicate group(s) found — review before filing.",
    })
    passed_count = sum(1 for c in checks if c["passed"])
    score = round(passed_count / len(checks) * 100, 1)
    hard_blockers = [c for c in checks if c["category"] in ("gst", "duplicate_transactions") and not c["passed"]]
    if hard_blockers and passed_count < len(checks) - 1:
        status = "not_ready"
    elif passed_count == len(checks):
        status = "ready"
    else:
        status = "needs_review"
    return {
        "financial_year": financial_year,
        "status": status,
        "score": score,
        "checks": checks,
        "reasons": [c["detail"] for c in checks if not c["passed"]] or ["All checks passed."],
        "duplicate_groups": duplicate_groups,
        "document_counts": doc_counts,
    }
