"""
TDS rule engine — pure data + functions, no I/O.

Rates below are the commonly-cited resident-payee TDS rates for the
sections most likely to appear in a small business's transactions. This is
not exhaustive (TDS has ~30 sections with payee-type/threshold nuances) —
it's an educational estimate, clearly labeled wherever it surfaces, and the
table is intentionally isolated here so rates can be corrected/extended
without touching the estimator logic.
"""

TDS_SECTIONS = {
    "194C": {"label": "Payment to contractors", "rate": 0.01, "threshold_single": 30_000, "threshold_annual": 100_000},
    "194J": {"label": "Professional / technical fees", "rate": 0.10, "threshold_single": 30_000, "threshold_annual": 30_000},
    "194I_rent_land_building": {"label": "Rent (land/building/furniture)", "rate": 0.10, "threshold_single": None, "threshold_annual": 240_000},
    "194I_rent_equipment": {"label": "Rent (plant/machinery/equipment)", "rate": 0.02, "threshold_single": None, "threshold_annual": 240_000},
    "194H": {"label": "Commission or brokerage", "rate": 0.05, "threshold_single": None, "threshold_annual": 20_000},
}

TDS_DUE_DATES = [
    {"label": "TDS payment (monthly)", "frequency": "7th of every month"},
    {"label": "Form 26Q - Q1 (Apr-Jun)", "day_month": "07-31"},
    {"label": "Form 26Q - Q2 (Jul-Sep)", "day_month": "10-31"},
    {"label": "Form 26Q - Q3 (Oct-Dec)", "day_month": "01-31"},
    {"label": "Form 26Q - Q4 (Jan-Mar)", "day_month": "05-31"},
]

# Keyword hints used to guess the most likely section for a transaction
# that already has a tds_amount recorded but no section on file — purely
# a suggestion for the user to confirm, never an authoritative filing.
SECTION_KEYWORDS = {
    "194J": ["professional", "consulting", "consultant", "technical", "legal", "audit"],
    "194I_rent_land_building": ["rent", "lease"],
    "194H": ["commission", "brokerage"],
    "194C": ["contractor", "contract", "works contract"],
}


def compute_tds(amount, section):
    """TDS Calculator: given a gross payment amount and section, returns the
    TDS to withhold and the net payable amount.
    """
    if section not in TDS_SECTIONS:
        raise ValueError(f"Unknown section '{section}'. Expected one of {list(TDS_SECTIONS)}.")
    rule = TDS_SECTIONS[section]
    tds_amount = round(amount * rule["rate"], 2)
    return {
        "section": section,
        "section_label": rule["label"],
        "rate": rule["rate"],
        "gross_amount": round(amount, 2),
        "tds_amount": tds_amount,
        "net_payable": round(amount - tds_amount, 2),
    }


def guess_section(description, category_name=None):
    """Best-effort section guess from free text — used only to help
    pre-fill/confirm, never to auto-file anything."""
    text = f"{description or ''} {category_name or ''}".lower()
    for section, keywords in SECTION_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return section
    return None
