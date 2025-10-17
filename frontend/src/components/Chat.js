import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { userAPI } from '../services/api';

function Chat({ isSidebarCollapsed }) {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (id) {
      userAPI.getMessages(id)
        .then(setMessages)
        .catch(error => console.error('Error fetching messages:', error));
    }
  }, [id]);

  const handleSend = async () => {
    if (!input.trim() || !id) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      await userAPI.sendMessage(id, input);
      
      // TODO: Get AI response from persona
      // For now, add a placeholder response
      const assistantMsg = {
        role: "assistant",
        content: "I received your message! The AI response will be implemented soon.",
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the user message if sending failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  const copyToClipboard = async (code, uniqueId) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(uniqueId);
      setTimeout(() => setCopiedCode(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Custom components for ReactMarkdown
  const components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      // Create unique identifier for each code block
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
                paddingTop: "40px", // Space for copy button
              }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
            
            {/* Copy Button */}
            <button
              onClick={() => copyToClipboard(codeString, uniqueId)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: copiedCode === uniqueId ? '#10b981' : '#40414f',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 10,
              }}
              onMouseEnter={(e) => {
                if (copiedCode !== uniqueId) {
                  e.target.style.backgroundColor = '#565869';
                }
              }}
              onMouseLeave={(e) => {
                if (copiedCode !== uniqueId) {
                  e.target.style.backgroundColor = '#40414f';
                }
              }}
            >
              {copiedCode === uniqueId ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        );
      } else {
        return (
          <code className={className} {...props} style={{
            backgroundColor: "#40414f",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "14px",
            color: "#e3e3e3",
          }}>
            {children}
          </code>
        );
      }
    },
    pre({ children, ...props }) {
      return (
        <pre style={{ margin: 0 }} {...props}>
          {children}
        </pre>
      );
    },
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
          borderRadius: "30px",
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
            {messages.map((m, i) => {
              let codeBlockIndex = 0; // Track code blocks within this message
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
                  // lineHeight: "1.5",
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
