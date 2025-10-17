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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('userToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/auth/me');
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
  
  getMessages: async (conversationId) => {
    const response = await api.get(`/user/conversations/${conversationId}/messages`);
    return response.data;
  },
};

export default api;
