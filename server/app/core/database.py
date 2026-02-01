import os
from supabase import create_client, Client

class Database:
    _instance = None
    client: Client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY") # Service key needed for Admin writes
        
        if not url or not key:
            print("⚠️ Warning: Supabase credentials not found in environment.")
            return

        self.client = create_client(url, key)

# Global Accessor
db = Database().client
