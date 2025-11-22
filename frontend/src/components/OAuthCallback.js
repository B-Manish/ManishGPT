import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Processing...');

  console.log('OAuthCallback component rendered', { error, status });

  useEffect(() => {
    const processCallback = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('No token received');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
        return;
      }

      try {
        setStatus('Authenticating...');
        await handleOAuthCallback(token);
        setStatus('Login successful! Redirecting...');
        
        // Wait a moment to show success message, then navigate
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setError(error.message || 'Failed to complete login');
        setStatus('Login failed');
        setTimeout(() => {
          navigate('/login?error=oauth_failed', { replace: true });
        }, 2000);
      }
    };

    processCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <p style={{ color: '#dc2626', margin: '0 0 20px 0', fontSize: '16px' }}>
            Error: {error}
          </p>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <p style={{ color: '#6b7280', margin: 0 }}>{status}</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OAuthCallback;

