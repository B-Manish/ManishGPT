import { useState } from "react";
import ReactMarkdown from "react-markdown";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Error fetching response." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        backgroundColor: "#1e1e20",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {messages.length === 0 && (
        <h1 style={{ textAlign: "center", marginTop: "40px", color: "#e3e3e3" }}>
          What's on your mind today?
        </h1>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto",
          paddingBottom: "10px",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: "12px",
              padding: "12px 16px",
              borderRadius: "12px",
              backgroundColor: "#343541",
              color: "white",
              width: "fit-content",
              maxWidth: "90%",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              marginLeft: msg.role === "user" ? "auto" : undefined,
              marginRight: msg.role === "assistant" ? "auto" : undefined,
            }}
          >
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}
        {loading && (
          <div
            style={{
              backgroundColor: "#343541",
              color: "white",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "12px",
              width: "fit-content",
            }}
          >
            Typing...
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          padding: "16px",
          backgroundColor: "#40414f",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto 20px",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
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
      </div>
    </div>
  );
}

export default App;