import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import OAuthCallback from "./components/OAuthCallback";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <div style={{
                display: "flex",
                height: "100vh",
                backgroundColor: "#1e1e20"
              }}>
                <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
                <div style={{
                  marginLeft: isSidebarCollapsed ? 60 : 250,
                  flex: 1,
                  transition: "margin-left 0.3s ease",
                }}>
                  <Routes>
                    <Route path="/chat/persona/:id" element={<Chat isSidebarCollapsed={isSidebarCollapsed} />} />
                    <Route path="/chat/:id" element={<Chat isSidebarCollapsed={isSidebarCollapsed} />} />
                    <Route path="*" element={<Chat isSidebarCollapsed={isSidebarCollapsed} />} />
                  </Routes>
                </div>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
