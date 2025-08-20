import React, { useState } from 'react';
import './YouTubeAgent.css';

const YouTubeAgent = () => {
  const [url, setUrl] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const response = await fetch('http://localhost:8000/run-youtube-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: url }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResponse(data.response);
      }
    } catch (err) {
      setError('Failed to connect to the API. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setUrl('');
    setResponse('');
    setError('');
  };

  return (
    <div className="youtube-agent">
      <h2>YouTube Agent</h2>
      <p className="description">
        Get transcripts and timestamps from YouTube videos using AI
      </p>

      <form onSubmit={handleSubmit} className="url-form">
        <div className="input-group">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
            className="url-input"
            disabled={loading}
          />
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading || !url.trim()}
          >
            {loading ? 'Processing...' : 'Analyze Video'}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div className="response-section">
          <div className="response-header">
            <h3>Video Analysis Result</h3>
            <button onClick={clearAll} className="clear-btn">
              Clear All
            </button>
          </div>
          <div className="response-content">
            {response}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analyzing video... This may take a moment.</p>
        </div>
      )}
    </div>
  );
};

export default YouTubeAgent;
