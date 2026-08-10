#!/usr/bin/env python3
"""Generate FinPilot demo datasets for college submission.

Run from project root:
    python demo/generate_demo_data.py

Outputs CSV/Excel/PDF files under demo/ — no database connection required.
"""
import csv
import json
import random
from datetime import date, timedelta
from pathlib import Path

try:
    from openpyxl import Workbook
except ImportError:
    Workbook = None

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
except ImportError:
    canvas = None

ROOT = Path(__file__).resolve().parent
random.seed(42)

COMPANIES = [
    {
        "name": "NovaTech Solutions Pvt Ltd",
        "business_type": "private_limited",
        "gst_number": "27AABCN1234F1Z5",
        "pan_number": "AABCN1234F",
        "industry": "Information Technology",
        "city": "Pune",
        "state": "Maharashtra",
    },
    {
        "name": "GreenLeaf Organics",
        "business_type": "partnership",
        "gst_number": "29AABCG5678H1Z2",
        "pan_number": "AABCG5678H",
        "industry": "Retail & FMCG",
        "city": "Bengaluru",
        "state": "Karnataka",
    },
    {
        "name": "Skyline Freelance Studio",
        "business_type": "sole_proprietorship",
        "gst_number": "07AABCS9012K1Z8",
        "pan_number": "AABCS9012K",
        "industry": "Creative Services",
        "city": "New Delhi",
        "state": "Delhi",
    },
]

VENDORS = [
    ("Amazon Web Services", "billing@aws.amazon.com", "+91-80-12345678", "29AABCA1234A1Z5", "Embassy Tech Village, Bengaluru"),
    ("Microsoft India", "billing@microsoft.com", "+91-124-4567890", "06AABCM5678B1Z3", "Gurugram, Haryana"),
    ("Office Depot India", "sales@officedepot.in", "+91-22-67890123", "27AABCO9012C1Z1", "Andheri East, Mumbai"),
    ("Tata Power", "support@tatapower.com", "+91-22-66654321", "27AABCT3456D1Z7", "Colaba, Mumbai"),
    ("Airtel Business", "enterprise@airtel.in", "+91-11-45678901", "07AABCA7890E1Z4", "Connaught Place, Delhi"),
    ("HDFC Bank", "corporate@hdfcbank.com", "+91-22-66543432", "27AABCH2345F1Z6", "Nariman Point, Mumbai"),
    ("UrbanClap Pro", "vendors@urbancompany.com", "+91-80-98765432", "29AABCU6789G1Z0", "Indiranagar, Bengaluru"),
    ("FedEx Logistics", "billing@fedex.com", "+91-40-23456789", "36AABCF1234H1Z2", "HITEC City, Hyderabad"),
    ("Google Cloud India", "cloud-billing@google.com", "+91-80-55551234", "29AABCG4321I1Z9", "Whitefield, Bengaluru"),
    ("Reliance Jio", "enterprise@jio.com", "+91-22-35551234", "27AABCR8765J1Z3", "Navi Mumbai"),
    ("QuickBooks Partner", "support@quickbooks.in", "+91-124-33334444", "06AABCQ5432K1Z8", "Gurugram"),
    ("Swiggy Instamart B2B", "b2b@swiggy.in", "+91-80-44445555", "29AABCS7654L1Z1", "Koramangala, Bengaluru"),
    ("Canon India", "service@canon.co.in", "+91-124-66667777", "06AABCC9876M1Z5", "Manesar, Haryana"),
    ("Adobe Systems", "billing@adobe.com", "+91-80-77778888", "29AABCA2468N1Z7", "Manyata Tech Park, Bengaluru"),
    ("Local CA Associates", "ca@localassociates.in", "+91-20-88889999", "27AABCL1357O1Z0", "Camp, Pune"),
]

