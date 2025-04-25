def create_clan(leader_id, clan_name):
    supabase.table("clans").insert({
        "name": clan_name,
        "leader_id": leader_id
    }).execute()
