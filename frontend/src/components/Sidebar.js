import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import PsychologyIcon from '@mui/icons-material/Psychology';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';

function Sidebar({ isCollapsed, onToggle }) {
  const [personas, setPersonas] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, conversationId: null });
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchPersonas();
    fetchConversations();
    
    // Listen for conversation deletion events
    const handleConversationDeleted = () => {
      fetchConversations();
    };
    
    // Listen for conversation creation events
    const handleConversationCreated = () => {
      fetchConversations();
    };
    
    window.addEventListener('conversationDeleted', handleConversationDeleted);
    window.addEventListener('conversationCreated', handleConversationCreated);
    
    return () => {
      window.removeEventListener('conversationDeleted', handleConversationDeleted);
      window.removeEventListener('conversationCreated', handleConversationCreated);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.show]);

  const fetchPersonas = async () => {
    try {
      const data = await userAPI.getPersonas();
      setPersonas(data.personas || data);
    } catch (error) {
      console.error('Error fetching personas:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const data = await userAPI.getConversations();
      setConversations(data.conversations || data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const startNewChat = (personaId) => {
    // Navigate to persona route without creating conversation
    // Conversation will be created when first message is sent
    navigate(`/chat/persona/${personaId}`);
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

  const handleContextMenu = (e, conversationId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // For right-click events, use clientX/clientY
    // For left-click events, use getBoundingClientRect to position below the three dots
    let x, y;
    
    if (e.type === 'contextmenu') {
      x = e.clientX;
      y = e.clientY;
    } else {
      // Left-click event - position below the three dots
      const rect = e.target.getBoundingClientRect();
      x = rect.left;
      y = rect.bottom + 5;
    }
    
    setContextMenu({
      show: true,
      x: x,
      y: y,
      conversationId: conversationId
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, conversationId: null });
  };

  const handleRename = () => {
    if (contextMenu.conversationId) {
      const conversation = conversations.find(c => c.id === contextMenu.conversationId);
      if (conversation) {
        startEditing(conversation);
      }
    }
    closeContextMenu();
  };

  const handleDelete = () => {
    if (contextMenu.conversationId) {
      deleteConversation({ stopPropagation: () => {} }, contextMenu.conversationId);
    }
    closeContextMenu();
  };

  if (isCollapsed) {
    return (
      <div style={{
        width: 40,
        backgroundColor: "#171717",
        color: "white",
        padding: "20px 20px",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        borderRight: "1px solid #40414f",
        zIndex: 1000,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: "translateX(0)",
        animation: "slideInLeft 0.3s ease-out",
      }}>
        {/* Expand Button in place of App Logo/Icon */}
        <button onClick={onToggle} style={{
          width: "32px",
          height: "32px",
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "30px",
          transition: "all 0.2s ease",
        }} title="Expand sidebar">
          <ChevronRightIcon style={{ fontSize: "20px" }} />
        </button>
        
        <button onClick={() => personas.length > 0 && startNewChat(personas[0].id)} style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "8px",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
        }} title="New Chat">
          <EditNoteIcon style={{ fontSize: "18px" }} />
        </button>
        
        <button onClick={logout} style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "8px",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
        }} title="Logout">
          <LogoutIcon style={{ fontSize: "18px" }} />
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
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        minHeight: "32px",
      }}>
        {/* App Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          minWidth: "32px",
        }}>
          <div style={{
            width: "32px",
            height: "32px",
            backgroundColor: "#3b82f6",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            flexShrink: 0,
          }}>
            <PsychologyIcon style={{ fontSize: "20px" }} />
          </div>
          <span style={{ 
            fontSize: "18px", 
            fontWeight: "600",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: 1,
            transform: "translateX(0)",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}>ManishGPT</span>
        </div>
        
        {/* Collapse Button */}
        <button onClick={onToggle} style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "6px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          flexShrink: 0,
        }} title="Collapse sidebar">
          <ChevronLeftIcon style={{ fontSize: "20px" }} />
        </button>
      </div>

      {/* User Info */}
      <div style={{
        backgroundColor: "#40414f",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "20px",
        border: "1px solid #565869"
      }}>
        <div style={{
          fontSize: "14px",
          fontWeight: "500",
          color: "white",
          marginBottom: "4px"
        }}>
          {user?.username}
        </div>
        <div style={{
          fontSize: "12px",
          color: "#9ca3af"
        }}>
          {user?.email}
        </div>
      </div>

      {/* Assigned Personas */}
      <div style={{
        marginBottom: "20px"
      }}>
        <div style={{
          fontSize: "12px",
          fontWeight: "500",
          color: "#9ca3af",
          marginBottom: "8px",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          Your AI Personas
        </div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => startNewChat(persona.id)}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                padding: "8px 10px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                transition: "all 0.2s ease",
                textAlign: "left",
                width: "100%",
                overflow: "hidden",
                minHeight: "32px",
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
            >
              <PsychologyIcon style={{ fontSize: "16px", flexShrink: 0 }} />
              <span style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1
              }}>
                {persona.name}
              </span>
            </button>
          ))}
          {personas.length === 0 && (
            <div style={{
              color: "#6b7280",
              fontSize: "12px",
              padding: "8px 10px",
              fontStyle: "italic"
            }}>
              No personas assigned
            </div>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        paddingRight: "5px",
        minHeight: 0, // Ensures flex item can shrink below content size
      }}>
        {conversations.map((c, index) => (
          <div
            key={c.id}
            style={{
              padding: "8px 10px",
              backgroundColor: "transparent",
              borderRadius: "8px",
              marginBottom: "4px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onClick={() => navigate(`/chat/${c.id}`)}
            onContextMenu={(e) => handleContextMenu(e, c.id)}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
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
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              marginLeft: "8px", 
              flexShrink: 0,
              color: "#9ca3af",
              fontSize: "12px",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              transition: "all 0.2s ease",
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, c.id);
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#565869"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
            title="More options">
              ⋯
            </div>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: "#40414f",
            borderRadius: "8px",
            padding: "8px 0",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
            zIndex: 10000,
            minWidth: "160px",
            border: "1px solid #565869",
          }}
          onClick={closeContextMenu}
        >
          <button
            onClick={handleRename}
            style={{
              width: "100%",
              padding: "8px 16px",
              backgroundColor: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              textAlign: "left",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#565869"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            <EditIcon style={{ fontSize: "16px" }} />
            Rename
          </button>
          <button
            onClick={handleDelete}
            style={{
              width: "100%",
              padding: "8px 16px",
              backgroundColor: "transparent",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              textAlign: "left",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#565869"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            <DeleteIcon style={{ fontSize: "16px" }} />
            Delete
          </button>
        </div>
      )}

      {/* Logout Button */}
      <div style={{
        marginTop: "auto",
        paddingTop: "20px",
        paddingBottom: "20px",
        borderTop: "1px solid #40414f",
        flexShrink: 0,
      }}>
        <button
          onClick={logout}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#ef4444",
            cursor: "pointer",
            padding: "8px 10px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "14px",
            transition: "all 0.2s ease",
            textAlign: "left",
            width: "100%",
            overflow: "hidden",
            minHeight: "36px",
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
        >
          <LogoutIcon style={{ fontSize: "18px", flexShrink: 0 }} />
          <span style={{
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: 1,
            transform: "translateX(0)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            flexShrink: 0,
          }}>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
