import os
import threading
from typing import Optional
from supabase import create_client, Client

class Database:
    """
    SOTA Thread-Safe Singleton for Supabase.
    Optimized for high-concurrency async background tasks.
    """
    _instance: Optional['Database'] = None
    _lock = threading.Lock()
    client: Optional[Client] = None

    def __new__(cls) -> 'Database':
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(Database, cls).__new__(cls)
                    cls._instance._init_client()
        return cls._instance

    def _init_client(self) -> None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")
        
        if not url or not key:
            print("⚠️  CRITICAL: Supabase credentials missing. Vault features will be disabled.")
            return

        try:
            # SOTA: Initializing the Master Service Client
            self.client = create_client(url, key)
            print("AXIOM-CORE: Vault Database Connection Established.")
        except Exception as e:
            print(f"❌ DATABASE INIT ERROR: {e}")

# Global Accessor
# Initialized once at module load, but shielded by the Singleton logic.
_db_manager = Database()
db: Optional[Client] = _db_manager.client
