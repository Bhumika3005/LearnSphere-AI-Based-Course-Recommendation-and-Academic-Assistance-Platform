"""Initialize admin user in Supabase"""
import hashlib
from supabase_client import supabase

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

admin_email = "bhumika05k@gmail.com"
admin_password = "bhumi123"
admin_name = "Bhumika"

# Delete the old admin user if it exists
print("Removing old admin account (admin@learn.com)...")
try:
    supabase.table("users").delete().eq("email", "admin@learn.com").execute()
    print("✅ Old admin account removed successfully.")
except Exception as e:
    print(f"⚠️ Could not delete old admin (it might not exist): {e}")

print("Checking if admin user exists...")
response = supabase.table("users").select("id").eq("email", admin_email).execute()

if response.data:
    print(f"✅ Admin user already exists: {admin_email}")
    # Update password to ensure it's correct
    hashed = hash_password(admin_password)
    update_response = supabase.table("users").update({
        "password_hash": hashed,
        "is_admin": True
    }).eq("email", admin_email).execute()
    print("✅ Admin credentials updated")
else:
    print(f"❌ Admin user not found. Creating...")
    hashed = hash_password(admin_password)
    try:
        response = supabase.table("users").insert({
            "name": admin_name,
            "email": admin_email,
            "password_hash": hashed,
            "is_admin": True
        }).execute()
        print(f"✅ Admin user created successfully!")
        print(f"   Email: {admin_email}")
        print(f"   Password: {admin_password}")
    except Exception as e:
        print(f"❌ Error creating admin: {e}")
