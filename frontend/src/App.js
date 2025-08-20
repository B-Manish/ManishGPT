import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import YouTubeAgent from "./components/YouTubeAgent";

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <Router>
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
            <Route path="/chat/:id" element={<Chat isSidebarCollapsed={isSidebarCollapsed} />} />
            <Route path="/youtube-agent" element={<YouTubeAgent />} />
            <Route path="*" element={
              <div style={{ 
                padding: 20, 
                backgroundColor: "#1e1e20",
                color: "white",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px"
              }}>
                Select or create a conversation.
              </div>
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
