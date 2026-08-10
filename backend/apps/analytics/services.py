"""Analytics services — merged from analytics_services, dashboard_services,
kpi_services, report_services, and the old services module.
This single file handles: financial analytics, trend analysis, comparative
analytics, KPI computation, dashboard assembly, report building, global
search, and batch export.
"""
import csv
import io
import zipfile
from collections import defaultdict
from datetime import datetime, timedelta

from apps.ml.services import (
    _pdf_from_rows, _xlsx_from_rows, compute_financial_health_score,
    get_ml_dashboard, resolve_company_scope,
)
from apps.ml import predict as ml_prediction
from apps.ml.predict import ModelNotTrainedError
from apps.mongo import connection as mongo_connection
from apps.tax.services import current_financial_year
from apps.ml.features import InsufficientDataError
from apps.ml.utils import list_model_registry
from apps.mongo.utils import now, serialize
from apps.transactions.services import get_budget_summary, get_dashboard_summary


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def round2(value):
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return 0.0


def pct_change(current, previous):
    if not previous:
        return 100.0 if current else 0.0
    return round2((current - previous) / abs(previous) * 100)


def trend_indicator(pct):
    if pct > 1:
        return "up"
    if pct < -1:
        return "down"
    return "flat"


def kpi_point(name, current, previous, unit="currency"):
    change = pct_change(current, previous)
    return {
        "name": name,
        "current_value": round2(current),
        "previous_value": round2(previous),
        "percentage_change": change,
        "trend": trend_indicator(change),
        "unit": unit,
    }


def financial_year_range(financial_year=None):
    financial_year = financial_year or current_financial_year()
    start_year = int(financial_year.split("-")[0])
    start = datetime(start_year, 4, 1)
    end = datetime(start_year + 1, 3, 31, 23, 59, 59)
    return start, end


def month_bounds(dt=None):
    dt = dt or datetime.utcnow()
    start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        next_start = start.replace(year=start.year + 1, month=1)
    else:
        next_start = start.replace(month=start.month + 1)
    end = next_start - timedelta(seconds=1)
    return start, end


def previous_period(start, end):
    length = end - start
    prev_end = start - timedelta(seconds=1)
    prev_start = prev_end - length
    return prev_start, prev_end


def _csv_from_rows(headers, rows):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8")


def render_report(title, headers, rows, fmt, subtitle=None):
    if fmt == "csv":
        return _csv_from_rows(headers, rows), "text/csv", "csv"
    if fmt == "pdf":
        return _pdf_from_rows(title, headers, rows, subtitle=subtitle), "application/pdf", "pdf"
    return _xlsx_from_rows(title, headers, rows), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"


GRANULARITY_KEY_LEN = {"daily": 10, "weekly": 10, "monthly": 7, "quarterly": 7, "yearly": 4}


def _bucket_key(date_str, granularity):
    if granularity == "yearly":
        return date_str[:4]
    if granularity == "monthly":
        return date_str[:7]
    if granularity == "quarterly":
        year, month = int(date_str[:4]), int(date_str[5:7])
        q = (month - 1) // 3 + 1
        return f"{year}-Q{q}"
    if granularity == "weekly":
        dt = datetime.fromisoformat(date_str)
        iso_year, iso_week, _ = dt.isocalendar()
        return f"{iso_year}-W{iso_week:02d}"
    return date_str[:10]  # daily


def _recent_month_keys(n):
    keys = []
    dt = datetime.utcnow().replace(day=1)
    for _ in range(n):
        keys.append(dt.strftime("%Y-%m"))
        dt = (dt - timedelta(days=1)).replace(day=1)
    return list(reversed(keys))


# ---------------------------------------------------------------------------
# Financial Analytics
# ---------------------------------------------------------------------------

def period_analysis(user, company_id=None, granularity="monthly"):
    granularity = granularity if granularity in GRANULARITY_KEY_LEN else "monthly"
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    if not company_ids:
        return []

    substr_len = GRANULARITY_KEY_LEN[granularity]
    
    pipeline = [
        {"$match": {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}, "type": {"$in": ["income", "expense"]}}},
        {"$group": {
            "_id": {
                "period": {"$substrCP": ["$date", 0, substr_len]},
                "type": "$type"
            },
            "total": {"$sum": "$amount"}
        }}
    ]
    
    results = list(db.transactions.aggregate(pipeline))
    
    periods = set()
    income_map = defaultdict(float)
    expense_map = defaultdict(float)
    
    for r in results:
        period = r["_id"]["period"]
        if not period or len(period) < substr_len:
            continue
        periods.add(period)
        if r["_id"]["type"] == "income":
            income_map[period] += r["total"]
        else:
            expense_map[period] += r["total"]

    rows = [
        {"period": p, "income": round2(income_map[p]), "expense": round2(expense_map[p]), "net_profit": round2(income_map[p] - expense_map[p])}
        for p in sorted(periods)
    ]
    return rows


