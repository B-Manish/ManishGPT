import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

function Chat({ isSidebarCollapsed }) {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8000/conversations/${id}/messages`)
      .then((res) => res.json())
      .then(setMessages);
  }, [id]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    await fetch(`http://localhost:8000/conversations/${id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userMsg),
    });

    const res = await fetch("http://localhost:8000/run-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });

    const data = await res.json();

    const assistantMsg = {
      role: "assistant",
      content: data.response,
    };

    await fetch(`http://localhost:8000/conversations/${id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assistantMsg),
    });

    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    messages.length === 0 ? <div style={{
      backgroundColor: '#1e1e20',
      color: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      height: "100vh",
      position: "relative",
    }}>
      <div style={{ 
        width: '1000px', 
        maxWidth: '1000px',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center' 
      }}>
        <div style={{ fontSize: '28px', marginBottom: '25px' }}>Where should we begin?</div>
        <div style={{
          display: "flex",
          padding: 16,
          backgroundColor: "#40414f",
          borderRadius: "12px",
          width: '90%',
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something..."
            style={{
              flex: 1,
              backgroundColor: "#40414f",
              border: "none",
              color: "white",
              fontSize: "16px",
              outline: "none",
            }}
          />
          <button
            onClick={handleSend}
            style={{
              backgroundColor: "#40414f",
              border: "none",
              color: "white",
              fontSize: "18px",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              cursor: "pointer",
            }}
          >
            ➤
          </button>
        </div></div>
    </div> :
      <div style={{
        flex: 1,
        backgroundColor: '#1e1e20',
        color: "white",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "relative",
        overflowY: "auto",
      }}>
        <div style={{ 
          width: '100%', 
          minHeight: '100%',
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: "120px", // Space for the fixed input bar
        }}>
          {/* Content Area - No internal scrolling */}
          <div style={{ 
            width: '1000px',
            maxWidth: '1000px',
            flex: 1, 
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                marginBottom: "16px",
                padding: "4px 12px 10px 12px",
                borderRadius: "16px",
                backgroundColor: m.role === "user" ? "#343541" : "#171717",
                color: "white",
                width: "fit-content",
                maxWidth: "75%",
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                marginLeft: m.role === "user" ? "auto" : undefined,
                marginRight: m.role === "assistant" ? "auto" : undefined,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                // lineHeight: "1.5",
              }}>
                <ReactMarkdown>{m.content}</ReactMarkdown>
                
              </div>
            ))}
            {loading && <div style={{ 
              padding: "16px 20px", 
              backgroundColor: "#171717",
              borderRadius: "16px",
              color: "#a0a0a0",
              fontStyle: "italic",
              width: "fit-content",
              alignSelf: "flex-start",
              marginBottom: "16px",
            }}>Typing...</div>}
          </div>
        </div>

        {/* Fixed Input Bar at Bottom */}
        <div style={{
          position: "fixed",
          bottom: 0,
          left: isSidebarCollapsed ? 85 : 275, // Account for sidebar width
          right: 0,
          backgroundColor: "#1e1e20",
          padding: "20px",
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
        }}>
          <div style={{
            display: "flex",
            padding: "8px 10px 8px 20px",
            backgroundColor: "#40414f",
            borderRadius: "30px",
            width: "1000px",
            maxWidth: "1000px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            gap: "12px",
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask something..."
              style={{
                flex: 1,
                backgroundColor: "transparent",
                border: "none",
                color: "white",
                fontSize: "16px",
                outline: "none",
                minHeight: "24px",
              }}
            />
            <button
              onClick={handleSend}
              style={{
                backgroundColor: "#565869",
                border: "none",
                color: "white",
                fontSize: "18px",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#6b7280";
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#565869";
                e.target.style.transform = "scale(1)";
              }}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
  );
}

export default Chat;
