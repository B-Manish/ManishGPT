#!/usr/bin/env python3
"""
Admin Setup Script for ManishGPT
Creates the first admin user in the database
"""

import os
import sys
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import User, UserRole, Base
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_admin_user():
    """Create the first admin user"""
    
    # Load environment variables
    load_dotenv()
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Ensure user roles exist
        admin_role = db.query(UserRole).filter(UserRole.name == "admin").first()
        if not admin_role:
            print("❌ Admin role not found! Please run setup_user_roles.py first.")
            return False
        
        # Get admin details from user input
        print("🔧 Creating Admin User for ManishGPT")
        print("=" * 50)
        
        email = input("Enter admin email: ").strip()
        if not email:
            print("❌ Email is required!")
            return False
        
        username = input("Enter admin username: ").strip()
        if not username:
            print("❌ Username is required!")
            return False
        
        password = input("Enter admin password (min 6 characters): ").strip()
        if len(password) < 6:
            print("❌ Password must be at least 6 characters!")
            return False
        
        # Check if email or username already exists
        existing_user = db.query(User).filter(
            (User.email == email) | (User.username == username)
        ).first()
        
        if existing_user:
            print(f"❌ User with email '{email}' or username '{username}' already exists!")
            return False
        
        # Create admin user
        hashed_password = hash_password(password)
        
        admin_user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            role_id=admin_role.id,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("\n✅ Admin user created successfully!")
        print("=" * 50)
        print(f"📧 Email: {admin_user.email}")
        print(f"👤 Username: {admin_user.username}")
        print(f"🔑 Role: {admin_role.name}")
        print(f"🆔 User ID: {admin_user.id}")
        print(f"📅 Created: {admin_user.created_at}")
        print("=" * 50)
        print("\n🚀 You can now:")
        print("   1. Start the server: uv run uvicorn main:app --reload")
        print("   2. Login at: POST /auth/login")
        print("   3. Access admin endpoints with the JWT token")
        print("   4. Create personas and assign them to users")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        db.rollback()
        return False
        
    finally:
        db.close()

def create_default_admin():
    """Create a default admin user with predefined credentials"""
    
    # Load environment variables
    load_dotenv()
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Ensure user roles exist
        admin_role = db.query(UserRole).filter(UserRole.name == "admin").first()
        if not admin_role:
            print("❌ Admin role not found! Please run setup_user_roles.py first.")
            return False
        
        # Default admin credentials
        email = "admin@manishgpt.com"
        username = "admin"
        password = "admin123"  # Change this in production!
        
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.email == email) | (User.username == username)
        ).first()
        
        if existing_user:
            print(f"✅ User already exists: {existing_user.email}")
            return True
        
        # Create admin user
        hashed_password = hash_password(password)
        
        admin_user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            role_id=admin_role.id,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Default admin user created successfully!")
        print("=" * 50)
        print(f"📧 Email: {admin_user.email}")
        print(f"👤 Username: {admin_user.username}")
        print(f"🔑 Password: {password}")
        print(f"🔑 Role: {admin_role.name}")
        print(f"🆔 User ID: {admin_user.id}")
        print("=" * 50)
        print("⚠️  IMPORTANT: Change the default password after first login!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating default admin user: {str(e)}")
        db.rollback()
        return False
        
    finally:
        db.close()

if __name__ == "__main__":
    print("ManishGPT Admin Setup Script")
    print("=" * 30)
    
    if len(sys.argv) > 1 and sys.argv[1] == "--default":
        # Create default admin
        create_default_admin()
    else:
        # Interactive admin creation
        create_admin_user()