def category_analysis(user, company_id=None, txn_type="expense"):
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    if not company_ids:
        return []

    pipeline = [
        {"$match": {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}, "type": txn_type}},
        {"$group": {"_id": "$category_id", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    results = list(db.transactions.aggregate(pipeline))

    categories = {str(c["_id"]): c["name"] for c in db.transaction_categories.find()}
    
    grand_total = sum(r["total"] for r in results) or 1
    rows = []
    for r in results:
        cat_id = str(r["_id"] or "")
        rows.append({
            "category_id": cat_id,
            "category_name": categories.get(cat_id, "Uncategorized"),
            "total": round2(r["total"]),
            "count": r["count"],
            "share_percentage": round2(r["total"] / grand_total * 100),
        })

    return sorted(rows, key=lambda r: -r["total"])


def party_analysis(user, company_id=None, party_type="vendor"):
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    if not company_ids:
        return []

    txn_type = "expense" if party_type == "vendor" else "income"
    pipeline = [
        {"$match": {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}, "type": txn_type}},
        {"$group": {"_id": "$party_id", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    results = list(db.transactions.aggregate(pipeline))

    parties = {str(p["_id"]): p["name"] for p in db.parties.find({"type": party_type})}
    
    grand_total = sum(r["total"] for r in results) or 1
    rows = []
    for r in results:
        p_id = str(r["_id"] or "")
        name = parties.get(p_id, "Unknown " + party_type.capitalize()) if p_id else "Unknown " + party_type.capitalize()
        rows.append({
            "party_id": p_id,
            "name": name,
            "total": round2(r["total"]),
            "count": r["count"],
            "share_percentage": round2(r["total"] / grand_total * 100),
        })

    return sorted(rows, key=lambda r: -r["total"])


def cash_flow_analysis(user, company_id=None, summary=None):
    if not summary:
        summary = get_dashboard_summary(user, company_id)
    fi = summary["financial_intelligence"]
    return {
        "cash_flow_trend": fi["cash_flow_trend"],
        "savings_trend": fi["savings_trend"],
        "income_growth": fi["income_growth"],
        "expense_growth": fi["expense_growth"],
    }


def top_transactions(user, company_id=None, txn_type="expense", limit=10):
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    if not company_ids:
        return []

    docs = list(db.transactions.find(
        {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}, "type": txn_type},
        {"amount": 1, "description": 1, "date": 1, "category_id": 1},
    ).sort("amount", -1).limit(limit))
    return [
        {
            "id": str(d["_id"]), "amount": round2(d.get("amount", 0)),
            "description": d.get("description", ""), "date": d.get("date"),
            "category_id": str(d.get("category_id") or ""),
        }
        for d in docs
    ]


def loan_analysis(user, company_id=None):
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    if not company_ids:
        return {"total": 0.0, "count": 0, "transactions": []}

    categories = {str(c["_id"]): c["name"] for c in db.transaction_categories.find()}
    docs = list(db.transactions.find(
        {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}, "type": "expense"},
    ))
    loan_docs = [d for d in docs if "loan" in categories.get(str(d.get("category_id") or ""), "").lower() or "emi" in (d.get("description") or "").lower()]
    total = sum(float(d.get("amount", 0) or 0) for d in loan_docs)
    return {
        "total": round2(total), "count": len(loan_docs),
        "transactions": [{"id": str(d["_id"]), "amount": round2(d.get("amount", 0)), "date": d.get("date")} for d in loan_docs[:10]],
    }


def investment_analysis(user, company_id=None):
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    if not company_ids:
        return {"total": 0.0, "count": 0}

    categories = {str(c["_id"]): c["name"] for c in db.transaction_categories.find()}
    docs = list(db.transactions.find(
        {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}, "type": "expense"},
    ))
    inv_docs = [d for d in docs if "invest" in categories.get(str(d.get("category_id") or ""), "").lower() or "sip" in (d.get("description") or "").lower()]
    total = sum(float(d.get("amount", 0) or 0) for d in inv_docs)
    return {"total": round2(total), "count": len(inv_docs)}


def insurance_analysis(user, company_id=None):
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    if not company_ids:
        return {"total": 0.0, "count": 0}

    categories = {str(c["_id"]): c["name"] for c in db.transaction_categories.find()}
    docs = list(db.transactions.find(
        {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}, "type": "expense"},
    ))
    ins_docs = [d for d in docs if "insurance" in categories.get(str(d.get("category_id") or ""), "").lower() or "premium" in (d.get("description") or "").lower()]
    total = sum(float(d.get("amount", 0) or 0) for d in ins_docs)
    return {"total": round2(total), "count": len(ins_docs)}


def budget_analysis(user, company_id=None, month=None):
    if not company_id:
        return None
    month = month or datetime.utcnow().strftime("%Y-%m")
    try:
        return get_budget_summary(user, company_id, month)
    except Exception:
        return None


