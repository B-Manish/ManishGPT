import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
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
  }, [id]);

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

  const addReaction = (messageIndex, reaction) => {
    setMessageReactions(prev => {
      const currentReactions = prev[messageIndex] || [];

      // Check if this reaction already exists
      if (currentReactions.includes(reaction)) {
        // Remove the reaction if it already exists
        return {
          ...prev,
          [messageIndex]: currentReactions.filter(r => r !== reaction)
        };
      } else {
        // Add the reaction if it doesn't exist
        return {
          ...prev,
          [messageIndex]: [...currentReactions, reaction]
        };
      }
    });
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
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
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
    (messages.length === 0 || !id) ? <div style={{
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
      {/* Persona Name Header */}
      {personaName && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: "#1e1e20",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px"
        }}>
          <span style={{
            fontSize: "14px",
            color: "#9ca3af",
            fontWeight: "500"
          }}>
            Chatting with:
          </span>
          <span style={{
            fontSize: "16px",
            color: "#8b5cf6",
            fontWeight: "600"
          }}>
            {personaName}
          </span>
        </div>
      )}
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
          gap: "12px",
          alignItems: "center"
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
            }}
          />

          {/* File Upload Button for Welcome Screen */}
          <input
            type="file"
            id="file-upload-welcome"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept="image/*,.pdf,.txt,.doc,.docx,.zip,.rar,.js,.css,.html,.py"
          />
          <label
            htmlFor="file-upload-welcome"
            style={{
              backgroundColor: "#565869",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isUploading ? "not-allowed" : "pointer",
              opacity: isUploading ? 0.6 : 1,
              transition: "all 0.2s ease",
              color: "white",
              fontSize: "18px"
            }}
            title="Upload file"
          >
            {isUploading ? "⏳" : "📎"}
          </label>

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

        {/* File Preview Area for Welcome Screen */}
        {uploadedFiles.length > 0 && (
          <div style={{
            marginTop: "20px",
            width: "90%",
            backgroundColor: "#2d2d30",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap"
            }}>
              {uploadedFiles.map((file, index) => (
                <div key={file.file_id} style={{
                  backgroundColor: "#40414f",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}>
                  <span>📄</span>
                  <span>{file.filename}</span>
                  <button
                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#888",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "2px"
                    }}
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
        scrollbarWidth: "none", // Firefox
        msOverflowStyle: "none", // IE and Edge
      }}>
        {/* Persona Name Header */}
        {personaName && (
          <div style={{
            position: "sticky",
            top: 0,
            backgroundColor: "#1e1e20",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}>
            <span style={{
              fontSize: "14px",
              color: "#9ca3af",
              fontWeight: "500"
            }}>
              Chatting with:
            </span>
            <span style={{
              fontSize: "16px",
              color: "#8b5cf6",
              fontWeight: "600"
            }}>
              {personaName}
            </span>
          </div>
        )}
        <div style={{
          width: '100%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: "120px", // Ensure content doesn't go behind search bar
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
            maxHeight: "calc(100vh - 20px)", // Ensure content area stops above search bar
            overflowY: "auto"
          }}>
            {messages.map((m, i) => {
              let codeBlockIndex = 0; // Track code blocks within this message
              const isHovered = hoveredMessage === i;
              const reactions = messageReactions[i] || [];

              return (
                <div
                  key={i}
                  style={{
                    marginBottom: "16px",
                    marginTop: "0px", // Fixed margin - no more movement
                    padding: "12px 16px",
                    borderRadius: "18px",
                    backgroundColor: m.role === "user" ? "#343541" : "#171717",
                    color: "white",
                    width: "fit-content",
                    maxWidth: "75%",
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    marginLeft: m.role === "user" ? "auto" : undefined,
                    marginRight: m.role === "assistant" ? "auto" : undefined,
                    boxShadow: isHovered ? "0 4px 16px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.15)",
                    transition: "all 0.2s ease",
                    position: "relative",
                    border: isHovered ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                  }}
                  onMouseEnter={() => setHoveredMessage(i)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  {/* Reactions Display (floating above message) */}
                  {reactions.length > 0 && (
                    <div style={{
                      position: "absolute",
                      top: "-35px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex",
                      gap: "4px",
                      flexWrap: "wrap",
                      backgroundColor: "rgba(0,0,0,0.8)",
                      padding: "6px 10px",
                      borderRadius: "12px",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      zIndex: 10,
                      pointerEvents: "auto",
                      minWidth: "fit-content",
                      width: "auto"
                    }}>
                      {reactions.map((reaction, idx) => (
                        <span key={idx} style={{
                          fontSize: "14px",
                          padding: "2px 6px",
                          backgroundColor: "rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.2)"
                        }}>
                          {reaction}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message Header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    opacity: isHovered ? 1 : 0.7,
                    transition: "opacity 0.2s ease"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        fontSize: "12px",
                        fontWeight: "500",
                        color: m.role === "user" ? "#10a37f" : "#8b5cf6"
                      }}>
                        {m.role === "user" ? "You" : "Assistant"}
                      </span>
                      <span style={{
                        fontSize: "11px",
                        color: "#888"
                      }}>
                        {formatTimestamp(m.timestamp)}
                      </span>
                    </div>

                    {/* Copy Button Container - Always reserves space */}
                    <div style={{
                      width: "26px", // Fixed width to prevent jumping
                      height: "22px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {/* Small Copy Button - Only visible on hover */}
                      {isHovered && (
                        <button
                          onClick={() => copyMessageToClipboard(m.content, i)}
                          title={copiedMessageId === i ? "Copied!" : "Copy message"}
                          style={{
                            background: "none",
                            border: "none",
                            color: copiedMessageId === i ? "#10a37f" : "#888",
                            fontSize: "14px",
                            cursor: "pointer",
                            padding: "4px 6px",
                            borderRadius: "4px",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                          onMouseEnter={(e) => {
                            if (copiedMessageId !== i) {
                              e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                              e.target.style.color = "#fff";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (copiedMessageId !== i) {
                              e.target.style.backgroundColor = "transparent";
                              e.target.style.color = "#888";
                            }
                          }}
                        >
                          {copiedMessageId === i ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20,6 9,17 4,12"></polyline>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Message Content */}
                  <div style={{ lineHeight: "1.6" }}>
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
                </div>
              );
            })}
          </div>
        </div>

        {/* File Preview Area */}
        {uploadedFiles.length > 0 && (
          <div style={{
            position: "fixed",
            bottom: "100px",
            left: isSidebarCollapsed ? 90 : 300,
            right: 0,
            backgroundColor: "#2d2d30",
            padding: "16px 20px",
            zIndex: 999,
            display: "flex",
            justifyContent: "center",
            borderTop: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              maxWidth: "1000px",
              width: "100%"
            }}>
              {uploadedFiles.map((file, index) => (
                <div key={file.file_id} style={{
                  backgroundColor: "#40414f",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}>
                  <span>📄</span>
                  <span>{file.filename}</span>
                  <button
                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#888",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "2px"
                    }}
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fixed Input Bar at Bottom */}
        <div style={{
          position: "fixed",
          bottom: 0,
          left: isSidebarCollapsed ? 90 : 300, // Account for sidebar width
          right: 0,
          backgroundColor: "#1e1e20",
          padding: "20px",
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
        }}>
          <div style={{
            display: "flex",
            padding: "12px 16px 12px 24px",
            backgroundColor: "#40414f",
            borderRadius: "24px",
            width: "1000px",
            maxWidth: "1000px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            gap: "12px",
            alignItems: "center",
            border: "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.2s ease"
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask something..."
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: "transparent",
                border: "none",
                color: "white",
                fontSize: "16px",
                outline: "none",
                minHeight: "24px",
                opacity: loading ? 0.6 : 1,
                transition: "opacity 0.2s ease"
              }}
            />

            {/* File Upload Button */}
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
                backgroundColor: "#565869",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isUploading ? "not-allowed" : "pointer",
                opacity: isUploading ? 0.6 : 1,
                transition: "all 0.2s ease",
                color: "white",
                fontSize: "18px"
              }}
              title="Upload file"
            >
              {isUploading ? "⏳" : "📎"}
            </label>

            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                backgroundColor: loading || !input.trim() ? "#565869" : "#10a37f",
                border: "none",
                color: "white",
                fontSize: "18px",
                borderRadius: "50%",
                width: "44px",
                height: "44px",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: loading || !input.trim() ? "none" : "0 2px 8px rgba(16, 163, 127, 0.3)"
              }}
              onMouseEnter={(e) => {
                if (!loading && input.trim()) {
                  e.target.style.backgroundColor = "#0d8a6b";
                  e.target.style.transform = "scale(1.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && input.trim()) {
                  e.target.style.backgroundColor = "#10a37f";
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
}

export default Chat;
