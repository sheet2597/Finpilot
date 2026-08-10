"""
GST rule engine — pure data + functions, no I/O. Mirrors the separation
already used in rules.py for income tax: rates/limits live here, callers in
services.py do the aggregation and persistence.

GSTIN format validation deliberately reuses the company app's existing
`GST_REGEX` (apps.companies.serializers) instead of redefining it, per the
brief's "never duplicate logic".
"""

from apps.companies.serializers import GST_REGEX

# Standard GST slabs in India. Cess and special rates (e.g. on gold, real
# estate under GST) are out of scope for this educational estimator.
GST_RATE_SLABS = [0.0, 0.05, 0.12, 0.18, 0.28]

GST_DUE_DATES = [
    {"label": "GSTR-1 (outward supplies)", "frequency": "11th of every month"},
    {"label": "GSTR-3B (summary return + payment)", "frequency": "20th of every month"},
]


def validate_gstin(value):
    """Returns (is_valid, normalized_value_or_None)."""
    if not value:
        return False, None
    normalized = value.strip().upper()
    return bool(GST_REGEX.match(normalized)), (normalized if GST_REGEX.match(normalized) else None)


def nearest_gst_slab(effective_rate):
    """Snaps a computed effective rate to the closest standard slab, so
    historical transactions (which only store a gst_amount, not a rate) can
    be bucketed for analytics even though the exact slab wasn't recorded.
    """
    return min(GST_RATE_SLABS, key=lambda slab: abs(slab - effective_rate))


def compute_gst_breakdown(taxable_value, rate, supply_type="intra_state"):
    """GST Calculator: given a taxable (pre-tax) value and a rate, returns
    the CGST/SGST or IGST split and the total invoice value.
    `supply_type` is "intra_state" (CGST+SGST, split evenly) or
    "inter_state" (IGST, full rate).
    """
    if taxable_value < 0:
        raise ValueError("Taxable value cannot be negative.")
    if rate not in GST_RATE_SLABS:
        raise ValueError(f"Rate must be one of {GST_RATE_SLABS}.")

    total_gst = round(taxable_value * rate, 2)
    if supply_type == "inter_state":
        cgst, sgst, igst = 0.0, 0.0, total_gst
    else:
        cgst = round(total_gst / 2.0, 2)
        sgst = total_gst - cgst
        igst = 0.0

    return {
        "taxable_value": round(taxable_value, 2),
        "rate": rate,
        "supply_type": supply_type,
        "cgst": cgst,
        "sgst": sgst,
        "igst": igst,
        "total_gst": total_gst,
        "total_invoice_value": round(taxable_value + total_gst, 2),
    }
