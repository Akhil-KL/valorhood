import os
from supabase import create_client
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, validator
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    username: str  # Simple display name

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class AuthManager:
    def __init__(self):
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_KEY")
        )

    def sign_up(self, request: SignupRequest) -> dict:
        """Minimal signup flow with username"""
        try:
            # 1. Auth signup
            response = self.supabase.auth.sign_up({
                "email": request.email,
                "password": request.password,
                "options": {
                    "data": {
                        "username": request.username
                    }
                }
            })

            logger.info(f"New user: {request.username} ({request.email})")
            return {
                "status": "success",
                "user_id": response.user.id if response.user else None
            }

        except Exception as e:
            logger.error(f"Signup failed: {str(e)}")
            return {
                "status": "error",
                "message": "Registration failed. Please try again."
            }

# Test (remove in production)
if __name__ == "__main__":
    auth = AuthManager()
    result = auth.sign_up(SignupRequest(
        email="user@valorhood.com",
        password="secure123",
        username="valor_user"
    ))
    print(result)
