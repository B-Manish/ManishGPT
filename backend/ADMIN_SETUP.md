# Admin Setup Guide

## Creating the First Admin User

This guide explains how to create the first admin user for your ManishGPT platform.

### Method 1: Interactive Setup (Recommended)

Run the interactive script to create a custom admin user:

```bash
# Using Python directly
uv run python create_admin.py

```

The script will prompt you for:
- Admin email address
- Admin username  
- Admin password (minimum 6 characters)

### Method 2: Default Admin (Quick Setup)

Create a default admin user with predefined credentials:

```bash
uv run python create_admin.py --default
```

**Default Credentials:**
- Email: `admin@manishgpt.com`
- Username: `admin`
- Password: `admin123`

⚠️ **Important**: Change the default password after first login!

### What the Script Does

1. **Checks for existing admins** - Prevents duplicate admin creation
2. **Validates input** - Ensures email/username are unique
3. **Hashes password** - Uses bcrypt for secure password storage
4. **Creates database record** - Stores admin user in the database
5. **Provides confirmation** - Shows created user details

### After Creating Admin

1. **Start the server:**
   ```bash
   uv run uvicorn main:app --reload
   ```

2. **Login to get JWT token:**
   ```bash
   POST /auth/login
   {
     "email": "admin@manishgpt.com",
     "password": "admin123"
   }
   ```

3. **Use JWT token for admin endpoints:**
   ```bash
   Authorization: Bearer <your-jwt-token>
   ```

### Admin Capabilities

Once logged in as admin, you can:
- ✅ Create and manage personas
- ✅ Assign personas to users
- ✅ Manage user accounts
- ✅ View analytics and reports
- ✅ Configure system settings

### Security Notes

- Passwords are hashed using bcrypt before storage
- JWT tokens expire after 30 minutes (configurable)
- Admin endpoints require authentication
- Default admin password should be changed immediately

### Troubleshooting

**"Admin user already exists"**
- The system prevents multiple admin creation
- Use the API to promote existing users to admin

**"Database connection error"**
- Ensure PostgreSQL is running
- Check DATABASE_URL in config.env
- Run migrations: `uv run alembic upgrade head`

**"Permission denied"**
- Ensure you're in the backend directory
- Check file permissions for scripts
