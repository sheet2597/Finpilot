# FinPilot Demo Data Pack

Generated datasets for college submission and viva demonstration.

## Contents

| File | Records | Purpose |
|------|---------|---------|
| `companies_reference.json` | 3 companies | Manual company creation reference |
| `vendors.csv` | 15 vendors | Add via Vendors page before import |
| `customers.csv` | 20 customers | Add via Customers page before import |
| `transactions.csv` | 150 transactions | Bulk import via Transactions > Import |
| `transactions.xlsx` | 150 transactions | Excel import alternative |
| `budgets_reference.json` | 20 budgets | Create via Budgets UI |
| `documents_manifest.json` | 25 document entries | Upload guide + sample PDFs |
| `documents/sample_invoice_*.pdf` | 5 PDFs | Upload to Documents module |

## Setup Order (15 minutes)

1. **Register** a demo user (Business Owner role recommended).
2. **Verify OTP** from console/email logs.
3. **Create 3 companies** using fields from `companies_reference.json`.
4. **Add vendors** — copy rows from `vendors.csv` (Vendors page).
5. **Add customers** — copy rows from `customers.csv` (Customers page).
6. **Import transactions** — select a company, upload `transactions.csv` or `transactions.xlsx`.
7. **Set budgets** — use `budgets_reference.json` as a guide (Budgets tab).
8. **Upload documents** — use PDFs in `documents/` folder.
9. **Train ML models** — ML Dashboard > Train All (needs ≥30 categorized expenses).
10. **Explore** Tax Center, Analytics, and Report Center.

## Import Notes

- Category names must match system defaults (Sales, Rent, Salaries, etc.).
- Vendor/customer names in CSV must exactly match names added in step 4–5.
- Import is per-company — run import once per company or split CSV manually.

## Regenerate

```bash
python demo/generate_demo_data.py
```
