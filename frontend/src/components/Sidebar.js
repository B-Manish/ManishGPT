import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PsychologyIcon from '@mui/icons-material/Psychology';
import LogoutIcon from '@mui/icons-material/Logout';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';

function Sidebar({ isCollapsed, onToggle }) {
  const [personas, setPersonas] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, conversationId: null });
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchPersonas();
    fetchConversations();

    const handleConversationDeleted = () => fetchConversations();
    const handleConversationCreated = () => fetchConversations();

    window.addEventListener('conversationDeleted', handleConversationDeleted);
    window.addEventListener('conversationCreated', handleConversationCreated);

    return () => {
      window.removeEventListener('conversationDeleted', handleConversationDeleted);
      window.removeEventListener('conversationCreated', handleConversationCreated);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) closeContextMenu();
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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
        headers: { 'Content-Type': 'application/json' },
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
    if (e.key === 'Enter') saveTitle(conversationId);
    else if (e.key === 'Escape') cancelEditing();
  };

  const deleteConversation = async (e, conversationId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        const response = await fetch(`http://localhost:8000/conversations/${conversationId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          window.dispatchEvent(new CustomEvent('conversationDeleted'));
          if (location.pathname === `/chat/${conversationId}`) {
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

    let x, y;
    if (e.type === 'contextmenu') {
      x = e.clientX;
      y = e.clientY;
    } else {
      const rect = e.target.getBoundingClientRect();
      x = rect.left;
      y = rect.bottom + 5;
    }

    setContextMenu({ show: true, x, y, conversationId });
  };

  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, conversationId: null });
  };

  const handleRename = () => {
    if (contextMenu.conversationId) {
      const conversation = conversations.find(c => c.id === contextMenu.conversationId);
      if (conversation) startEditing(conversation);
    }
    closeContextMenu();
  };

  const handleDelete = () => {
    if (contextMenu.conversationId) {
      deleteConversation({ stopPropagation: () => { } }, contextMenu.conversationId);
    }
    closeContextMenu();
  };

  // Collapsed View
  if (isCollapsed) {
    return (
      <div style={{
        width: 70,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 0",
        zIndex: 1000,
        transition: "var(--transition-normal)",
      }}>
        <button onClick={onToggle} style={{
          width: "40px",
          height: "40px",
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "30px",
          transition: "var(--transition-fast)",
        }} className="hover-scale">
          <ChevronRightIcon />
        </button>

        <button onClick={() => personas.length > 0 && startNewChat(personas[0].id)} style={{
          background: "var(--accent-gradient)",
          border: "none",
          color: "white",
          cursor: "pointer",
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-glow)",
        }} title="New Chat">
          <EditNoteIcon />
        </button>

        <div style={{ flex: 1 }} />

        <button onClick={logout} style={{
          background: "transparent",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "var(--transition-fast)",
        }} title="Logout">
          <LogoutIcon />
        </button>
      </div>
    );
  }

  // Expanded View
  return (
    <div style={{
      width: 280,
      background: "rgba(15, 17, 23, 0.95)",
      backdropFilter: "blur(20px)",
      borderRight: "1px solid var(--border-subtle)",
      color: "var(--text-primary)",
      padding: "24px",
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      display: "flex",
      flexDirection: "column",
      zIndex: 1000,
      transition: "var(--transition-normal)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "32px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            background: "var(--accent-gradient)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-glow)",
          }}>
            <PsychologyIcon style={{ color: "white", fontSize: "22px" }} />
          </div>
          <span style={{
            fontSize: "20px",
            fontWeight: "700",
            letterSpacing: "-0.5px",
            background: "linear-gradient(to right, #fff, #a5b4fc)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>ManishGPT</span>
        </div>

        <button onClick={onToggle} style={{
          background: "transparent",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }} className="hover:bg-white/5">
          <ChevronLeftIcon />
        </button>
      </div>

      {/* User Profile Card */}
      <div style={{
        background: "var(--bg-tertiary)",
        borderRadius: "12px",
        padding: "12px 16px",
        marginBottom: "24px",
        border: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          fontWeight: "600",
          color: "white",
        }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.username}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.email}
          </div>
        </div>
      </div>

      {/* Personas Section */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{
          fontSize: "11px",
          fontWeight: "600",
          color: "var(--text-tertiary)",
          marginBottom: "12px",
          textTransform: "uppercase",
          letterSpacing: "1px",
          paddingLeft: "8px",
        }}>
          AI Personas
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => startNewChat(persona.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "10px 12px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                fontWeight: "500",
                transition: "var(--transition-fast)",
                width: "100%",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <PsychologyIcon style={{ fontSize: "18px" }} />
              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {persona.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div style={{
        fontSize: "11px",
        fontWeight: "600",
        color: "var(--text-tertiary)",
        marginBottom: "12px",
        textTransform: "uppercase",
        letterSpacing: "1px",
        paddingLeft: "8px",
      }}>
        Recent Chats
      </div>
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        marginRight: "-8px",
        paddingRight: "8px",
      }}>
        {conversations.map((c, index) => {
          const isActive = location.pathname === `/chat/${c.id}`;
          return (
            <div
              key={c.id}
              style={{
                padding: "10px 12px",
                background: isActive ? "var(--bg-tertiary)" : "transparent",
                borderRadius: "8px",
                marginBottom: "4px",
                cursor: "pointer",
                transition: "var(--transition-fast)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: isActive ? "1px solid var(--border-subtle)" : "1px solid transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              }}
              onClick={() => navigate(`/chat/${c.id}`)}
              onContextMenu={(e) => handleContextMenu(e, c.id)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                <ChatBubbleOutlineIcon style={{ fontSize: "16px", opacity: 0.7 }} />
                {editingId === c.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, c.id)}
                    onBlur={() => saveTitle(c.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "white",
                      fontSize: "14px",
                      width: "100%",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: "14px",
                    fontWeight: isActive ? "500" : "400",
                  }}>
                    {c.title || `Chat ${c.id}`}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  opacity: 0,
                  transition: "opacity 0.2s",
                  marginLeft: "4px"
                }}
                className="group-hover-visible"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e, c.id);
                }}
              >
                <MoreHorizIcon style={{ fontSize: "16px" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "var(--bg-secondary)",
            borderRadius: "12px",
            padding: "6px",
            boxShadow: "var(--shadow-lg)",
            zIndex: 10000,
            minWidth: "160px",
            border: "1px solid var(--border-highlight)",
            animation: "fadeIn 0.1s ease-out",
          }}
          onClick={closeContextMenu}
        >
          <button
            onClick={handleRename}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px",
              textAlign: "left",
              borderRadius: "6px",
            }}
            onMouseEnter={(e) => e.target.style.background = "var(--bg-tertiary)"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
          >
            <EditIcon style={{ fontSize: "16px" }} />
            Rename
          </button>
          <button
            onClick={handleDelete}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              color: "var(--danger)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px",
              textAlign: "left",
              borderRadius: "6px",
            }}
            onMouseEnter={(e) => e.target.style.background = "rgba(218, 54, 51, 0.1)"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
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
        borderTop: "1px solid var(--border-subtle)",
      }}>
        <button
          onClick={logout}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--danger)",
            cursor: "pointer",
            padding: "10px 12px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: "500",
            width: "100%",
            transition: "var(--transition-fast)",
          }}
          onMouseEnter={(e) => e.target.style.background = "rgba(218, 54, 51, 0.1)"}
          onMouseLeave={(e) => e.target.style.background = "transparent"}
        >
          <LogoutIcon style={{ fontSize: "18px" }} />
          Logout
        </button>
      </div>

      <style>{`
        .group-hover-visible { opacity: 0; }
        div:hover > .group-hover-visible { opacity: 1; }
      `}</style>
    </div>
  );
}

export default Sidebar;