def get_trend(user, metric, granularity="monthly", company_id=None):
    granularity = granularity if granularity in GRANULARITY_KEY_LEN else "monthly"

    if metric in ("income", "expense"):
        db = mongo_connection.get_db()
        company_ids, _ = resolve_company_scope(user, company_id)
        if not company_ids:
            return []
        totals = defaultdict(float)
        for doc in db.transactions.find(
            {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}, "type": metric}, {"date": 1, "amount": 1},
        ):
            date_str = doc.get("date")
            if not date_str or len(date_str) < 10:
                continue
            totals[_bucket_key(date_str, granularity)] += float(doc.get("amount", 0) or 0)
        return [{"period": k, "value": round2(v)} for k, v in sorted(totals.items())]

    if metric == "cash_flow":
        analysis = cash_flow_analysis(user, company_id)
        return [{"period": p["month"], "value": p["cash_flow"]} for p in analysis["cash_flow_trend"]]

    if metric == "budget":
        if not company_id:
            return []
        months = _recent_month_keys(6)
        out = []
        for m in months:
            try:
                summary = get_budget_summary(user, company_id, m)
                out.append({"period": m, "value": summary.get("overall_progress_percentage", 0)})
            except Exception:
                continue
        return out

    if metric in ("tax", "gst"):
        from apps.tax.services import get_gst_summary
        fy = current_financial_year()
        summary = get_gst_summary(user, company_id, fy)
        return [{"period": p["month"], "value": round2(p.get("output_gst", 0) - p.get("input_gst", 0))} for p in summary.get("monthly_trend", [])]

    if metric == "tds":
        from apps.tax.services import get_tds_summary
        fy = current_financial_year()
        summary = get_tds_summary(user, company_id, fy)
        return [{"period": p["month"], "value": round2(p.get("tds_deducted", 0))} for p in summary.get("monthly_trend", [])]

    if metric == "compliance":
        from apps.tax.services import get_overall_filing_readiness
        readiness = get_overall_filing_readiness(user, company_id=company_id)
        return [{"period": "current", "value": readiness.get("score", 0)}]

    if metric == "financial_health":
        health = compute_financial_health_score(user, company_id)
        return [{"period": "current", "value": health["overall_score"]}]

    if metric == "ml_predictions":
        try:
            forecast, _entry = ml_prediction.predict_expense_forecast(user)
            return [{"period": f"{f['year']}-{f['month']:02d}", "value": f["predicted_total"]} for f in forecast]
        except Exception:
            return []

    return []


# ---------------------------------------------------------------------------
# Comparative Analytics
# ---------------------------------------------------------------------------

def compare_periods(user, company_id, period_a, period_b, granularity="monthly"):
    data = {row["period"]: row for row in period_analysis(user, company_id, granularity)}
    a = data.get(period_a, {"period": period_a, "income": 0, "expense": 0, "net_profit": 0})
    b = data.get(period_b, {"period": period_b, "income": 0, "expense": 0, "net_profit": 0})
    return {
        "period_a": a, "period_b": b,
        "income_change_pct": pct_change(a["income"], b["income"]),
        "expense_change_pct": pct_change(a["expense"], b["expense"]),
        "net_profit_change_pct": pct_change(a["net_profit"], b["net_profit"]),
    }


def compare_companies(user, company_ids):
    rows = []
    for cid in company_ids:
        summary = get_dashboard_summary(user, cid)
        rows.append({
            "company_id": cid,
            "total_income": round2(summary["total_income"]),
            "total_expenses": round2(summary["total_expenses"]),
            "net_profit": round2(summary["net_profit"]),
            "income_growth": summary["financial_intelligence"]["income_growth"],
            "expense_growth": summary["financial_intelligence"]["expense_growth"],
        })
    return rows


def compare_clients(user, client_ids):
    db = mongo_connection.get_db()
    rows = []
    for client_id in client_ids:
        from apps.mongo.utils import to_object_id
        client_oid = to_object_id(client_id, "client_id")
        client = db.clients.find_one({"_id": client_oid, "professional_id": str(user.id)})
        if not client:
            continue
        mapped_company_ids = [
            m["company_id"] for m in db.client_company_mapping.find({"client_id": client_oid, "status": "active"})
        ]
        income = expense = 0.0
        if mapped_company_ids:
            pipeline = [
                {"$match": {"company_id": {"$in": mapped_company_ids}, "status": {"$ne": "deleted"}, "type": {"$in": ["income", "expense"]}}},
                {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}}
            ]
            results = {r["_id"]: float(r["total"]) for r in db.transactions.aggregate(pipeline)}
            income = results.get("income", 0.0)
            expense = results.get("expense", 0.0)
        rows.append({
            "client_id": str(client_id), "client_name": client.get("full_name"),
            "companies_count": len(mapped_company_ids),
            "total_income": round2(income), "total_expenses": round2(expense), "net_profit": round2(income - expense),
        })
    return rows


