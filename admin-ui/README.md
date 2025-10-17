# ManishGPT Admin Dashboard (React)

A modern, professional React admin dashboard for managing the ManishGPT platform. Built with React, Tailwind CSS, and integrated with the FastAPI backend.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Running ManishGPT backend API (port 8000)

### Installation

1. **Install dependencies:**
   ```bash
   cd admin-ui
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Access the dashboard:**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Default Login Credentials
- **Email:** `admin@manishgpt.com`
- **Password:** `admin123`

## 🎯 Features

### ✅ **Authentication System**
- Secure JWT-based authentication
- Automatic token management
- Protected routes
- Session persistence

### ✅ **Persona Management**
- **Create Personas** - Define AI personas with custom instructions
- **Edit Personas** - Modify existing persona configurations
- **Delete Personas** - Remove personas with safety checks
- **View Personas** - Card-based display with all details
- **Model Configuration** - OpenAI/Groq model selection

### ✅ **User Management**
- **User Listing** - View all registered users
- **Status Management** - Activate/deactivate user accounts
- **Role Display** - Visual badges for admin/user roles
- **User Details** - Email, username, creation date

### ✅ **Assignment Management**
- **Persona Assignment** - Assign personas to users
- **Assignment Removal** - Remove persona assignments
- **Assignment Tracking** - View all user-persona mappings
- **Real-time Updates** - Dynamic assignment management

### ✅ **Modern UI/UX**
- **Responsive Design** - Works on all screen sizes
- **Tailwind CSS** - Modern, clean styling
- **Loading States** - User feedback during operations
- **Error Handling** - Comprehensive error messages
- **Toast Notifications** - Success/error feedback
- **Modal Dialogs** - Intuitive form interactions

## 🛠️ Technical Stack

### **Frontend Technologies:**
- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests
- **Context API** - State management

### **Key Libraries:**
- `react-router-dom` - Routing
- `axios` - API requests
- `tailwindcss` - Styling
- `@headlessui/react` - Accessible UI components
- `@heroicons/react` - SVG icons

## 📁 Project Structure

```
admin-ui/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.js
│   │   ├── ProtectedRoute.js
│   │   ├── Dashboard.js
│   │   ├── PersonaManagement.js
│   │   ├── PersonaCard.js
│   │   ├── PersonaForm.js
│   │   ├── UserManagement.js
│   │   └── AssignmentManagement.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## 🔧 Configuration

### **API Configuration**
The app automatically connects to `http://localhost:8000` (your FastAPI backend). To change this:

1. Create `.env` file in the root directory:
   ```env
   REACT_APP_API_URL=http://your-api-url:port
   ```

2. Or modify `src/services/api.js`:
   ```javascript
   const API_BASE_URL = 'http://your-api-url:port';
   ```

### **Tailwind Configuration**
Customize the design system in `tailwind.config.js`:
```javascript
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          // Your custom colors
        }
      }
    }
  }
}
```

## 🎨 UI Components

### **Login Component**
- Clean authentication interface
- Pre-filled default credentials
- Error handling and validation
- Responsive design

### **Dashboard Layout**
- Professional admin layout
- Tab-based navigation
- User info and logout
- Responsive sidebar

### **Persona Management**
- Card-based persona display
- Modal form for create/edit
- Real-time updates
- Model configuration

### **User Management**
- User listing with status
- Role and status badges
- Action buttons
- Status toggles

### **Assignment Management**
- User-persona mapping
- Assignment controls
- Real-time updates
- Intuitive interface

## 📡 API Integration

### **Authentication Endpoints**
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

### **Persona Endpoints**
- `GET /admin/personas` - List personas
- `POST /admin/personas` - Create persona
- `PUT /admin/personas/{id}` - Update persona
- `DELETE /admin/personas/{id}` - Delete persona

### **User Endpoints**
- `GET /admin/users` - List users
- `POST /admin/users/{id}/activate` - Activate user
- `POST /admin/users/{id}/deactivate` - Deactivate user

### **Assignment Endpoints**
- `POST /admin/users/{id}/assign-persona` - Assign persona
- `DELETE /admin/users/{id}/personas/{persona_id}` - Remove assignment

## 🚀 Deployment

### **Development Build**
```bash
npm run build
```

### **Production Deployment**
1. Build the app: `npm run build`
2. Serve the `build` folder with any static server
3. Ensure API URL is correctly configured

### **Docker Deployment**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Protected Routes** - Admin-only access
- **Token Expiration** - Automatic logout on token expiry
- **Input Validation** - Client and server-side validation
- **HTTPS Ready** - Production-ready security

## 🐛 Troubleshooting

### **Common Issues:**

1. **API Connection Failed**
   - Ensure backend is running on port 8000
   - Check CORS settings in backend
   - Verify API URL configuration

2. **Authentication Issues**
   - Clear localStorage: `localStorage.clear()`
   - Check JWT token validity
   - Verify admin user exists

3. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Verify all dependencies are installed

### **Development Tips:**

1. **Hot Reload** - Changes auto-refresh in development
2. **Error Boundaries** - React error handling
3. **Console Logging** - Debug API calls and state
4. **Network Tab** - Monitor API requests

## 📈 Future Enhancements

- **Real-time Updates** - WebSocket integration
- **Advanced Analytics** - Usage statistics
- **Bulk Operations** - Mass management features
- **Export Features** - Data export capabilities
- **Theme Customization** - Dark/light mode
- **Audit Logs** - Track admin actions
- **Advanced Filtering** - Search and filter options

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the ManishGPT platform.

---

**Built with ❤️ for ManishGPT Platform**

For support or questions, please check the main API documentation or create an issue.