CUSTOMERS = [
    ("BrightPath EdTech", "accounts@brightpath.in", "+91-11-11112222", "07AABCB1111A1Z1", "South Extension, Delhi"),
    ("MediCare Clinics", "finance@medicare.in", "+91-22-22223333", "27AABCM2222B1Z2", "Bandra West, Mumbai"),
    ("EcoBuild Constructions", "billing@ecobuild.in", "+91-80-33334444", "29AABCE3333C1Z3", "HSR Layout, Bengaluru"),
    ("FashionHub Retail", "ap@fashionhub.in", "+91-44-44445555", "33AABCF4444D1Z4", "T Nagar, Chennai"),
    ("AgriFresh Exports", "orders@agrifresh.in", "+91-79-55556666", "24AABCA5555E1Z5", "Navrangpura, Ahmedabad"),
    ("CloudNine Hospitality", "accounts@cloudnine.in", "+91-40-66667777", "36AABCC6666F1Z6", "Banjara Hills, Hyderabad"),
    ("PixelCraft Agency", "hello@pixelcraft.in", "+91-20-77778888", "27AABCP7777G1Z7", "Kothrud, Pune"),
    ("SecureNet IT Services", "billing@securenet.in", "+91-124-88889999", "06AABCS8888H1Z8", "Cyber City, Gurugram"),
    ("Wellness Yoga Studio", "info@wellnessyoga.in", "+91-80-99990000", "29AABCW9999I1Z9", "Jayanagar, Bengaluru"),
    ("AutoParts Direct", "sales@autoparts.in", "+91-22-10101010", "27AABCA1010J1Z0", "Andheri West, Mumbai"),
    ("LegalEase Consultants", "finance@legalease.in", "+91-11-12121212", "07AABCL1212K1Z1", "Karol Bagh, Delhi"),
    ("TravelMate Tours", "accounts@travelmate.in", "+91-79-13131313", "24AABCT1313L1Z2", "Satellite, Ahmedabad"),
    ("FreshBake Foods", "billing@freshbake.in", "+91-33-14141414", "19AABCF1414M1Z3", "Park Street, Kolkata"),
    ("SmartHome Automation", "ap@smarthome.in", "+91-40-15151515", "36AABCS1515N1Z4", "Gachibowli, Hyderabad"),
    ("EduPrime Coaching", "fees@eduprime.in", "+91-20-16161616", "27AABCE1616O1Z5", "Hadapsar, Pune"),
    ("GreenEnergy Solar", "projects@greenenergy.in", "+91-80-17171717", "29AABCG1717P1Z6", "Electronic City, Bengaluru"),
    ("UrbanFit Gym Chain", "billing@urbanfit.in", "+91-22-18181818", "27AABCU1818Q1Z7", "Powai, Mumbai"),
    ("DataDrive Analytics", "contracts@datadrive.in", "+91-124-19191919", "06AABCD1919R1Z8", "Udyog Vihar, Gurugram"),
    ("Heritage Handicrafts", "export@heritage.in", "+91-141-20202020", "08AABCH2020S1Z9", "Jaipur, Rajasthan"),
    ("NextGen Robotics", "finance@nextgenrobotics.in", "+91-80-21212121", "29AABCN2121T1Z0", "Bellandur, Bengaluru"),
]

INCOME_CATEGORIES = ["Sales", "Service Revenue", "Interest Income", "Other Income"]
EXPENSE_CATEGORIES = [
    "Office Supplies", "Rent", "Utilities", "Salaries", "Travel",
    "Marketing", "Professional Fees", "Bank Charges", "Other Expense",
]
PAYMENT_METHODS = ["bank_transfer", "upi", "credit_card", "debit_card", "cash", "net_banking"]
DESCRIPTIONS = {
    "income": [
        "Consulting invoice payment", "Product sale - Q{}", "Monthly retainer fee",
        "Project milestone payment", "Interest credited", "Service contract renewal",
    ],
    "expense": [
        "Monthly cloud hosting", "Office rent - {}", "Electricity bill", "Team salaries",
        "Client meeting travel", "Digital marketing campaign", "CA audit fees",
        "Bank service charges", "Software subscription", "Office stationery purchase",
    ],
}

CSV_COLUMNS = [
    "date", "amount", "type", "category", "description", "vendor", "customer",
    "payment_method", "reference_number", "invoice_number", "gst_amount", "tds_amount", "status", "notes",
]


def write_vendors_csv():
    path = ROOT / "vendors.csv"
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["name", "email", "phone", "gst_number", "address"])
        w.writerows(VENDORS)
    return path


def write_customers_csv():
    path = ROOT / "customers.csv"
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["name", "email", "phone", "gst_number", "address"])
        w.writerows(CUSTOMERS)
    return path


def write_companies_json():
    path = ROOT / "companies_reference.json"
    path.write_text(json.dumps(COMPANIES, indent=2), encoding="utf-8")
    return path


def _random_date(start: date, end: date) -> str:
    delta = (end - start).days
    return (start + timedelta(days=random.randint(0, delta))).isoformat()


def generate_transactions(n=150):
    start = date(2025, 4, 1)
    end = date(2026, 3, 15)
    rows = []
    vendor_names = [v[0] for v in VENDORS]
    customer_names = [c[0] for c in CUSTOMERS]

    for i in range(n):
        is_income = i % 4 == 0  # ~25% income
        txn_type = "income" if is_income else "expense"
        category = random.choice(INCOME_CATEGORIES if is_income else EXPENSE_CATEGORIES)
        amount = round(random.uniform(500, 85000) if is_income else random.uniform(200, 45000), 2)
        gst = round(amount * 0.18, 2) if txn_type == "expense" and random.random() > 0.4 else 0
        tds = round(amount * 0.10, 2) if is_income and random.random() > 0.7 else 0
        desc_pool = DESCRIPTIONS[txn_type]
        desc = random.choice(desc_pool).format(random.choice(["1", "2", "3", "Apr", "May"]))

        rows.append({
            "date": _random_date(start, end),
            "amount": amount,
            "type": txn_type,
            "category": category,
            "description": desc,
            "vendor": "" if is_income else random.choice(vendor_names),
            "customer": random.choice(customer_names) if is_income else "",
            "payment_method": random.choice(PAYMENT_METHODS),
            "reference_number": f"REF{2025000 + i}",
            "invoice_number": f"INV-{2025}-{1000 + i}",
            "gst_amount": gst,
            "tds_amount": tds,
            "status": "completed",
            "notes": "Demo transaction for FinPilot presentation",
        })
    rows.sort(key=lambda r: r["date"])
    return rows


