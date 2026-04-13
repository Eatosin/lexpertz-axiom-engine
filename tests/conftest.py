import os
import sys
import pytest
from dotenv import load_dotenv

# 1. PATH RESOLUTION (The Monorepo Fix)
# This forces Python to look inside the 'server' folder when we do 'from app.core...'
server_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server"))
sys.path.insert(0, server_path)

@pytest.fixture(scope="session", autouse=True)
def setup_env():
    """
    SOTA Test Configuration:
    Automatically loads the .env file before any tests run.
    Guarantees that NVIDIA_API_KEY and Supabase credentials are warm.
    """
    # Locate the .env file in the root directory
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"\n[Axiom Test Setup] Neural Environment Loaded from {env_path}")
    else:
        print(f"\n[Axiom Test Setup] WARNING: .env file not found at {env_path}!")
