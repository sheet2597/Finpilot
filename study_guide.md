# FinPilot — Study Guide (12-Hour Preparation)

> Project: FinPilot – Financial Intelligence & Tax Management Platform
>
> Stack: React • Django • PostgreSQL • MongoDB • Scikit-learn
>
> Goal:
>
> Learn the complete project in one day for project submission and viva.

---

# Study Order

```
Project Overview
        ↓
Folder Structure
        ↓
Authentication
        ↓
Clients
        ↓
Companies
        ↓
Transactions
        ↓
Documents
        ↓
Tax
        ↓
Machine Learning
        ↓
Analytics
        ↓
Database
        ↓
Complete Demo
        ↓
Viva
```

---

# Phase 1 — Project Overview (1 Hour)

## Learn

- What problem does FinPilot solve?
- Why was it built?
- Who will use it?
- What are the main features?
- Why React?
- Why Django?
- Why MongoDB?
- Why PostgreSQL?
- Why Machine Learning?

Read

```
PROJECT_PRESENTATION.md
VIVA_PREPARATION.md
FINAL_SUBMISSION_REPORT.md
```

Understand

```
User
↓

Frontend

↓

Backend

↓

Database

↓

Response

↓

Frontend
```

---

# Phase 2 — Folder Structure (30 Minutes)

Draw this from memory.

## Frontend

```
frontend/src/

components/
context/
features/
routes/
lib/
```

### Features

```
auth/
clients/
companies/
transactions/
documents/
tax/
analytics/
ml/
dashboard/
profile/
system/
landing/
errors/
```

Know one sentence for each folder.

---

## Backend

```
backend/apps/

accounts/
clients/
companies/
transactions/
documents/
tax/
analytics/
ml/
dashboard/
system/
mongo/
```

Know one sentence for each module.

---

# Phase 3 — Authentication (1 Hour)

## Backend Files

```
backend/apps/accounts/views.py

backend/apps/accounts/serializers.py

backend/apps/accounts/models.py

backend/apps/accounts/permissions.py

backend/apps/accounts/urls.py
```

## Frontend Files

```
frontend/src/features/auth/

AuthContext.jsx

api.js

authorization.js

pages/

LoginPage.jsx

RegisterPage.jsx

VerifyOtpPage.jsx

ForgotPasswordPage.jsx

ResetPasswordPage.jsx
```

## Shared

```
frontend/src/lib/axios.js

frontend/src/components/ProtectedRoute.jsx

frontend/src/routes/router.jsx
```

## Learn

Registration

↓

OTP Verification

↓

Login

↓

JWT

↓

Refresh Token

↓

Logout

↓

Forgot Password

---

# Phase 4 — Clients (30 Minutes)

## Backend

```
backend/apps/clients/

views.py

services.py

serializers.py

urls.py
```

## Frontend

```
frontend/src/features/clients/

api.js

hooks.js

pages/

ClientListPage.jsx

ClientDetailPage.jsx
```

## Learn

Create Client

↓

Update Client

↓

Delete Client

↓

Map Client to Companies

---

# Phase 5 — Companies (45 Minutes)

## Backend

```
backend/apps/companies/

views.py

services.py

serializers.py

urls.py
```

## Frontend

```
frontend/src/features/companies/

api.js

hooks.js

pages/

CompanyListPage.jsx

CompanyDetailPage.jsx
```

## Learn

Create Company

↓

Update Company

↓

Delete Company

↓

Select Active Company

---

# Phase 6 — Transactions (2 Hours)

## Backend

```
backend/apps/transactions/

views.py

services.py

serializers.py

urls.py
```

## Frontend

```
frontend/src/features/transactions/

api.js

hooks.js

pages/

TransactionsPage.jsx

CategoriesPage.jsx

VendorsPage.jsx

CustomersPage.jsx
```

## Learn

Transaction CRUD

↓

Categories

↓

Vendor

↓

Customer

↓

Budget

↓

CSV Import

↓

Excel Import

↓

Export

↓

Analytics Data

Ignore helper functions.

---

# Phase 7 — Documents (45 Minutes)

## Backend

```
backend/apps/documents/

views.py

services.py

serializers.py
```

## Frontend

```
frontend/src/features/documents/

DocumentsPage.jsx

DocumentDetailPage.jsx
```

## Learn

Upload

↓

Store

↓

Duplicate Detection

↓

Archive

---

# Phase 8 — Tax (45 Minutes)

## Backend

```
backend/apps/tax/

views.py

services.py

gst_rules.py

tds_rules.py
```

## Frontend

```
frontend/src/features/tax/

TaxCenterPage.jsx
```

## Learn

GST

↓

TDS

↓

Income Tax

↓

Compliance

↓

Filing Readiness

---

# Phase 9 — Machine Learning (45 Minutes)

## Backend

```
backend/apps/ml/

train.py

predict.py

features.py

services.py

utils.py
```

