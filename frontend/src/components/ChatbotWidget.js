import React, { useState, useEffect, useRef } from 'react';
import { userAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Load user personas
    loadPersonas();
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadPersonas = async () => {
    try {
      const data = await userAPI.getPersonas();
      setPersonas(data.personas || []);
      // Don't auto-select - let user choose
    } catch (error) {
      console.error('Error loading personas:', error);
    }
  };

  const createOrGetConversation = async () => {
    if (!selectedPersona) {
      alert('Please select a persona first');
      return null;
    }

    if (conversationId) {
      return conversationId;
    }

    try {
      const conversation = await userAPI.createConversation(selectedPersona.id);
      setConversationId(conversation.id);
      // Load existing messages if any
      loadMessages(conversation.id);
      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Failed to create conversation. Please try again.');
      return null;
    }
  };

  const loadMessages = async (convId) => {
    try {
      const data = await userAPI.getMessages(convId);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const convId = await createOrGetConversation();
    if (!convId) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Add placeholder for assistant response
    const assistantMsg = { role: 'assistant', content: '', isStreaming: true };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      await userAPI.sendMessageStream(
        convId,
        { content: userMessage.content, file_ids: [] },
        // onChunk
        (chunk) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
              newMessages[newMessages.length - 1] = {
                ...lastMessage,
                content: lastMessage.content + chunk,
              };
            }
            return newMessages;
          });
        },
        // onComplete
        (finalData) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
              newMessages[newMessages.length - 1] = {
                ...lastMessage,
                content: finalData.content || lastMessage.content,
                isStreaming: false,
              };
            }
            return newMessages;
          });
          setLoading(false);
        },
        // onError
        (error) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
              newMessages[newMessages.length - 1] = {
                ...lastMessage,
                content: `Sorry, there was an error: ${error}`,
                isStreaming: false,
              };
            }
            return newMessages;
          });
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setLoading(false);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
          newMessages[newMessages.length - 1] = {
            ...lastMessage,
            content: 'Sorry, there was an error sending your message.',
            isStreaming: false,
          };
        }
        return newMessages;
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggle = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && conversationId) {
      // Load messages when opening
      loadMessages(conversationId);
    }
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000
    }}>
      {/* Chat Window */}
      {isOpen && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          width: '384px',
          height: '600px',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '8px',
          border: '1px solid #e5e7eb'
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#4f46e5',
            color: 'white',
            padding: '16px',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: '16px' }}>Chat Assistant</h3>
              {selectedPersona && (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#c7d2fe' }}>
                  {selectedPersona.name}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleNewChat}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                title="New Chat"
              >
                🆕
              </button>
              <button
                onClick={handleToggle}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '24px',
                  lineHeight: '1'
                }}
                onMouseOver={(e) => e.target.style.opacity = '0.8'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                ×
              </button>
            </div>
          </div>

          {/* Persona Selector - Compact dropdown */}
          {personas.length > 0 && (
            <div style={{ 
              padding: '10px 12px', 
              backgroundColor: selectedPersona ? '#f0f9ff' : '#fffbeb', 
              borderBottom: '1px solid #e5e7eb',
              borderTop: selectedPersona ? '1px solid #3b82f6' : '1px solid #f59e0b',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>
                  {selectedPersona ? '🤖' : '⚠️'}
                </span>
                <select
                  value={selectedPersona?.id || ''}
                  onChange={(e) => {
                    const personaId = e.target.value;
                    if (personaId) {
                      const persona = personas.find((p) => p.id === parseInt(personaId));
                      setSelectedPersona(persona);
                      setConversationId(null);
                      setMessages([]);
                    } else {
                      setSelectedPersona(null);
                      setConversationId(null);
                      setMessages([]);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 32px 8px 10px',
                    border: selectedPersona ? '1.5px solid #3b82f6' : '1.5px solid #f59e0b',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontWeight: selectedPersona ? '500' : '600',
                    color: selectedPersona ? '#1e40af' : '#92400e',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23334155' d='M5 7.5L1.5 4h7z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    backgroundSize: '10px',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedPersona ? '0 1px 2px rgba(59, 130, 246, 0.1)' : '0 1px 2px rgba(245, 158, 11, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = selectedPersona 
                      ? '0 2px 4px rgba(59, 130, 246, 0.15)' 
                      : '0 2px 4px rgba(245, 158, 11, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = selectedPersona 
                      ? '0 1px 2px rgba(59, 130, 246, 0.1)' 
                      : '0 1px 2px rgba(245, 158, 11, 0.1)';
                  }}
                  onFocus={(e) => {
                    e.target.style.outline = 'none';
                    e.target.style.borderColor = selectedPersona ? '#2563eb' : '#d97706';
                    e.target.style.boxShadow = selectedPersona 
                      ? '0 0 0 2px rgba(59, 130, 246, 0.1)' 
                      : '0 0 0 2px rgba(245, 158, 11, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = selectedPersona ? '#3b82f6' : '#f59e0b';
                    e.target.style.boxShadow = selectedPersona 
                      ? '0 1px 2px rgba(59, 130, 246, 0.1)' 
                      : '0 1px 2px rgba(245, 158, 11, 0.1)';
                  }}
                >
                  <option value="" style={{ fontWeight: '500', color: '#6b7280' }}>
                    {selectedPersona ? 'Change...' : 'Select persona...'}
                  </option>
                  {personas.map((persona) => (
                    <option key={persona.id} value={persona.id} style={{ fontWeight: '500', color: '#1f2937' }}>
                      {persona.name}
                    </option>
                  ))}
                </select>
                {selectedPersona && (
                  <span style={{
                    fontSize: '14px',
                    color: '#10b981',
                    flexShrink: 0
                  }} title="Active">
                    ✓
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '32px' }}>
                <p>Start a conversation!</p>
                {!selectedPersona && (
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>Please select a persona above.</p>
                )}
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      borderRadius: '8px',
                      padding: '12px',
                      backgroundColor: message.role === 'user' ? '#4f46e5' : '#f3f4f6',
                      color: message.role === 'user' ? 'white' : '#1f2937'
                    }}
                  >
                    {message.role === 'assistant' ? (
                      <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                        {message.isStreaming && (
                          <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '16px',
                            backgroundColor: '#9ca3af',
                            marginLeft: '4px',
                            animation: 'blink 1s infinite'
                          }} />
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading || !selectedPersona}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim() || !selectedPersona}
                style={{
                  backgroundColor: loading || !input.trim() || !selectedPersona ? '#d1d5db' : '#4f46e5',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: loading || !input.trim() || !selectedPersona ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={(e) => {
                  if (!loading && input.trim() && selectedPersona) {
                    e.target.style.backgroundColor = '#4338ca';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && input.trim() && selectedPersona) {
                    e.target.style.backgroundColor = '#4f46e5';
                  }
                }}
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        style={{
          backgroundColor: '#4f46e5',
          color: 'white',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = '#4338ca';
          e.target.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = '#4f46e5';
          e.target.style.transform = 'scale(1)';
        }}
        title={isOpen ? 'Close Chat' : 'Open Chat'}
      >
        {isOpen ? '×' : '💬'}
      </button>

      {/* Blink animation for streaming indicator */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default ChatbotWidget;

