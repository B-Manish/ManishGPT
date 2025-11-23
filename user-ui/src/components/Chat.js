import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PersonIcon from '@mui/icons-material/Person';
import { userAPI } from '../services/api';

function Chat({ isSidebarCollapsed }) {
  const { id } = useParams();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [personaId, setPersonaId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [personaName, setPersonaName] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if id is a persona route or conversation route
  useEffect(() => {
    if (id) {
      const isPersonaRoute = location.pathname.includes('/chat/persona/');

      if (isPersonaRoute || id.startsWith('persona/')) {
        // Extract persona ID from route
        const extractedPersonaId = id.startsWith('persona/') ? id.replace('persona/', '') : id;
        setPersonaId(extractedPersonaId);
        setConversationId(null);
        setMessages([]); // Clear messages for new persona chat
        // Fetch persona name
        fetchPersonaName(extractedPersonaId);
      } else {
        // Regular conversation ID
        setPersonaId(null);
        setConversationId(id);
        userAPI.getMessages(id)
          .then(setMessages)
          .catch(error => console.error('Error fetching messages:', error));
        // Fetch conversation to get persona info
        userAPI.getConversation(id)
          .then(conv => {
            if (conv.persona_id) {
              fetchPersonaName(conv.persona_id);
            }
          })
          .catch(error => console.error('Error fetching conversation:', error));
      }
    } else {
      setPersonaId(null);
      setConversationId(null);
      setPersonaName(null);
      setMessages([]);
    }
  }, [id, location.pathname]);

  const fetchPersonaName = async (personaId) => {
    try {
      const personas = await userAPI.getPersonas();
      const persona = (personas.personas || personas).find(p => p.id === parseInt(personaId));
      if (persona) {
        setPersonaName(persona.name);
      }
    } catch (error) {
      console.error('Error fetching persona name:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // If no conversation ID and no persona ID, show message to select a persona first
    if (!conversationId && !personaId) {
      alert("Please select a persona from the sidebar to start chatting.");
      return;
    }

    let currentConversationId = conversationId;

    // If we have a persona ID but no conversation ID, create the conversation first
    if (personaId && !conversationId) {
      try {
        const newConversation = await userAPI.createConversation(personaId);
        currentConversationId = newConversation.id;
        setConversationId(currentConversationId);
        // Update the URL to the conversation ID
        window.history.replaceState({}, '', `/chat/${currentConversationId}`);
        // Trigger sidebar refresh to show new conversation
        window.dispatchEvent(new Event('conversationCreated'));
      } catch (error) {
        console.error('Error creating conversation:', error);
        alert("Failed to create conversation. Please try again.");
        return;
      }
    }

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setUploadedFiles([]); // Clear uploaded files after sending
    setLoading(true);

    // Add a placeholder for the streaming response
    const assistantMsg = { role: "assistant", content: "", isStreaming: true };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      await userAPI.sendMessageStream(
        currentConversationId,
        {
          content: input,
          file_ids: uploadedFiles.map(file => file.file_id)
        },
        // onChunk - called for each chunk
        (chunk) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant" && lastMessage.isStreaming) {
              // Create a new message object instead of mutating
              newMessages[newMessages.length - 1] = {
                ...lastMessage,
                content: lastMessage.content + chunk
              };
            }
            return newMessages;
          });
        },
        // onComplete - called when streaming is done
        (finalData) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant" && lastMessage.isStreaming) {
              // Create a new message object instead of mutating
              newMessages[newMessages.length - 1] = {
                ...lastMessage,
                content: finalData.content,
                isStreaming: false
              };
            }
            return newMessages;
          });
          setLoading(false);
        },
        // onError - called on error
        (error) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant" && lastMessage.isStreaming) {
              // Create a new message object instead of mutating
              newMessages[newMessages.length - 1] = {
                ...lastMessage,
                content: `Sorry, there was an error: ${error}`,
                isStreaming: false
              };
            }
            return newMessages;
          });
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the user message if sending failed
      setMessages((prev) => prev.slice(0, -2)); // Remove both user and assistant messages

      // Add error message
      const errorMsg = {
        role: "assistant",
        content: "Sorry, there was an error processing your message. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
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

  const copyMessageToClipboard = async (messageContent, messageIndex) => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopiedMessageId(messageIndex);
      setTimeout(() => setCopiedMessageId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy message: ', err);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await userAPI.uploadFile(formData);
      setUploadedFiles(prev => [...prev, response]);
    } catch (error) {
      console.error('File upload failed:', error);
      alert('File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
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
          <div style={{ position: 'relative', margin: "16px 0" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#282c34",
              padding: "8px 16px",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              fontSize: "12px",
              color: "#abb2bf",
              borderBottom: "1px solid rgba(255,255,255,0.1)"
            }}>
              <span>{match[1]}</span>
              <button
                onClick={() => copyToClipboard(codeString, uniqueId)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: copiedCode === uniqueId ? "var(--success)" : "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                }}
              >
                {copiedCode === uniqueId ? <CheckIcon style={{ fontSize: 14 }} /> : <ContentCopyIcon style={{ fontSize: 14 }} />}
                {copiedCode === uniqueId ? "Copied!" : "Copy code"}
              </button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderBottomLeftRadius: "8px",
                borderBottomRightRadius: "8px",
                fontSize: "14px",
                lineHeight: "1.5",
                padding: "16px",
              }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      } else {
        return (
          <code className={className} {...props} style={{
            background: "rgba(255,255,255,0.1)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "0.9em",
            fontFamily: "JetBrains Mono, monospace",
          }}>
            {children}
          </code>
        );
      }
    },
  };

  return (
    <div style={{
      flex: 1,
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Persona Header */}
      {personaName && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          background: "rgba(15, 17, 23, 0.8)",
          backdropFilter: "blur(10px)",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px"
        }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "var(--success)",
            boxShadow: "0 0 8px var(--success)"
          }} />
          <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Chatting with</span>
          <span style={{
            fontSize: "16px",
            fontWeight: "600",
            background: "var(--accent-gradient)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {personaName}
          </span>
        </div>
      )}

      {/* Main Chat Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: personaName ? "80px" : "40px",
        paddingBottom: "140px", // Space for input area
      }}>
        {messages.length === 0 ? (
          // Welcome Screen
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            maxWidth: "800px",
            padding: "0 20px",
            textAlign: "center",
            animation: "fadeIn 0.5s ease-out",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              background: "var(--accent-gradient)",
              borderRadius: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "32px",
              boxShadow: "var(--shadow-glow)",
            }}>
              {personaName ?
                <PersonIcon style={{ fontSize: "48px", color: "white" }} /> :
                <PsychologyIcon style={{ fontSize: "48px", color: "white" }} />
              }
            </div>
            <h1 style={{
              fontSize: "32px",
              fontWeight: "700",
              marginBottom: "16px",
              background: "linear-gradient(to right, #fff, #a5b4fc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              {personaName ? `Hi there! I'm ${personaName}` : "Hi there! How can I help?"}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "16px", maxWidth: "600px", lineHeight: "1.6" }}>
              {personaName ?
                "I'm ready to chat. Ask me anything or share a file to get started." :
                "I'm here to assist you with coding, analysis, writing, and more. Select a persona or start typing to begin."
              }
            </p>
          </div>
        ) : (
          // Messages List
          <div style={{
            width: "100%",
            maxWidth: "900px",
            padding: "0 24px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}>
            {messages.map((m, i) => {
              let codeBlockIndex = 0;
              const isHovered = hoveredMessage === i;
              const isUser = m.role === "user";

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "16px",
                    flexDirection: isUser ? "row-reverse" : "row",
                    alignItems: "flex-start",
                    animation: "fadeIn 0.3s ease-out",
                  }}
                  onMouseEnter={() => setHoveredMessage(i)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  {/* Avatar */}
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    background: isUser ? "var(--bg-tertiary)" : "var(--accent-gradient)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: isUser ? "none" : "var(--shadow-glow)",
                  }}>
                    {isUser ?
                      <PersonIcon style={{ fontSize: "20px", color: "var(--text-secondary)" }} /> :
                      <PsychologyIcon style={{ fontSize: "20px", color: "white" }} />
                    }
                  </div>

                  {/* Message Content */}
                  <div style={{
                    maxWidth: "85%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                      padding: "0 4px",
                    }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                        {isUser ? "You" : "Assistant"}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                        {formatTimestamp(m.timestamp)}
                      </span>
                    </div>

                    <div style={{
                      position: "relative",
                      padding: "12px 16px",
                      borderRadius: "16px",
                      borderTopRightRadius: isUser ? "4px" : "16px",
                      borderTopLeftRadius: isUser ? "16px" : "4px",
                      background: isUser ? "var(--bg-tertiary)" : "rgba(30, 30, 35, 0.6)",
                      border: isUser ? "1px solid var(--border-subtle)" : "1px solid var(--border-highlight)",
                      color: "var(--text-primary)",
                      lineHeight: "1.6",
                      fontSize: "15px",
                      boxShadow: "var(--shadow-sm)",
                    }}>
                      {m.role === "assistant" && m.isStreaming && !m.content ? (
                        <div className="typing-indicator">
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                        </div>
                      ) : (
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
                      )}

                      {/* Copy Button */}
                      {isHovered && !m.isStreaming && (
                        <button
                          onClick={() => copyMessageToClipboard(m.content, i)}
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border-subtle)",
                            color: copiedMessageId === i ? "var(--success)" : "var(--text-secondary)",
                            borderRadius: "6px",
                            padding: "4px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s",
                          }}
                          title="Copy message"
                        >
                          {copiedMessageId === i ? <CheckIcon style={{ fontSize: 14 }} /> : <ContentCopyIcon style={{ fontSize: 14 }} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "24px",
        background: "linear-gradient(to top, var(--bg-primary) 0%, transparent 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 20,
      }}>
        {/* File Preview */}
        {uploadedFiles.length > 0 && (
          <div style={{
            width: "100%",
            maxWidth: "900px",
            marginBottom: "12px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}>
            {uploadedFiles.map((file, index) => (
              <div key={file.file_id} style={{
                background: "var(--bg-tertiary)",
                padding: "6px 12px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                border: "1px solid var(--border-subtle)",
              }}>
                <span>📄</span>
                <span style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.filename}
                </span>
                <button
                  onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{
          width: "100%",
          maxWidth: "900px",
          position: "relative",
          background: "rgba(30, 30, 35, 0.8)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border-highlight)",
          borderRadius: "16px",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "var(--shadow-lg)",
          transition: "border-color 0.2s",
        }}
          onFocus={(e) => e.currentTarget.style.borderColor = "var(--accent-primary)"}
          onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-highlight)"}
        >
          <input
            type="file"
            id="file-upload"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept="image/*,.pdf,.txt,.doc,.docx,.zip,.rar,.js,.css,.html,.py"
          />
          <label
            htmlFor="file-upload"
            style={{
              cursor: isUploading ? "not-allowed" : "pointer",
              padding: "8px",
              borderRadius: "8px",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            className="hover-bg"
            title="Upload file"
          >
            {isUploading ? <div className="spinner" /> : <AttachFileIcon />}
          </label>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "16px",
              outline: "none",
              padding: "8px 0",
            }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() && uploadedFiles.length === 0}
            style={{
              background: (input.trim() || uploadedFiles.length > 0) ? "var(--accent-gradient)" : "var(--bg-tertiary)",
              border: "none",
              color: "white",
              borderRadius: "10px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: (input.trim() || uploadedFiles.length > 0) ? "pointer" : "default",
              opacity: (input.trim() || uploadedFiles.length > 0) ? 1 : 0.5,
              transition: "all 0.2s",
              boxShadow: (input.trim() || uploadedFiles.length > 0) ? "var(--shadow-glow)" : "none",
            }}
          >
            <SendIcon style={{ fontSize: "18px" }} />
          </button>
        </div>
        <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-tertiary)" }}>
          ManishGPT can make mistakes. Consider checking important information.
        </div>
      </div>

      <style>{`
        .hover-bg:hover { background: var(--bg-tertiary); color: var(--text-primary); }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--text-secondary);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default Chat;