## Frontend

```
frontend/src/features/ml/

AIDashboardPage.jsx
```

## Learn

Expense Categorization

↓

Random Forest

Duplicate Detection

↓

Isolation Forest

Compliance Risk

↓

Decision Tree

Expense Forecast

↓

Linear Regression

Tax Forecast

↓

Linear Regression

Don't memorize algorithms.

Only know why each one is used.

---

# Phase 10 — Analytics (45 Minutes)

## Backend

```
backend/apps/analytics/

views.py

services.py

utils.py
```

## Frontend

```
frontend/src/features/analytics/

AnalyticsDashboardPage.jsx

ExecutiveDashboardPage.jsx

ReportCenterPage.jsx
```

## Learn

KPIs

↓

Mongo Aggregation

↓

Charts

↓

Reports

↓

Export PDF

↓

Export Excel

---

# Phase 11 — Dashboard (30 Minutes)

Backend

```
backend/apps/dashboard/

views.py

services.py
```

Frontend

```
DashboardPage.jsx
```

Learn

Dashboard

↓

Statistics

↓

Recent Activity

↓

Quick Actions

---

# Phase 12 — Routing (30 Minutes)

Read

```
frontend/src/routes/router.jsx
```

Understand

```
Landing

↓

Login

↓

Dashboard

↓

Clients

↓

Companies

↓

Transactions

↓

Tax

↓

Analytics

↓

ML

↓

Settings

↓

Logout
```

---

# Phase 13 — API Flow (1 Hour)

Example

```
TransactionsPage.jsx

↓

hooks.js

↓

api.js

↓

Axios

↓

Django View

↓

Service

↓

MongoDB

↓

Response

↓

React Query

↓

UI
```

If you understand one flow,

you understand almost the whole project.

---

# Phase 14 — Database (45 Minutes)

## PostgreSQL

Know these tables

```
Users

EmailVerificationOTP

PasswordResetOTP

OutstandingToken

BlacklistedToken

AuditLog
```

Purpose

Authentication

↓

OTP

↓

JWT

↓

Audit

---

## MongoDB

Know these collections

```
clients
client_company_mapping
company_members
companies
transactions
documents
transaction_categories
vendors
customers
parties
budgets
analytics
reports
analytics_report_log
ml_models
user_preferences
```

Purpose

Business Data

---

# Phase 15 — Run Complete Demo (2 Hours)

Repeat this until comfortable.

```
Landing

↓

Register

↓

Verify OTP

↓

Login

↓

Create Client

↓

Create Company

↓

Add Vendor

↓

Add Customer

↓

Create Transaction

↓

Import CSV

↓

Upload Documents

↓

Tax Center

↓

Analytics

↓

ML Dashboard

↓

Train Models

↓

Download Report

↓

Profile

↓

Settings

↓

Logout
```

---

# Phase 16 — Viva Preparation (1 Hour)

For every module answer:

### 1

What does it do?

### 2

Which files implement it?

### 3

How does data flow?

Example

Transactions

Purpose

Manage financial records.

Backend

```
views.py

services.py
```

Frontend

```
TransactionsPage.jsx

api.js

hooks.js
```

Database

```
MongoDB

transactions collection
```

---

# Important Files

## Frontend

```
routes/router.jsx

AuthContext.jsx

ProtectedRoute.jsx

DashboardLayout.jsx

ThemeContext.jsx

lib/axios.js

features/clients/api.js

features/companies/api.js

features/transactions/api.js

ClientListPage.jsx

CompanyListPage.jsx

TransactionsPage.jsx

DashboardPage.jsx
```

---

## Backend

```
config/settings.py

config/urls.py

accounts/views.py

clients/views.py

companies/views.py

transactions/views.py

documents/views.py

tax/views.py

analytics/views.py

ml/train.py

ml/predict.py
```

---

# Don't Waste Time Learning

Skip these unless asked.

```
Utility files

Every helper

Every regex

Every serializer field

Tailwind implementation

Every React hook

Every import statement

Small helper functions
```

Understand the project.

Don't memorize code.

---

# 12-Hour Timeline

| Time | Task |
|-------|------|
| 1 Hour | Project Overview |
| 30 min | Folder Structure |
| 1 Hour | Authentication |
| 30 min | Clients |
| 45 min | Companies |
| 2 Hours | Transactions |
| 45 min | Documents |
| 45 min | Tax |
| 45 min | Machine Learning |
| 45 min | Analytics |
| 45 min | Database |
| 2 Hours | Demo Practice |
| 1 Hour | Viva Practice |

---

# Final Goal

By the end of this guide, you should be able to explain:

- Overall Architecture
- Authentication Flow
- React Frontend
- Django Backend
- PostgreSQL
- MongoDB
- Machine Learning
- Tax Module
- Analytics
- Complete User Flow

without needing to memorize every line of code.
