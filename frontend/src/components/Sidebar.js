import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Sidebar() {
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8000/conversations")
      .then((res) => res.json())
      .then(setConversations);
  }, []);

  const startNewChat = async () => {
    const res = await fetch("http://localhost:8000/conversations", {
      method: "POST",
    });
    const data = await res.json();
    navigate(`/chat/${data.id}`);
  };

  return (
    <div style={{
      width: 250,
      backgroundColor: "#202123",
      color: "white",
      padding: "10px",
      overflowY: "auto",
    }}>
      <button onClick={startNewChat} style={{
        width: "100%",
        padding: "10px",
        backgroundColor: "#343541",
        color: "white",
        border: "none",
        marginBottom: "20px",
        cursor: "pointer"
      }}>
        + New Chat
      </button>
      {conversations.map((c) => (
        <div
          key={c.id}
          style={{
            padding: "10px",
            backgroundColor: "#343541",
            marginBottom: "10px",
            cursor: "pointer",
          }}
          onClick={() => navigate(`/chat/${c.id}`)}
        >
          {c.title || `Chat ${c.id}`}
        </div>
      ))}
    </div>
  );
}

export default Sidebar;
