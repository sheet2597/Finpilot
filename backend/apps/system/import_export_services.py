"""Import / Export catalog service.

Returns metadata about which data types the user can import or export,
along with the expected formats and field mappings. Used by the frontend
Import/Export settings page to build dynamic file-upload forms and
download links without hard-coding field names in the UI.
"""


EXPORT_CATALOG = [
    {
        "key": "transactions",
        "label": "Transactions",
        "description": "All income, expense, and salary transactions.",
        "formats": ["csv", "xlsx"],
        "endpoint": "/api/transactions/export",
    },
    {
        "key": "vendors",
        "label": "Vendors",
        "description": "Vendor master list with contact details.",
        "formats": ["csv", "xlsx"],
        "endpoint": "/api/vendors/export",
    },
    {
        "key": "customers",
        "label": "Customers",
        "description": "Customer master list with contact details.",
        "formats": ["csv", "xlsx"],
        "endpoint": "/api/customers/export",
    },
    {
        "key": "categories",
        "label": "Categories",
        "description": "Transaction category list.",
        "formats": ["csv"],
        "endpoint": "/api/categories/export",
    },
]

IMPORT_CATALOG = [
    {
        "key": "transactions",
        "label": "Transactions",
        "description": "Bulk import transactions from CSV or Excel.",
        "formats": ["csv", "xlsx"],
        "endpoint": "/api/transactions/import",
        "template_fields": [
            "date", "type", "amount", "description", "category",
            "vendor", "customer", "payment_method", "reference_number",
            "invoice_number", "gst_amount", "tds_amount", "tags", "notes",
        ],
        "max_rows": 5000,
    },
]


def get_export_catalog(user):
    """Return the list of exportable data types available to this user."""
    return EXPORT_CATALOG


def get_import_catalog(user):
    """Return the list of importable data types available to this user."""
    return IMPORT_CATALOG
