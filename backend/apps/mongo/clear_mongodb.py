import os
import sys
import django

# Setup Django environment to reuse connection settings
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.mongo import connection

def clear_obsolete_collections():
    db = connection.get_db()
    existing_collections = db.list_collection_names()
    obsolete_collections = [
        "clients",
        "invitations",
        "client_company_mapping",
        "company_members",
        "api_performance_log"
    ]
    
    logs = []
    logs.append(f"Starting MongoDB cleanup. Existing collections: {existing_collections}")
    
    for coll in obsolete_collections:
        if coll in existing_collections:
            db.drop_collection(coll)
            log_msg = f"Dropped collection: {coll}"
            print(log_msg)
            logs.append(log_msg)
        else:
            log_msg = f"Skipped collection (does not exist): {coll}"
            print(log_msg)
            logs.append(log_msg)
            
    logs.append("MongoDB cleanup finished successfully.")
    return logs

if __name__ == "__main__":
    clear_obsolete_collections()
