"""
Rule engine for Indian income tax estimation.

This module intentionally contains *only* data + pure functions — no I/O,
no MongoDB, no user lookups. That keeps the tax rules easy to audit and to
update independently as slabs/limits change each Union Budget, per the
brief's "keep tax rules modular for future updates" and "do not hard-code
calculations" requirements.

IMPORTANT: These are the publicly announced FY 2025-26 (AY 2026-27) slabs
and standard deduction/limit figures. Tax law changes; this is an
educational estimate for the Tax Center, not filing-grade advice. Anyone
relying on this for an actual return should verify current figures with
the Income Tax Department / a qualified CA — the app surfaces this
disclaimer wherever an estimate is shown.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Slab:
    up_to: float | None  # None = no upper bound
    rate: float          # e.g. 0.05 for 5%


# --- New tax regime (default regime since FY 2023-24; revised slabs FY 2025-26) ---
NEW_REGIME_SLABS = [
    Slab(400_000, 0.0),
    Slab(800_000, 0.05),
    Slab(1_200_000, 0.10),
    Slab(1_600_000, 0.15),
    Slab(2_000_000, 0.20),
    Slab(2_400_000, 0.25),
    Slab(None, 0.30),
]
NEW_REGIME_STANDARD_DEDUCTION = 75_000
NEW_REGIME_REBATE_87A_LIMIT = 1_200_000  # taxable income at/below this -> nil tax (marginal relief ignored, simplified)

# --- Old tax regime ---
OLD_REGIME_SLABS = [
    Slab(250_000, 0.0),
    Slab(500_000, 0.05),
    Slab(1_000_000, 0.20),
    Slab(None, 0.30),
]
OLD_REGIME_STANDARD_DEDUCTION = 50_000
OLD_REGIME_REBATE_87A_LIMIT = 500_000

# Deduction caps under the old regime (new regime disallows almost all of these)
OLD_REGIME_DEDUCTION_CAPS = {
    "section_80c": 150_000,   # SIP/ELSS, life insurance premium, principal repayment, etc.
    "section_80d": 25_000,    # Health insurance premium (below 60)
    "section_24b": 200_000,   # Home loan interest
}

HEALTH_AND_EDUCATION_CESS_RATE = 0.04  # applied on tax + surcharge (surcharge not modelled here — flagged in output)


def _tax_from_slabs(taxable_income, slabs):
    if taxable_income <= 0:
        return 0.0
    tax = 0.0
    previous_cap = 0.0
    for slab in slabs:
        upper = slab.up_to if slab.up_to is not None else taxable_income
        if taxable_income <= previous_cap:
            break
        slice_amount = max(0.0, min(taxable_income, upper) - previous_cap)
        tax += slice_amount * slab.rate
        previous_cap = upper
    return tax


def compute_tax(taxable_income, regime):
    """Computes income tax + cess for a given taxable income and regime
    ("old" or "new"). Returns a breakdown dict. Surcharge (applicable only
    at very high incomes, >50L) is intentionally not modelled — flagged via
    `surcharge_may_apply` so the UI can warn rather than silently understate.
    """
    if regime == "new":
        slabs, rebate_limit = NEW_REGIME_SLABS, NEW_REGIME_REBATE_87A_LIMIT
    elif regime == "old":
        slabs, rebate_limit = OLD_REGIME_SLABS, OLD_REGIME_REBATE_87A_LIMIT
    else:
        raise ValueError(f"Unknown regime '{regime}'. Expected 'old' or 'new'.")

    base_tax = _tax_from_slabs(taxable_income, slabs)
    rebate_applied = taxable_income <= rebate_limit
    tax_after_rebate = 0.0 if rebate_applied else base_tax
    cess = tax_after_rebate * HEALTH_AND_EDUCATION_CESS_RATE
    total_tax = tax_after_rebate + cess

    return {
        "regime": regime,
        "taxable_income": round(taxable_income, 2),
        "base_tax": round(base_tax, 2),
        "rebate_87a_applied": rebate_applied,
        "tax_after_rebate": round(tax_after_rebate, 2),
        "cess": round(cess, 2),
        "total_tax": round(total_tax, 2),
        "surcharge_may_apply": taxable_income > 5_000_000,
    }


def estimate_deductions(pattern_amounts):
    """Caps detected recurring-pattern amounts (annualised) against the old
    regime's statutory limits. `pattern_amounts` is a dict like
    {"insurance_premium": 42000, "sip": 180000, "home_loan_emi_interest": 220000}.
    Returns the deduction actually allowable per section, capped.
    """
    return {
        "section_80c": round(min(pattern_amounts.get("section_80c", 0), OLD_REGIME_DEDUCTION_CAPS["section_80c"]), 2),
        "section_80d": round(min(pattern_amounts.get("section_80d", 0), OLD_REGIME_DEDUCTION_CAPS["section_80d"]), 2),
        "section_24b": round(min(pattern_amounts.get("section_24b", 0), OLD_REGIME_DEDUCTION_CAPS["section_24b"]), 2),
    }


def compare_regimes(gross_income, old_regime_deductions):
    """Full old-vs-new comparison for a given gross annual income.
    `old_regime_deductions` is the output of `estimate_deductions` (only
    used for the old regime — the new regime only gets its own standard
    deduction, per current law).
    """
    old_taxable = max(0.0, gross_income - OLD_REGIME_STANDARD_DEDUCTION - sum(old_regime_deductions.values()))
    new_taxable = max(0.0, gross_income - NEW_REGIME_STANDARD_DEDUCTION)

    old_result = compute_tax(old_taxable, "old")
    new_result = compute_tax(new_taxable, "new")
    old_result["deductions_applied"] = old_regime_deductions
    new_result["deductions_applied"] = {}

    recommended = "old" if old_result["total_tax"] < new_result["total_tax"] else "new"
    savings = abs(old_result["total_tax"] - new_result["total_tax"])

    return {
        "gross_income": round(gross_income, 2),
        "old_regime": old_result,
        "new_regime": new_result,
        "recommended_regime": recommended,
        "estimated_savings_by_choosing_recommended": round(savings, 2),
    }
