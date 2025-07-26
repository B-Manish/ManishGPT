import { useState } from "react";
import "./App.css";
import ReactMarkdown from 'react-markdown';

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

    <div className={`app ${messages.length === 0 ? "center" : "bottom"}`}>

      {messages.length === 0 && (
        <h1 className="headline">What's on your mind today?</h1>
      )}

      <div className="chat-history">
        {messages.map((msg, idx) => (
          // <div key={idx} className={`message ${msg.role}`}>
          //    <strong>{msg.role === "user" ? "You" : "Bot"}:</strong> {msg.content}
          // </div>
          <div key={idx} className={`message ${msg.role}`} style={{ padding: '20px' }}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}
        {loading && <div className="message assistant">Typing...</div>}
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
        />
        <button onClick={handleSend}>➤</button>
      </div>
    </div>
  );
}

export default App;