def budget_vs_actual(user, company_id, month=None):
    summary = budget_analysis(user, company_id, month)
    if not summary:
        return []
    return [
        {
            "category_name": b["category_name"], "budgeted": b["amount"], "actual": b["actual_spent"],
            "variance": round2(b["amount"] - b["actual_spent"]), "is_overspending": b["is_overspending"],
        }
        for b in summary.get("budgets", [])
    ]


def forecast_vs_actual(user, company_id=None):
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    try:
        forecast_history, _entry = ml_prediction.predict_expense_forecast(user, periods_ahead=1)
    except Exception:
        return []
    rows = []
    for f in forecast_history:
        month_key = f"{f['year']}-{f['month']:02d}"
        actual = 0.0
        for doc in db.transactions.find(
            {"company_id": {"$in": company_ids}, "status": {"$ne": "deleted"}, "type": "expense"}, {"date": 1, "amount": 1},
        ):
            if (doc.get("date") or "")[:7] == month_key:
                actual += float(doc.get("amount", 0) or 0)
        rows.append({
            "period": month_key, "forecast": f["predicted_total"], "actual": round2(actual),
            "variance": round2(actual - f["predicted_total"]),
        })
    return rows


def tax_estimated_vs_paid(user, company_id=None):
    from apps.tax.services import get_gst_summary, get_tds_summary
    fy = current_financial_year()
    gst = get_gst_summary(user, company_id, fy)
    tds = get_tds_summary(user, company_id, fy)
    estimated = round2(gst.get("output_gst", 0) + tds.get("total_tds_deducted", 0))
    paid = round2(gst.get("input_gst", 0) + tds.get("total_tds_deducted", 0))
    return {
        "financial_year": fy, "estimated_liability": estimated, "recorded_as_paid_or_offset": paid,
        "variance": round2(estimated - paid),
    }


# ---------------------------------------------------------------------------
# KPI Module
# ---------------------------------------------------------------------------

def _period_totals(db, company_ids, start, end):
    match = {
        "company_id": {"$in": company_ids},
        "status": {"$ne": "deleted"},
        "date": {"$gte": start.isoformat(), "$lte": end.isoformat()},
        "type": {"$in": ["income", "expense"]}
    }
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}}
    ]
    results = {r["_id"]: float(r["total"]) for r in db.transactions.aggregate(pipeline)}
    return results.get("income", 0.0), results.get("expense", 0.0)


def get_revenue_expense_kpis(user, company_id=None, summary=None):
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    if not company_ids:
        return []

    start, end = month_bounds()
    prev_start, prev_end = previous_period(start, end)
    cur_income, cur_expense = _period_totals(db, company_ids, start, end)
    prev_income, prev_expense = _period_totals(db, company_ids, prev_start, prev_end)

    cur_profit = cur_income - cur_expense
    prev_profit = prev_income - prev_expense
    cur_margin = round2(cur_profit / cur_income * 100) if cur_income else 0.0
    prev_margin = round2(prev_profit / prev_income * 100) if prev_income else 0.0

    return [
        kpi_point("Revenue", cur_income, prev_income),
        kpi_point("Expenses", cur_expense, prev_expense),
        kpi_point("Net Profit", cur_profit, prev_profit),
        kpi_point("Profit Margin", cur_margin, prev_margin, unit="percent"),
        kpi_point("Savings Rate", cur_margin, prev_margin, unit="percent"),
    ]


def get_budget_utilization_kpi(user, company_id):
    if not company_id:
        return None
    this_month = datetime.utcnow().strftime("%Y-%m")
    first_of_this_month = datetime.utcnow().replace(day=1)
    last_month = (first_of_this_month - timedelta(days=1)).strftime("%Y-%m")
    try:
        current = get_budget_summary(user, company_id, this_month)
        previous = get_budget_summary(user, company_id, last_month)
    except Exception:
        return None
    cur_util = current.get("overall_progress_percentage", 0.0)
    prev_util = previous.get("overall_progress_percentage", 0.0)
    if not current.get("budgets") and not previous.get("budgets"):
        return None
    return kpi_point("Budget Utilization", cur_util, prev_util, unit="percent")


def get_tax_kpis(user, company_id=None):
    from apps.tax.services import get_gst_summary, get_tds_summary
    fy = current_financial_year()
    fy_parts = fy.split("-")
    prev_fy = f"{int(fy_parts[0]) - 1}-{fy_parts[0][-2:]}"
    try:
        gst_cur = get_gst_summary(user, company_id, fy)
        gst_prev = get_gst_summary(user, company_id, prev_fy)
        tds_cur = get_tds_summary(user, company_id, fy)
        tds_prev = get_tds_summary(user, company_id, prev_fy)
    except Exception:
        return []
    tax_paid_cur = gst_cur.get("net_gst_liability", 0) + tds_cur.get("total_tds_deducted", 0)
    tax_paid_prev = gst_prev.get("net_gst_liability", 0) + tds_prev.get("total_tds_deducted", 0)
    return [
        kpi_point("Tax Paid", tax_paid_cur, tax_paid_prev),
        kpi_point("GST Liability", gst_cur.get("net_gst_liability", 0), gst_prev.get("net_gst_liability", 0)),
        kpi_point("TDS Deducted", tds_cur.get("total_tds_deducted", 0), tds_prev.get("total_tds_deducted", 0)),
    ]


