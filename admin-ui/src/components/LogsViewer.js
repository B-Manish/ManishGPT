import React, { useState, useEffect } from 'react';
import './LogsViewer.css';

const LogsViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [logsPerPage] = useState(20);

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * logsPerPage;
      const response = await fetch(`http://localhost:8000/api/logs?skip=${skip}&limit=${logsPerPage}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await response.json();
      setLogs(data.logs);
      setTotalCount(data.total_count);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateLog = (log, maxLength = 200) => {
    if (log.length <= maxLength) return log;
    return log.substring(0, maxLength) + '...';
  };

  const handleLogClick = (log) => {
    setSelectedLog(log);
  };

  const closeModal = () => {
    setSelectedLog(null);
  };

  const totalPages = Math.ceil(totalCount / logsPerPage);

  if (loading) {
    return (
      <div className="logs-viewer">
        <div className="loading">Loading logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="logs-viewer">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="logs-viewer">
      <div className="logs-header">
        <h2>Conversation Logs</h2>
        <div className="logs-stats">
          Total Logs: {totalCount}
        </div>
      </div>

      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Conversation ID</th>
              <th>Persona ID</th>
              <th>Message ID</th>
              <th>Log Preview</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>{log.conversation_id}</td>
                <td>{log.persona_id}</td>
                <td>{log.message_id}</td>
                <td className="log-preview">
                  {truncateLog(log.raw_log)}
                </td>
                <td>{formatDate(log.created_at)}</td>
                <td>
                  <button 
                    className="view-log-btn"
                    onClick={() => handleLogClick(log)}
                  >
                    View Full Log
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        
        <span className="page-info">
          Page {currentPage} of {totalPages}
        </span>
        
        <button 
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      {/* Drawer for full log view */}
      {selectedLog && (
        <div className="drawer-overlay open" onClick={closeModal}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Full Log Details</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            
            <div className="drawer-body">
              <div className="log-content">
                <div className="log-text-container">
                  <pre className="log-text">{selectedLog.raw_log}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsViewer;
