import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

function Chat() {
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
      justifyContent: 'center'
    }}>
      <div style={{ width: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
        alignItems: 'center'
      }}>
        <div style={{ width: '900px' }}>
          <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                marginBottom: "12px",
                padding: "12px 16px",
                borderRadius: "12px",
                backgroundColor: m.role === "user" ? "#343541" : "#171717",
                color: "white",
                width: "fit-content",
                maxWidth: "80%",
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                marginLeft: m.role === "user" ? "auto" : undefined,
                marginRight: m.role === "assistant" ? "auto" : undefined,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}>
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ))}
            {loading && <div style={{ 
              padding: "12px 16px", 
              backgroundColor: "#171717",
              borderRadius: "12px",
              color: "#a0a0a0",
              fontStyle: "italic"
            }}>Typing...</div>}
          </div>

          <div style={{
            display: "flex",
            padding: 16,
            backgroundColor: "#40414f",
            borderRadius: "12px",
            margin: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
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
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#565869"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#40414f"}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
  );
}

export default Chat;