def get_compliance_and_health_kpis(user, company_id=None, health_score=None):
    from apps.tax.services import get_overall_filing_readiness
    kpis = []
    try:
        readiness = get_overall_filing_readiness(user, company_id=company_id)
        kpis.append(kpi_point("Compliance Score", readiness.get("score", 0), readiness.get("score", 0), unit="percent"))
    except Exception:
        pass
    health = health_score if health_score else compute_financial_health_score(user, company_id)
    kpis.append(kpi_point("Financial Health Score", health["overall_score"], health["overall_score"], unit="score"))
    ai_risk_score = 0.0
    try:
        company_ids, _ = resolve_company_scope(user, company_id)
        compliance_preds = ml_prediction.predict_compliance_risk(user, company_ids)
        level_weight = {"Low": 20, "Medium": 55, "High": 90}
        if compliance_preds:
            ai_risk_score = round2(sum(level_weight.get(c["risk_level"], 50) for c in compliance_preds) / len(compliance_preds))
    except ModelNotTrainedError:
        ai_risk_score = None
    if ai_risk_score is not None:
        kpis.append(kpi_point("AI Risk Score", ai_risk_score, ai_risk_score, unit="score"))
    return kpis


def get_all_kpis(user, company_id=None, health_score=None, summary=None):
    kpis = []
    kpis += get_revenue_expense_kpis(user, company_id, summary=summary)
    budget_kpi = get_budget_utilization_kpi(user, company_id)
    if budget_kpi:
        kpis.append(budget_kpi)
    kpis += get_tax_kpis(user, company_id)
    kpis += get_compliance_and_health_kpis(user, company_id, health_score=health_score)
    return kpis


# ---------------------------------------------------------------------------
# Analytics Dashboard & Executive Dashboard
# ---------------------------------------------------------------------------

def _safe(fn, *args, **kwargs):
    try:
        return {"available": True, "data": fn(*args, **kwargs)}
    except (ModelNotTrainedError, InsufficientDataError) as exc:
        return {"available": False, "reason": str(exc)}
    except Exception as exc:
        return {"available": False, "reason": str(exc)}


def get_analytics_dashboard(user, company_id=None):
    from apps.transactions.services import get_dashboard_summary
    txn_summary = get_dashboard_summary(user, company_id)
    health = compute_financial_health_score(user, company_id, summary=txn_summary)
    kpis = get_all_kpis(user, company_id, health_score=health, summary=txn_summary)
    quick_stats = {
        "total_transactions": txn_summary["financial_intelligence"]["kpis"]["total_transactions"],
        "active_vendors": txn_summary["financial_intelligence"]["kpis"]["active_vendors"],
        "active_customers": txn_summary["financial_intelligence"]["kpis"]["active_customers"],
        "pending_transactions": txn_summary["pending_transactions_count"],
    }
    recent_reports = get_recent_reports(user, limit=5)
    top_alerts = get_top_alerts(user, company_id, limit=5)
    return {
        "kpis": kpis,
        "quick_statistics": quick_stats,
        "income_expense_trend": txn_summary["monthly_trend"],
        "cash_flow_trend": txn_summary["financial_intelligence"]["cash_flow_trend"],
        "savings_trend": txn_summary["financial_intelligence"]["savings_trend"],
        "expense_breakdown": txn_summary["expense_breakdown"],
        "financial_health": health,
        "ml_prediction_summary": _safe(ml_prediction.predict_expense_forecast, user, periods_ahead=1),
        "business_intelligence": generate_business_insights(user, company_id, health_score=health),
        "recent_reports": recent_reports,
        "top_alerts": top_alerts,
        "model_status": list_model_registry(user.id),
    }


