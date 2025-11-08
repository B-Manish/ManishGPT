import React from 'react';
import ChatbotWidget from './ChatbotWidget';

const ChatPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '48px 16px'
    }}>
      {/* Simple plain page content */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '16px'
        }}>
          Welcome to ManishGPT
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#4b5563',
          marginBottom: '32px'
        }}>
          This is a plain page with a chatbot assistant in the bottom right corner.
        </p>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '32px',
          maxWidth: '672px',
          margin: '0 auto'
        }}>
          <p style={{
            color: '#374151',
            fontSize: '16px',
            lineHeight: '1.6'
          }}>
            Click the chat button in the bottom right corner to start a conversation
            with our multi-agent AI assistant.
          </p>
        </div>
      </div>

      {/* Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
};

export default ChatPage;

