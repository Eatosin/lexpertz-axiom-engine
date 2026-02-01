import os
from typing import Optional, Any
from supabase import create_client, Client # type: ignore

class Database:
    """
    SOTA Singleton for Supabase Connection.
    Uses Optional typing to satisfy MyPy strict checks.
    """
    _instance: Optional['Database'] = None
    client: Optional[Client] = None

    def __new__(cls) -> 'Database':
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self) -> None:
        url: Optional[str] = os.environ.get("SUPABASE_URL")
        key: Optional[str] = os.environ.get("SUPABASE_SERVICE_KEY")
        
        if not url or not key:
            # We don't crash here to allow the server to start for health checks
            print("⚠️ Critical Security Warning: Supabase credentials missing.")
            return

        self.client = create_client(url, key)

# Global Accessor
# We initialize the singleton here
_db_manager = Database()
db: Optional[Client] = _db_manager.client