def get_executive_dashboard(user, company_id=None):
    from apps.tax.services import get_overall_filing_readiness
    from apps.transactions.services import get_dashboard_summary
    txn_summary = get_dashboard_summary(user, company_id)
    health = compute_financial_health_score(user, company_id, summary=txn_summary)
    ml_dashboard = _safe(get_ml_dashboard, user, company_id)
    try:
        readiness = get_overall_filing_readiness(user, company_id=company_id)
        tax_status = {"score": readiness.get("score", 0), "status": readiness.get("status", "unknown")}
    except Exception:
        tax_status = {"score": None, "status": "unavailable"}
    top_kpis = get_all_kpis(user, company_id, health_score=health)[:6]
    business_score = round2((
        health["overall_score"]
        + (tax_status["score"] or 50)
        + min(100, max(0, 50 + txn_summary["financial_intelligence"]["income_growth"]))
    ) / 3)
    quick_decisions = []
    for w in health["weaknesses"]:
        quick_decisions.append(f"Address {w.lower()} — see Financial Health suggestions.")
    if ml_dashboard["available"]:
        for alert in ml_dashboard["data"]["risk_alerts"][:3]:
            quick_decisions.append(alert["message"])
    return {
        "overview": {
            "total_income": round2(txn_summary["total_income"]),
            "total_expenses": round2(txn_summary["total_expenses"]),
            "net_profit": round2(txn_summary["net_profit"]),
            "income_growth": txn_summary["financial_intelligence"]["income_growth"],
            "expense_growth": txn_summary["financial_intelligence"]["expense_growth"],
        },
        "business_score": business_score,
        "financial_health": health,
        "tax_status": tax_status,
        "compliance_status": ml_dashboard["data"]["compliance_prediction"] if ml_dashboard["available"] else {"available": False},
        "ml_insights": ml_dashboard["data"]["insights"] if ml_dashboard["available"] else [],
        "top_kpis": top_kpis,
        "quick_decisions": quick_decisions[:5] or ["No urgent action items — business fundamentals look steady."],
    }


def generate_business_insights(user, company_id=None, health_score=None, summary=None):
    insights = []
    company_ids, _ = resolve_company_scope(user, company_id)
    if not company_ids:
        return insights

    expenses = category_analysis(user, company_id, txn_type="expense")
    income = category_analysis(user, company_id, txn_type="income")

    if expenses:
        top = expenses[0]
        insights.append({
            "type": "highest_spending_category",
            "explanation": f"'{top['category_name']}' is the highest spending category at ₹{top['total']:.2f} ({top['share_percentage']}% of total expenses).",
        })
    if income:
        top = income[0]
        insights.append({
            "type": "highest_revenue_source",
            "explanation": f"'{top['category_name']}' is the top revenue source at ₹{top['total']:.2f} ({top['share_percentage']}% of total income).",
        })

    vendors = party_analysis(user, company_id, party_type="vendor")
    if vendors:
        total_spend = sum(v["total"] for v in vendors) or 1
        top_share = vendors[0]["total"] / total_spend
        if top_share >= 0.35 and len(vendors) > 1:
            insights.append({
                "type": "vendor_dependency",
                "explanation": f"{vendors[0]['name']} accounts for {top_share * 100:.1f}% of vendor spend.",
            })

    customers = party_analysis(user, company_id, party_type="customer")
    if customers:
        total_rev = sum(c["total"] for c in customers) or 1
        top_share = customers[0]["total"] / total_rev
        if top_share >= 0.35 and len(customers) > 1:
            insights.append({
                "type": "customer_dependency",
                "explanation": f"{customers[0]['name']} accounts for {top_share * 100:.1f}% of revenue.",
            })

    cf = cash_flow_analysis(user, company_id, summary=summary)
    trend = cf.get("cash_flow_trend", [])
    if len(trend) >= 3:
        recent = [t["cash_flow"] for t in trend[-3:]]
        if recent[-1] < recent[0] and recent[-1] < 0:
            insights.append({"type": "cash_flow_risk", "explanation": "Cumulative cash flow has been declining and is currently negative."})

    health = health_score if health_score else compute_financial_health_score(user, company_id)
    if health["weaknesses"]:
        insights.append({
            "type": "risk_indicators",
            "explanation": f"Financial health flags {len(health['weaknesses'])} area(s): {', '.join(health['weaknesses'])}.",
        })

    return insights


def log_report_generation(user, report_type, fmt):
    db = mongo_connection.get_db()
    db.analytics_report_log.insert_one({
        "owner_id": str(user.id), "report_type": report_type, "format": fmt,
        "generated_at": now(),
    })


def get_recent_reports(user, limit=5):
    db = mongo_connection.get_db()
    docs = list(db.analytics_report_log.find({"owner_id": str(user.id)}).sort("generated_at", -1).limit(limit))
    return serialize(docs)


def get_top_alerts(user, company_id=None, limit=5):
    alerts = []
    ml_dashboard = _safe(get_ml_dashboard, user, company_id)
    if ml_dashboard["available"]:
        alerts += ml_dashboard["data"]["risk_alerts"]
    return alerts[:limit]


# ---------------------------------------------------------------------------
# Global Search & Batch Export
# ---------------------------------------------------------------------------

