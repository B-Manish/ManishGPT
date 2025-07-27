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

      backgroundColor: '#212121',
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
        backgroundColor: '#212121',
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: 'center'
      }}>
        <div style={{ width: '900px', border: '1px solid red' }}>

          <div style={{ flex: 1, padding: 20, overflowY: "None" }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                marginBottom: "12px",
                padding: "4px 16px",
                borderRadius: "12px",
                backgroundColor: "#171717",
                width: "fit-content",
                maxWidth: "80%",
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                marginLeft: m.role === "user" ? "auto" : undefined,
                marginRight: m.role === "assistant" ? "auto" : undefined,
              }}>
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ))}
            {loading && <div style={{ padding: 10 }}>Typing...</div>}
          </div>

          <div style={{
            display: "flex",
            padding: 16,
            backgroundColor: "#40414f",
            borderRadius: "12px",
            margin: "10px",
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
          </div>
        </div>
      </div>
  );
}

export default Chat;
