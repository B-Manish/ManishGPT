import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refresh')) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const response = await api.post('/auth/refresh');
        const newToken = response.data.access_token;
        localStorage.setItem('userToken', newToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('userToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  getGoogleAuthUrl: async () => {
    const response = await api.get('/auth/google/login');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
};

// User API
export const userAPI = {
  getPersonas: async () => {
    const response = await api.get('/user/personas');
    return response.data;
  },

  getConversations: async () => {
    const response = await api.get('/user/conversations');
    return response.data;
  },

  createConversation: async (personaId) => {
    const response = await api.post('/user/conversations', { persona_id: personaId });
    return response.data;
  },

  getConversation: async (conversationId) => {
    const response = await api.get(`/user/conversations/${conversationId}`);
    return response.data;
  },

  sendMessage: async (conversationId, message) => {
    const response = await api.post(`/user/conversations/${conversationId}/messages`, {
      content: message
    });
    return response.data;
  },

  sendMessageStream: async (conversationId, messageData, onChunk, onComplete, onError) => {
    const token = localStorage.getItem('userToken');

    try {
      const response = await fetch(`http://localhost:8000/user/conversations/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'user_message':
                  // User message sent
                  break;
                case 'chunk':
                  onChunk(data.data);
                  break;
                case 'complete':
                  onComplete(data.data);
                  break;
                case 'error':
                  onError(data.data);
                  break;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      onError(error.message);
    }
  },

  getMessages: async (conversationId) => {
    const response = await api.get(`/user/conversations/${conversationId}/messages`);
    return response.data;
  },

  // File upload methods
  uploadFile: async (formData) => {
    const token = localStorage.getItem('userToken');
    const response = await fetch(`${API_BASE_URL}/user/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  },

  downloadFile: async (fileId) => {
    const token = localStorage.getItem('userToken');
    const response = await fetch(`${API_BASE_URL}/user/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    return response.json();
  },

  deleteFile: async (fileId) => {
    const response = await api.delete(`/user/files/${fileId}`);
    return response.data;
  },
};

export default api;
