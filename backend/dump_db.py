import asyncio
from supabase_client import supabase

def dump_db():
    print("--- VIDEO PROGRESS ---")
    resp = supabase.table("video_progress").select("*").execute()
    for row in resp.data or []:
        print(row)
        
    print("\n--- COURSE PROGRESS ---")
    resp = supabase.table("course_progress").select("*").execute()
    for row in resp.data or []:
        print(row)

if __name__ == "__main__":
    dump_db()
