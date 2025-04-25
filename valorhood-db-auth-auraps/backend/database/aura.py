import os
from enum import Enum
from pydantic import BaseModel, field_validator, Field
from supabase import create_client
from typing import Optional
from datetime import datetime
import logging
from dotenv import load_dotenv


import uuid
from pathlib import Path

# Keep your existing logging config
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AuraType(str, Enum):
    GAIN = "gain"
    SPEND = "spend"

class AuraRequest(BaseModel):
    user_id: str = Field(..., min_length=36, max_length=36)
    amount: int = Field(..., gt=0)
    type: AuraType
    quest_id: Optional[int] = None
    min_aura: int = Field(0, ge=0)  # Changed from min_balance to match DB

    @field_validator('user_id')
    @classmethod
    def validate_uuid(cls, v):
        try:
            return str(uuid.UUID(v))
        except ValueError:
            raise ValueError('Invalid UUID format')

# Find the .env file one directory above
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)
from supabase import create_client
# Initialize Supabase (no changes needed)
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

def execute_aura_transaction(request: AuraRequest) -> dict:
    """Improved with better error handling"""
    try:
        # Match parameters to your new SQL function
        response = supabase.rpc('process_aura', {
            'p_user_id': request.user_id,
            'p_amount': request.amount,
            'p_type': request.type.value,
            'p_quest_id': request.quest_id,
            'p_min_aura': request.min_aura  # Parameter renamed
        }).execute()

        return {
            "status": "success",
            "new_aura": response.data.get("new_aura"),  # Field renamed
            "transaction_id": response.data.get("transaction_id"),
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Aura transaction failed: {e}", exc_info=True)
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Helper functions (updated field names)
def reward_quest(user_id: str, amount: int, quest_id: int) -> dict:
    return execute_aura_transaction(AuraRequest(
        user_id=user_id,
        amount=amount,
        type=AuraType.GAIN,
        quest_id=quest_id
    ))

def spend_aura(user_id: str, amount: int, min_aura: int = 0) -> dict:
    return execute_aura_transaction(AuraRequest(
        user_id=user_id,
        amount=amount,
        type=AuraType.SPEND,
        min_aura=min_aura  # Parameter renamed
    ))
