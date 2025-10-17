#!/usr/bin/env python3
"""
Script to run the UserRole migration and set up initial data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import Base, UserRole, User
from sqlalchemy import text
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def setup_user_roles():
    """Create the user_roles table and insert default roles"""
    print("Setting up UserRole table...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if roles already exist
        existing_roles = db.query(UserRole).count()
        if existing_roles > 0:
            print("UserRole table already has data, skipping...")
            return
        
        # Insert default roles
        admin_role = UserRole(
            name="admin",
            description="Administrator with full access",
            is_active=True
        )
        user_role = UserRole(
            name="user", 
            description="Regular user with limited access",
            is_active=True
        )
        
        db.add(admin_role)
        db.add(user_role)
        db.commit()
        
        print("✅ Default roles created:")
        print(f"   - Admin role (ID: {admin_role.id})")
        print(f"   - User role (ID: {user_role.id})")
        
        return admin_role.id, user_role.id
        
    except Exception as e:
        print(f"❌ Error setting up roles: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def update_existing_users():
    """Update existing users to use the new role system"""
    print("Updating existing users...")
    
    db = SessionLocal()
    try:
        # Get role IDs
        admin_role = db.query(UserRole).filter(UserRole.name == "admin").first()
        user_role = db.query(UserRole).filter(UserRole.name == "user").first()
        
        if not admin_role or not user_role:
            print("❌ Roles not found!")
            return
        
        # Check if users table has old 'role' column
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='role'
        """))
        
        has_old_role_column = result.fetchone() is not None
        
        if has_old_role_column:
            print("Found old 'role' column, updating users...")
            
            # Update users based on their old role
            db.execute(text("""
                UPDATE users 
                SET role_id = :admin_id 
                WHERE role = 'admin'
            """), {"admin_id": admin_role.id})
            
            db.execute(text("""
                UPDATE users 
                SET role_id = :user_id 
                WHERE role = 'user' OR role IS NULL
            """), {"user_id": user_role.id})
            
            db.commit()
            print("✅ Updated existing users with new role system")
        else:
            print("No old 'role' column found, users already updated")
            
    except Exception as e:
        print(f"❌ Error updating users: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def create_default_admin():
    """Create default admin user if none exists"""
    print("Checking for admin user...")
    
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin_role = db.query(UserRole).filter(UserRole.name == "admin").first()
        if not admin_role:
            print("❌ Admin role not found!")
            return
            
        existing_admin = db.query(User).filter(User.role_id == admin_role.id).first()
        
        if existing_admin:
            print(f"✅ Admin user already exists: {existing_admin.email}")
            return
        
        # Create default admin
        admin_user = User(
            email="admin@manishgpt.com",
            username="admin",
            hashed_password=hash_password("admin123"),
            role_id=admin_role.id,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        
        print("✅ Default admin user created:")
        print(f"   Email: admin@manishgpt.com")
        print(f"   Username: admin")
        print(f"   Password: admin123")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Main setup function"""
    print("🚀 Setting up UserRole system...")
    print("=" * 50)
    
    try:
        # Step 1: Create roles
        admin_id, user_id = setup_user_roles()
        
        # Step 2: Update existing users
        update_existing_users()
        
        # Step 3: Create default admin
        create_default_admin()
        
        print("=" * 50)
        print("🎉 UserRole system setup complete!")
        print("\nNext steps:")
        print("1. Run: uv run alembic upgrade head")
        print("2. Start your backend: uv run uvicorn main:app --reload")
        print("3. Start your React admin: cd admin-ui && npm start")
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