def write_transactions_csv(rows):
    path = ROOT / "transactions.csv"
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        w.writeheader()
        w.writerows(rows)
    return path


def write_transactions_xlsx(rows):
    path = ROOT / "transactions.xlsx"
    if Workbook is None:
        return None
    wb = Workbook()
    ws = wb.active
    ws.title = "Transactions"
    ws.append(CSV_COLUMNS)
    for row in rows:
        ws.append([row[c] for c in CSV_COLUMNS])
    wb.save(path)
    return path


def write_budgets_json():
    budgets = []
    months = [f"2025-{m:02d}" for m in range(4, 13)] + ["2026-01", "2026-02", "2026-03"]
    for company in COMPANIES:
        for i, month in enumerate(months[:7]):
            budgets.append({
                "company_name": company["name"],
                "month": month,
                "category": EXPENSE_CATEGORIES[i % len(EXPENSE_CATEGORIES)],
                "amount": round(random.uniform(10000, 150000), 2),
                "note": "Create via Transactions > Budgets after selecting company",
            })
    # pad to 20+
    while len(budgets) < 20:
        budgets.append({
            "company_name": random.choice(COMPANIES)["name"],
            "month": random.choice(months),
            "category": random.choice(EXPENSE_CATEGORIES),
            "amount": round(random.uniform(5000, 80000), 2),
            "note": "Optional category-level budget",
        })
    path = ROOT / "budgets_reference.json"
    path.write_text(json.dumps(budgets[:20], indent=2), encoding="utf-8")
    return path


def write_documents_manifest():
    doc_types = [
        "GST Invoice", "Purchase Order", "Bank Statement", "TDS Certificate",
        "Salary Slip", "Rent Agreement", "Insurance Policy", "Audit Report",
        "Balance Sheet", "Profit & Loss Statement", "ITR Acknowledgement",
        "GSTR-1 Summary", "GSTR-3B Summary", "Vendor Contract",
        "Client Agreement", "Expense Receipt", "Travel Bill", "Utility Bill",
        "Professional Fee Invoice", "Loan Statement", "Investment Statement",
        "PAN Card Copy", "GST Registration", "MSME Certificate", "Board Resolution",
    ]
    docs = []
    for i, dtype in enumerate(doc_types):
        docs.append({
            "id": i + 1,
            "title": f"{dtype} - Demo {i + 1}",
            "type": dtype,
            "company": COMPANIES[i % 3]["name"],
            "sample_file": f"documents/sample_invoice_{(i % 5) + 1}.pdf" if i < 5 else None,
            "upload_note": "Upload via Documents page; OCR optional",
        })
    path = ROOT / "documents_manifest.json"
    path.write_text(json.dumps(docs, indent=2), encoding="utf-8")
    return path


def write_sample_pdfs():
    if canvas is None:
        return []
    out_dir = ROOT / "documents"
    out_dir.mkdir(exist_ok=True)
    created = []
    for i in range(1, 6):
        path = out_dir / f"sample_invoice_{i}.pdf"
        c = canvas.Canvas(str(path), pagesize=A4)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(2 * 72, 750, f"FinPilot Demo Invoice #{1000 + i}")
        c.setFont("Helvetica", 11)
        company = COMPANIES[(i - 1) % 3]
        vendor = VENDORS[(i - 1) % len(VENDORS)]
        customer = CUSTOMERS[(i - 1) % len(CUSTOMERS)]
        lines = [
            f"Seller: {vendor[0]}",
            f"Buyer: {customer[0]}",
            f"Company: {company['name']}",
            f"GSTIN: {company['gst_number']}",
            f"Invoice Date: 2025-0{(i % 9) + 1}-15",
            f"Amount: INR {15000 + i * 2500:.2f}",
            f"GST (18%): INR {(15000 + i * 2500) * 0.18:.2f}",
            "",
            "This is a synthetic document for college demo purposes only.",
        ]
        y = 700
        for line in lines:
            c.drawString(72, y, line)
            y -= 18
        c.showPage()
        c.save()
        created.append(path)
    return created


def write_readme():
    text = """# FinPilot Demo Data Pack

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
"""
    path = ROOT / "README.md"
    path.write_text(text, encoding="utf-8")
    return path


def main():
    rows = generate_transactions(150)
    outputs = [
        write_companies_json(),
        write_vendors_csv(),
        write_customers_csv(),
        write_transactions_csv(rows),
        write_budgets_json(),
        write_documents_manifest(),
        write_readme(),
    ]
    xlsx = write_transactions_xlsx(rows)
    if xlsx:
        outputs.append(xlsx)
    pdfs = write_sample_pdfs()
    outputs.extend(pdfs)
    print("Generated demo data:")
    for p in outputs:
        if p:
            print(f"  - {p.relative_to(ROOT.parent)}")


if __name__ == "__main__":
    main()
