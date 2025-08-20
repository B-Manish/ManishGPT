import React, { useState } from 'react';
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const YouTubeAgent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/run-youtube-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      
      if (data.error) {
        const errorMsg = { role: "assistant", content: `Error: ${data.error}` };
        setMessages((prev) => [...prev, errorMsg]);
      } else {
        const assistantMsg = { role: "assistant", content: data.response };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      const errorMsg = { role: "assistant", content: "Failed to connect to the API. Make sure the backend is running." };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (code, uniqueId) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(uniqueId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Custom components for ReactMarkdown
  const components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      const uniqueId = `${props.messageIndex}-${props.codeBlockIndex || 0}`;

      if (!inline && match) {
        return (
          <div style={{ position: 'relative' }}>
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: "8px",
                fontSize: "14px",
                lineHeight: "1.4",
                paddingTop: "40px",
              }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
            
            <button
              onClick={() => copyToClipboard(codeString, uniqueId)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: copiedCode === uniqueId ? '#10b981' : '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
            >
              {copiedCode === uniqueId ? 'Copied!' : 'Copy'}
            </button>
          </div>
        );
      }
      return <code className={className} {...props}>{children}</code>;
    },
  };

  return (
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
      {/* Header */}
      <div style={{
        padding: "20px",
        textAlign: "center",
        borderBottom: "1px solid #40414f",
        backgroundColor: "#171717",
      }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem", color: "white" }}>YouTube Agent</h2>
        <p style={{ margin: "8px 0 0 0", color: "#9ca3af", fontSize: "0.9rem" }}>
          Get transcripts and timestamps from YouTube videos using AI
        </p>
      </div>

      {/* Messages Area */}
      <div style={{ 
        width: '100%', 
        minHeight: '100%',
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: "120px",
      }}>
        <div style={{ 
          width: '1000px',
          maxWidth: '1000px',
          flex: 1, 
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: "center",
              color: "#9ca3af",
              marginTop: "100px",
            }}>
              <h3>Welcome to YouTube Agent!</h3>
              <p>Paste a YouTube URL to get started with video analysis.</p>
            </div>
          )}
          
          {messages.map((m, i) => {
            let codeBlockIndex = 0;
            return (
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
              }}>
                <ReactMarkdown 
                  components={{
                    ...components,
                    code: (props) => {
                      const result = components.code({ 
                        ...props, 
                        messageIndex: i,
                        codeBlockIndex: codeBlockIndex++
                      });
                      return result;
                    }
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            );
          })}
          
          {loading && (
            <div style={{ 
              padding: "16px 20px", 
              backgroundColor: "#171717",
              borderRadius: "16px",
              color: "#a0a0a0",
              fontStyle: "italic",
              width: "fit-content",
              alignSelf: "flex-start",
              marginBottom: "16px",
            }}>
              Analyzing video...
            </div>
          )}
        </div>
      </div>

      {/* Fixed Input Bar at Bottom */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
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
            placeholder="Paste a YouTube URL or ask about a video..."
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
            disabled={loading}
            style={{
              backgroundColor: loading ? "#565869" : "#3b82f6",
              border: "none",
              color: "white",
              fontSize: "18px",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = "#2563eb";
                e.target.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = "#3b82f6";
                e.target.style.transform = "scale(1)";
              }
            }}
          >
            {loading ? "⏳" : "➤"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default YouTubeAgent;