def global_search(user, query, company_id=None):
    db = mongo_connection.get_db()
    company_ids, _ = resolve_company_scope(user, company_id)
    regex = {"$regex": query, "$options": "i"}
    results = {"reports": [], "vendors": [], "customers": [], "transactions": [], "categories": []}

    for name in NEW_REPORT_BUILDERS.keys():
        if query.lower() in name.replace("-", " ").lower():
            results["reports"].append({"report_type": name, "label": name.replace("-", " ").title()})

    if company_ids:
        results["vendors"] = [
            {"id": str(v["_id"]), "name": v["name"]}
            for v in db.vendors.find({"owner_id": str(user.id), "name": regex, "is_deleted": False}).limit(10)
        ]
        results["customers"] = [
            {"id": str(c["_id"]), "name": c["name"]}
            for c in db.customers.find({"owner_id": str(user.id), "name": regex, "is_deleted": False}).limit(10)
        ]
        results["categories"] = [
            {"id": str(c["_id"]), "name": c["name"]}
            for c in db.transaction_categories.find({"name": regex}).limit(10)
        ]
        results["transactions"] = [
            {
                "id": str(t["_id"]), "description": t.get("description", ""),
                "reference_number": t.get("reference_number"), "amount": round2(t.get("amount", 0)),
                "date": t.get("date"),
            }
            for t in db.transactions.find({
                "company_id": {"$in": company_ids}, "status": {"$ne": "deleted"},
                "$or": [{"description": regex}, {"reference_number": regex}],
            }).limit(10)
        ]
    return results


def batch_export(user, report_types, fmt, company_id=None):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for report_type in report_types:
            builder = NEW_REPORT_BUILDERS.get(report_type)
            if not builder:
                continue
            content, _content_type, ext = builder(user, company_id, fmt)
            zf.writestr(f"{report_type}-report.{ext}", content)
    buffer.seek(0)
    return buffer.getvalue(), "application/zip", "zip"


# ---------------------------------------------------------------------------
# Report Builders
# ---------------------------------------------------------------------------

def build_income_report(user, company_id, fmt, financial_year=None):

    fy = financial_year or current_financial_year()
    rows = period_analysis(user, company_id, "monthly")
    headers = ["Period", "Income", "Expenses", "Net Profit"]
    data = [[r["period"], r["income"], r["expense"], r["net_profit"]] for r in rows]
    return render_report("Income Report", headers, data, fmt, subtitle=f"FY {fy}")


def build_expense_report(user, company_id, fmt, financial_year=None):
    fy = financial_year or current_financial_year()
    rows = category_analysis(user, company_id, txn_type="expense")
    headers = ["Category", "Total", "Transactions", "Share %"]
    data = [[r["category_name"], r["total"], r["count"], r["share_percentage"]] for r in rows]
    return render_report("Expense Report", headers, data, fmt, subtitle=f"FY {fy}")


def build_profit_loss_report(user, company_id, fmt, financial_year=None):

    rows = period_analysis(user, company_id, "monthly")
    headers = ["Period", "Income", "Expense", "Net Profit"]
    data = [[r["period"], r["income"], r["expense"], r["net_profit"]] for r in rows]
    total_income = sum(r["income"] for r in rows)
    total_expense = sum(r["expense"] for r in rows)
    data.append(["TOTAL", round2(total_income), round2(total_expense), round2(total_income - total_expense)])
    return render_report("Profit & Loss Statement", headers, data, fmt)


def build_balance_sheet_report(user, company_id, fmt, financial_year=None):
    summary = get_dashboard_summary(user, company_id)
    loans = loan_analysis(user, company_id)
    retained_cash = round2(summary["net_profit"])
    loan_balance = round2(loans["total"])
    headers = ["Line Item", "Amount", "Note"]
    data = [
        ["Retained cash (cumulative net profit)", retained_cash, "Assets — cash-basis approximation"],
        ["Recorded loan/EMI outflows", loan_balance, "Liabilities — approximation"],
        ["Net position", round2(retained_cash - loan_balance), ""],
    ]
    return render_report(
        "Balance Sheet (Cash-Basis Approximation)", headers, data, fmt,
        subtitle="Approximated from recorded transactions — not a substitute for a full statutory balance sheet.",
    )


def build_cash_flow_statement_report(user, company_id, fmt, financial_year=None):
    analysis = cash_flow_analysis(user, company_id)
    headers = ["Month", "Cumulative Cash Flow", "Savings"]
    savings_by_month = {s["month"]: s["savings"] for s in analysis["savings_trend"]}
    data = [[c["month"], c["cash_flow"], savings_by_month.get(c["month"], 0)] for c in analysis["cash_flow_trend"]]
    return render_report("Cash Flow Statement", headers, data, fmt)


def build_budget_report(user, company_id, fmt, financial_year=None):
    summary = budget_analysis(user, company_id)
    if not summary:
        return render_report("Budget Report", ["Category", "Budgeted", "Actual", "Remaining", "Overspending"], [], fmt)
    headers = ["Category", "Budgeted", "Actual", "Remaining", "Overspending"]
    data = [
        [b["category_name"], b["amount"], b["actual_spent"], round2(b["amount"] - b["actual_spent"]), "Yes" if b["is_overspending"] else "No"]
        for b in summary.get("budgets", [])
    ]
    return render_report("Budget Report", headers, data, fmt, subtitle=f"Month: {summary['month']}")


