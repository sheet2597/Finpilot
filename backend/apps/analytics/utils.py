"""Shared helpers for the Analytics module.

Report rendering (XLSX/PDF) deliberately reuses the renderers already
built for Part 6 (`apps.ml.services._xlsx_from_rows` /
`_pdf_from_rows`) instead of re-implementing openpyxl/reportlab
boilerplate — only a CSV renderer is new here. Company-scope resolution
reuses `apps.ml.services.resolve_company_scope`, which itself reuses
`apps.documents.services.get_user_company_ids` /
`apps.companies.services.get_accessible_company` from Parts 2–3. This is
intentional: Part 7 is an aggregation/BI layer over Parts 1–6, not a
parallel implementation.
"""
import csv
import io
from datetime import datetime, timedelta

from apps.ml.services import _pdf_from_rows, _xlsx_from_rows, resolve_company_scope  # noqa: F401
from apps.tax.services import current_financial_year  # noqa: F401


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
    """(start_date, end_date) as 'YYYY-MM-DD' strings for an Indian FY
    (Apr 1 – Mar 31), matching `apps.tax.services._financial_year_range`."""
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
    """Given [start, end], return the immediately preceding period of the
    same length — used for every 'current vs previous' comparison."""
    length = end - start
    prev_end = start - timedelta(seconds=1)
    prev_start = prev_end - length
    return prev_start, prev_end


def quarter_bounds(dt=None):
    dt = dt or datetime.utcnow()
    q_start_month = ((dt.month - 1) // 3) * 3 + 1
    start = dt.replace(month=q_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    end_month = q_start_month + 2
    if end_month == 12:
        next_start = start.replace(year=start.year + 1, month=1)
    else:
        next_start = start.replace(month=end_month + 1)
    end = next_start - timedelta(seconds=1)
    return start, end


def year_bounds(dt=None):
    dt = dt or datetime.utcnow()
    start = dt.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    end = dt.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=0)
    return start, end


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
