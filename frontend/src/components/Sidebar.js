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
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, conversationId: null });
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
        
        <button onClick={startNewChat} style={{
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
        
        <button style={{
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
        }} title="Search chats">
          <SearchIcon style={{ fontSize: "18px" }} />
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

      {/* Main Navigation */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginBottom: "30px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        minHeight: "80px",
      }}>
        <button onClick={startNewChat} style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "8px 10px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "14px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          textAlign: "left",
          width: "100%",
          overflow: "hidden",
          minHeight: "36px",
        }} onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
           onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}>
          <EditNoteIcon style={{ fontSize: "18px", flexShrink: 0 }} />
          <span style={{
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: 1,
            transform: "translateX(0)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            flexShrink: 0,
          }}>New chat</span>
        </button>
        
        <button style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "8px 10px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "14px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          textAlign: "left",
          width: "100%",
          overflow: "hidden",
          minHeight: "36px",
        }} onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
           onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}>
          <SearchIcon style={{ fontSize: "18px", flexShrink: 0 }} />
          <span style={{
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: 1,
            transform: "translateX(0)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            flexShrink: 0,
          }}>Search chats</span>
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
    </div>
  );
}

export default Sidebar;
