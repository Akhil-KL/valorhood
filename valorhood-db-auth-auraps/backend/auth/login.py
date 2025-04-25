from supabase import create_client
import os

def login_user(email: str, password: str) -> dict:
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    return supabase.auth.sign_in_with_password({"email": "test@valorhood.com", "password":"securePassword123!"})
