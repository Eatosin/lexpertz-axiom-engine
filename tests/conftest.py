import os
import sys
from dotenv import load_dotenv

# 1. LOAD ENV IMMEDIATELY (Before any AI files are imported)
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"\n[Axiom Test Setup] Neural Environment Loaded from {env_path}")
else:
    print(f"\n[Axiom Test Setup] ⚠️ WARNING: .env file not found!")

# 2. PATH RESOLUTION
server_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server"))
sys.path.insert(0, server_path)
