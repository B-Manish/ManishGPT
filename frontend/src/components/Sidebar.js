import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import PsychologyIcon from '@mui/icons-material/Psychology';

function Sidebar({ isCollapsed, onToggle }) {
  const [conversations, setConversations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
    
    // Listen for conversation deletion events
    const handleConversationDeleted = () => {
      fetchConversations();
    };
    
    window.addEventListener('conversationDeleted', handleConversationDeleted);
    
    return () => {
      window.removeEventListener('conversationDeleted', handleConversationDeleted);
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:8000/conversations');
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const startNewChat = async () => {
    try {
      const response = await fetch('http://localhost:8000/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: null }),
      });
      
      if (response.ok) {
        const newConversation = await response.json();
        navigate(`/chat/${newConversation.id}`);
        fetchConversations();
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  const startEditing = (conversation) => {
    setEditingId(conversation.id);
    setEditValue(conversation.title || `Chat ${conversation.id}`);
  };

  const saveTitle = async (conversationId) => {
    try {
      const response = await fetch(`http://localhost:8000/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editValue }),
      });
      
      if (response.ok) {
        fetchConversations();
        setEditingId(null);
        setEditValue("");
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleKeyDown = (e, conversationId) => {
    if (e.key === 'Enter') {
      saveTitle(conversationId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const deleteConversation = async (e, conversationId) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        const response = await fetch(`http://localhost:8000/conversations/${conversationId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          // Dispatch event to notify chat component
          window.dispatchEvent(new CustomEvent('conversationDeleted'));
          
          // Navigate to home if we're currently in the deleted conversation
          if (window.location.pathname === `/chat/${conversationId}`) {
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Error deleting conversation:', error);
      }
    }
  };

  if (isCollapsed) {
    return (
      <div style={{
        width: 60,
        backgroundColor: "#171717",
        color: "white",
        padding: "10px 5px",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        borderRight: "1px solid #40414f",
        zIndex: 1000,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: "translateX(0)",
        animation: "slideInLeft 0.3s ease-out",
      }}>
        {/* App Logo/Icon */}
        <div style={{
          width: "32px",
          height: "32px",
          backgroundColor: "#3b82f6",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: "bold",
          marginBottom: "20px",
        }}>
          <PsychologyIcon style={{ fontSize: "20px" }} />
        </div>
        
        <button onClick={onToggle} style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "6px",
          marginBottom: "10px",
          transition: "all 0.2s ease",
        }} title="Expand sidebar">
          <ChevronRightIcon style={{ fontSize: "20px" }} />
        </button>
        
        <button onClick={startNewChat} style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "6px",
          marginBottom: "10px",
          transition: "all 0.2s ease",
        }} title="New Chat">
          <EditNoteIcon style={{ fontSize: "20px" }} />
        </button>
        
        <button style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "6px",
          marginBottom: "10px",
          transition: "all 0.2s ease",
        }} title="Search chats">
          <SearchIcon style={{ fontSize: "20px" }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: 250,
      backgroundColor: "#171717",
      color: "white",
      padding: "20px",
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid #40414f",
      zIndex: 1000,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      transform: "translateX(0)",
      animation: "slideInLeft 0.3s ease-out",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px",
      }}>
        {/* App Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <div style={{
            width: "32px",
            height: "32px",
            backgroundColor: "#3b82f6",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <PsychologyIcon style={{ fontSize: "20px" }} />
          </div>
          <span style={{ fontSize: "18px", fontWeight: "600" }}>ManishGPT</span>
        </div>
        
        {/* Collapse Button */}
        <button onClick={onToggle} style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "6px",
          transition: "all 0.2s ease",
        }} title="Collapse sidebar">
          <ChevronLeftIcon style={{ fontSize: "20px" }} />
        </button>
      </div>

      {/* Main Navigation */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginBottom: "30px",
      }}>
        <button onClick={startNewChat} style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "12px 16px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "14px",
          transition: "all 0.2s ease",
          textAlign: "left",
          width: "100%",
        }} onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
           onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}>
          <EditNoteIcon style={{ fontSize: "18px" }} />
          New chat
        </button>
        
        <button style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "12px 16px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "14px",
          transition: "all 0.2s ease",
          textAlign: "left",
          width: "100%",
        }} onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
           onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}>
          <SearchIcon style={{ fontSize: "18px" }} />
          Search chats
        </button>
      </div>

      {/* Conversations List */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        paddingRight: "5px",
      }}>
        {conversations.map((c, index) => (
          <div
            key={c.id}
            style={{
              padding: "12px 16px",
              backgroundColor: "#343541",
              borderRadius: "8px",
              marginBottom: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onClick={() => navigate(`/chat/${c.id}`)}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#343541"}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingId === c.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, c.id)}
                  onBlur={() => saveTitle(c.id)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "white",
                    fontSize: "14px",
                    width: "100%",
                    outline: "none",
                  }}
                  autoFocus
                />
              ) : (
                <span style={{ 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis", 
                  display: "block",
                  fontSize: "14px",
                }}>
                  {c.title || `Chat ${c.id}`}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "4px", marginLeft: "8px", flexShrink: 0 }}>
              <button onClick={(e) => { e.stopPropagation(); startEditing(c); }} style={{
                backgroundColor: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
                transition: "all 0.2s ease",
              }} title="Rename conversation">
                <EditIcon style={{ fontSize: "14px" }} />
              </button>
              <button onClick={(e) => deleteConversation(e, c.id)} style={{
                backgroundColor: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
                transition: "all 0.2s ease",
              }} title="Delete conversation">
                <DeleteIcon style={{ fontSize: "14px" }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
