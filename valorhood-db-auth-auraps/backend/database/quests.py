import os
from supabase import create_client
from dotenv import load_dotenv
from typing import Optional, Dict, List
from datetime import datetime, timedelta

load_dotenv()

class QuestSystem:
    def __init__(self):
        self.supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        self.current_user = None
        self.CATEGORIES = ['med', 'chore', 'social', 'skill', 'misc']  # Prebuilt categories

    def authenticate(self, email: str, password: str) -> bool:
        try:
            session = self.supabase.auth.sign_in_with_password({"email": email, "password": password})
            self.current_user = session.user
            return True
        except Exception as e:
            print(f"Auth error: {e}")
            return False

    def create_quest(self, title: str, description: str, aura_reward: int,
                    category: str, custom_tag: str = "") -> Optional[Dict]:
        """Create quest with auto-expiry in 30 mins"""
        if not self.current_user:
            raise Exception("User not authenticated")
        if category not in self.CATEGORIES:
            category = 'misc'  # Default category

        quest_data = {
            "title": title,
            "description": description,
            "aura_reward": aura_reward,
            "creator_id": self.current_user.id,
            "status": "active",
            "category": category,
            "custom_tag": custom_tag,
            "expires_at": (datetime.now() + timedelta(minutes=30)).isoformat()
        }

        try:
            response = self.supabase.table("quests").insert(quest_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Quest creation failed: {e}")
            return None

    def complete_quest(self, quest_id: str, helper_id: str) -> bool:
        try:
            # Get quest and check expiry
            quest = self.supabase.table("quests")\
                       .select("*")\
                       .eq("id", quest_id)\
                       .single()\
                       .execute()

            if datetime.now() > datetime.fromisoformat(quest.data["expires_at"]):
                self.supabase.table("quests").delete().eq("id", quest_id).execute()
                return False

            # Mark complete and reward
            self.supabase.table("quests")\
                .update({"status": "completed"})\
                .eq("id", quest_id)\
                .execute()

            self.supabase.rpc('process_aura', {
                'p_user_id': helper_id,
                'p_amount': quest.data["aura_reward"],
                'p_type': 'gain',
                'p_quest_id': quest_id
            }).execute()

            return True
        except Exception as e:
            print(f"Quest completion failed: {e}")
            return False

    def get_active_quests(self) -> List[Dict]:
        """Auto-remove expired quests and return active ones"""
        try:
            # Cleanup expired first
            self.supabase.table("quests")\
                .delete()\
                .lt("expires_at", datetime.now().isoformat())\
                .execute()

            # Fetch remaining
            response = self.supabase.table("quests")\
                         .select("*")\
                         .eq("status", "active")\
                         .execute()
            return response.data
        except Exception as e:
            print(f"Error fetching quests: {e}")
            return []

    def _cleanup_expired(self):
        """Background cleanup (call periodically)"""
        self.supabase.table("quests")\
            .delete()\
            .lt("expires_at", datetime.now().isoformat())\
            .execute()