def build_vendor_report(user, company_id, fmt, financial_year=None):
    rows = party_analysis(user, company_id, party_type="vendor")
    headers = ["Vendor", "Total Spend", "Transactions", "Avg Transaction"]
    data = [[r["name"], r["total"], r["count"], r["average_transaction"]] for r in rows]
    return render_report("Vendor Report", headers, data, fmt)


def build_customer_report(user, company_id, fmt, financial_year=None):
    rows = party_analysis(user, company_id, party_type="customer")
    headers = ["Customer", "Total Revenue", "Transactions", "Avg Transaction"]
    data = [[r["name"], r["total"], r["count"], r["average_transaction"]] for r in rows]
    return render_report("Customer Report", headers, data, fmt)


def build_gst_report(user, company_id, fmt, financial_year=None):
    from apps.tax.services import get_gst_summary
    fy = financial_year or current_financial_year()
    summary = get_gst_summary(user, company_id, fy)
    headers = ["Month", "Output GST", "Input GST"]
    data = [[m["month"], round2(m.get("output_gst", 0)), round2(m.get("input_gst", 0))] for m in summary["monthly_trend"]]
    subtitle = f"FY {fy} — Net GST Liability: ₹{summary['net_gst_liability']}"
    return render_report("GST Report", headers, data, fmt, subtitle=subtitle)


def build_tds_report(user, company_id, fmt, financial_year=None):
    from apps.tax.services import get_tds_summary
    fy = financial_year or current_financial_year()
    summary = get_tds_summary(user, company_id, fy)
    headers = ["Month", "TDS Deducted"]
    data = [[m["month"], round2(m.get("tds_deducted", 0))] for m in summary["monthly_trend"]]
    subtitle = f"FY {fy} — Total TDS Deducted: ₹{summary['total_tds_deducted']}"
    return render_report("TDS Report", headers, data, fmt, subtitle=subtitle)


def build_income_tax_report(user, company_id, fmt, financial_year=None):
    from apps.mongo import connection as mongo_connection
    from apps.tax.services import _build_estimate, _resolve_company_ids
    fy = financial_year or current_financial_year()
    db = mongo_connection.get_db()
    company_ids, company_id_label = _resolve_company_ids(db, user, company_id)
    result, _patterns = _build_estimate(db, user, company_ids, company_id_label, fy)
    headers = ["Regime", "Total Tax"]
    data = [
        ["Old Regime", round2(result["old_regime"]["total_tax"])],
        ["New Regime", round2(result["new_regime"]["total_tax"])],
    ]
    subtitle = f"FY {fy} — Recommended: {result['recommended_regime']} regime"
    return render_report("Income Tax Report", headers, data, fmt, subtitle=subtitle)


def build_compliance_report(user, company_id, client_id, fmt, financial_year=None):
    from apps.tax.services import get_compliance_center
    fy = financial_year or current_financial_year()
    center = get_compliance_center(user, company_id=company_id, client_id=client_id, financial_year=fy)
    headers = ["Company ID", "Overall Score", "Filing Readiness", "High Priority Issues", "Warnings"]
    data = [
        [
            r.get("company_id") or "All companies", r.get("overall_score", 0),
            r.get("filing_readiness_status", "unknown"),
            len(r.get("high_priority_issues", [])), len(r.get("warnings", [])),
        ]
        for r in center.get("companies", [])
    ]
    subtitle = f"FY {fy} — Overall Compliance Score: {center.get('overall_compliance_score', 0)}"
    return render_report("Compliance Report", headers, data, fmt, subtitle=subtitle)


def build_executive_summary_report(user, company_id, fmt, financial_year=None):
    exec_dashboard = get_executive_dashboard(user, company_id)
    headers = ["Metric", "Value"]
    data = [
        ["Total Income", exec_dashboard["overview"]["total_income"]],
        ["Total Expenses", exec_dashboard["overview"]["total_expenses"]],
        ["Net Profit", exec_dashboard["overview"]["net_profit"]],
        ["Income Growth %", exec_dashboard["overview"]["income_growth"]],
        ["Expense Growth %", exec_dashboard["overview"]["expense_growth"]],
        ["Business Score", exec_dashboard["business_score"]],
        ["Financial Health Score", exec_dashboard["financial_health"]["overall_score"]],
        ["Tax Compliance Score", exec_dashboard["tax_status"].get("score")],
    ]
    for i, decision in enumerate(exec_dashboard["quick_decisions"], 1):
        data.append([f"Quick Decision {i}", decision])
    return render_report("Executive Summary", headers, data, fmt)


NEW_REPORT_BUILDERS = {
    "income": build_income_report,
    "expense": build_expense_report,
    "profit-loss": build_profit_loss_report,
    "balance-sheet": build_balance_sheet_report,
    "cash-flow-statement": build_cash_flow_statement_report,
    "budget": build_budget_report,
    "vendor": build_vendor_report,
    "customer": build_customer_report,
    "gst": build_gst_report,
    "tds": build_tds_report,
    "income-tax": build_income_tax_report,
    "executive-summary": build_executive_summary_report,
}
