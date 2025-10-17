# ManishGPT Admin UI

A comprehensive admin dashboard for managing personas, users, and assignments in the ManishGPT platform.

## 🚀 Quick Start

### 1. Start the Main API Server
```bash
cd backend
uv run uvicorn main:app --reload
```
The API will be available at: `http://localhost:8000`

### 2. Start the Admin UI Server
```bash
cd backend
uv run python serve_admin_ui.py
```
The Admin UI will be available at: `http://localhost:8001`

### 3. Access the Admin Dashboard
Open your browser and go to: `http://localhost:8001`

## 🔐 Login Credentials

**Default Admin Account:**
- **Email:** `admin@manishgpt.com`
- **Password:** `admin123`

⚠️ **Important:** Change the default password after first login!

## 📋 Admin Features

### ✅ **Persona Management**
- **Create Personas** - Define new AI personas with custom instructions
- **Edit Personas** - Modify existing persona configurations
- **Delete Personas** - Remove personas (with safety checks)
- **View Personas** - List all personas with details
- **Model Configuration** - Set OpenAI/Groq models per persona

### ✅ **User Management**
- **View Users** - List all registered users
- **User Status** - Activate/deactivate user accounts
- **Role Management** - Promote users to admin (coming soon)
- **User Details** - View user information and activity

### ✅ **Assignment Management**
- **Assign Personas** - Assign personas to specific users
- **Remove Assignments** - Unassign personas from users
- **View Assignments** - See which users have which personas
- **Assignment History** - Track assignment changes

### ✅ **Authentication & Security**
- **JWT Authentication** - Secure token-based login
- **Role-based Access** - Admin-only endpoints
- **Session Management** - Automatic token refresh
- **Secure Logout** - Clear authentication state

## 🛠️ Technical Features

### **Frontend Technologies:**
- **HTML5** - Semantic markup
- **Tailwind CSS** - Modern, responsive design
- **Alpine.js** - Lightweight JavaScript framework
- **Font Awesome** - Professional icons
- **Fetch API** - Modern HTTP requests

### **Backend Integration:**
- **FastAPI** - High-performance API framework
- **JWT Authentication** - Secure token handling
- **SQLAlchemy** - Database ORM
- **Pydantic** - Data validation
- **bcrypt** - Password hashing

### **UI/UX Features:**
- **Responsive Design** - Works on desktop and mobile
- **Modern Interface** - Clean, professional design
- **Loading States** - User feedback during operations
- **Toast Notifications** - Success/error messages
- **Modal Dialogs** - Intuitive form interactions
- **Tab Navigation** - Organized content sections

## 📱 Interface Overview

### **Login Page**
- Clean, gradient background
- Pre-filled default credentials
- Secure password input
- Error handling and feedback

### **Dashboard Layout**
- **Navigation Bar** - Admin info and logout
- **Tab System** - Organized sections
- **Action Buttons** - Quick access to functions
- **Data Tables** - Structured information display

### **Persona Management**
- **Create Modal** - Form for new personas
- **Persona Cards** - Visual persona display
- **Action Buttons** - Edit, delete, activate
- **Model Information** - Provider and model details

### **User Management**
- **User Cards** - User information display
- **Status Indicators** - Active/inactive badges
- **Role Badges** - Admin/user role display
- **Action Controls** - Status toggle buttons

## 🔧 API Endpoints Used

### **Authentication:**
- `POST /auth/login` - Admin login
- `GET /auth/me` - Get current user info

### **Persona Management:**
- `GET /admin/personas` - List all personas
- `POST /admin/personas` - Create new persona
- `GET /admin/personas/{id}` - Get persona details
- `PUT /admin/personas/{id}` - Update persona
- `DELETE /admin/personas/{id}` - Delete persona

### **User Management:**
- `GET /admin/users` - List all users
- `GET /admin/users/{id}` - Get user details
- `POST /admin/users/{id}/activate` - Activate user
- `POST /admin/users/{id}/deactivate` - Deactivate user

### **Assignment Management:**
- `POST /admin/users/{id}/assign-persona` - Assign persona
- `DELETE /admin/users/{id}/personas/{persona_id}` - Remove assignment
- `GET /admin/users/{id}/personas` - Get user's personas

## 🚨 Security Notes

- **HTTPS Recommended** - Use HTTPS in production
- **Change Default Password** - Update admin password immediately
- **Token Expiration** - JWT tokens expire after 30 minutes
- **Admin Only Access** - All endpoints require admin authentication
- **Input Validation** - All inputs are validated and sanitized

## 🐛 Troubleshooting

### **Login Issues:**
- Ensure API server is running on port 8000
- Check admin credentials are correct
- Verify database connection

### **API Errors:**
- Check browser console for error messages
- Verify JWT token is valid
- Ensure admin user exists in database

### **UI Issues:**
- Clear browser cache and reload
- Check JavaScript console for errors
- Verify all dependencies are loaded

## 📈 Future Enhancements

- **Real-time Updates** - WebSocket integration
- **Advanced Analytics** - Usage statistics and reports
- **Bulk Operations** - Mass user/persona management
- **Export Features** - Data export capabilities
- **Audit Logs** - Track all admin actions
- **Theme Customization** - Dark/light mode toggle

## 🤝 Support

For issues or questions:
1. Check the browser console for errors
2. Verify API server is running correctly
3. Check database connectivity
4. Review the main API documentation

---

**Built with ❤️ for ManishGPT Platform**
