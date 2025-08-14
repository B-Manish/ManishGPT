import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

function Sidebar({ isCollapsed, onToggle }) {
  const [conversations, setConversations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const navigate = useNavigate();

  const fetchConversations = () => {
    fetch("http://localhost:8000/conversations")
      .then((res) => res.json())
      .then(setConversations);
  };

  useEffect(() => {
    fetchConversations();
    
    // Listen for conversation deletions from other components
    const handleConversationDeleted = () => {
      fetchConversations();
    };
    
    window.addEventListener('conversationDeleted', handleConversationDeleted);
    
    return () => {
      window.removeEventListener('conversationDeleted', handleConversationDeleted);
    };
  }, []);

  const startNewChat = async () => {
    const res = await fetch("http://localhost:8000/conversations", {
      method: "POST",
    });
    const data = await res.json();
    navigate(`/chat/${data.id}`);
  };

  const startEditing = (conversation) => {
    setEditingId(conversation.id);
    setEditValue(conversation.title || `Chat ${conversation.id}`);
  };

  const saveTitle = async (conversationId) => {
    try {
      await fetch(`http://localhost:8000/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editValue.trim() || null }),
      });
      
      setEditingId(null);
      setEditValue("");
      fetchConversations();
    } catch (error) {
      console.error("Error updating title:", error);
      alert("Failed to update chat title");
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleKeyDown = (e, conversationId) => {
    if (e.key === "Enter") {
      saveTitle(conversationId);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const deleteConversation = async (e, conversationId) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      try {
        await fetch(`http://localhost:8000/conversations/${conversationId}`, {
          method: "DELETE",
        });
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('conversationDeleted'));
        
        // Refresh the conversations list
        fetchConversations();
        
        // If we're currently in the deleted conversation, navigate to home
        if (window.location.pathname === `/chat/${conversationId}`) {
          navigate("/");
        }
      } catch (error) {
        console.error("Error deleting conversation:", error);
        alert("Failed to delete conversation");
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
        <button 
          onClick={onToggle}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#74c0fc",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "6px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#40414f";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
            e.target.style.transform = "scale(1)";
          }}
          title="Expand sidebar"
        >
          <ChevronRightIcon style={{ fontSize: "20px" }} />
        </button>
        
        <button 
          onClick={startNewChat}
          style={{
            backgroundColor: "#343541",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "6px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#40414f";
            e.target.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#343541";
            e.target.style.transform = "scale(1)";
          }}
          title="New Chat"
        >
          <EditNoteIcon style={{ fontSize: "20px" }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: 250,
      backgroundColor: "#171717",
      color: "white",
      padding: "10px",
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
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
      }}>
        <button onClick={startNewChat} style={{
          flex: 1,
          padding: "10px",
          backgroundColor: "#343541",
          color: "white",
          border: "none",
          marginRight: "10px",
          cursor: "pointer",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "500",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
        onMouseLeave={(e) => e.target.style.backgroundColor = "#343541"}
        >
         <div style={{display:'flex'}}><EditNoteIcon/><div style={{display:'flex',alignItems:'center',marginLeft:'5px'}}>New Chat</div></div>
        </button>
        
        <button 
          onClick={onToggle}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#74c0fc",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#40414f";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
            e.target.style.transform = "scale(1)";
          }}
          title="Collapse sidebar"
        >
          <ChevronLeftIcon style={{ fontSize: "20px" }} />
        </button>
      </div>
      
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
              padding: "10px",
              backgroundColor: "#343541",
              marginBottom: "8px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderRadius: "8px",
              transition: "all 0.2s ease",
              animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
            }}
            onClick={() => navigate(`/chat/${c.id}`)}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#343541"}
          >
            <div style={{ flex: 1, marginRight: "8px", minWidth: 0 }}>
              {editingId === c.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, c.id)}
                  onBlur={() => saveTitle(c.id)}
                  style={{
                    width: "100%",
                    backgroundColor: "#40414f",
                    border: "1px solid #565869",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "14px",
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
                }}>
                  {c.title || `Chat ${c.id}`}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(c);
                }}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#74c0fc",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                title="Rename conversation"
              >
                <EditIcon style={{ fontSize: "16px" }} />
              </button>
              <button
                onClick={(e) => deleteConversation(e, c.id)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#ff6b6b",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#40414f"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                title="Delete conversation"
              >
                <DeleteIcon style={{ fontSize: "16px" }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
