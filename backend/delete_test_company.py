import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.mongo import connection as mongo_connection
db = mongo_connection.get_db()
db.companies.update_many({'name': 'Test Freelancer Company'}, {'$set': {'is_deleted': True}})
