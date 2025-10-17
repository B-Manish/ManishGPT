import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
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

// Persona API
export const personaAPI = {
  getAll: async () => {
    const response = await api.get('/admin/personas');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/admin/personas/${id}`);
    return response.data;
  },
  
  create: async (personaData) => {
    const response = await api.post('/admin/personas', personaData);
    return response.data;
  },
  
  update: async (id, personaData) => {
    const response = await api.put(`/admin/personas/${id}`, personaData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/admin/personas/${id}`);
    return response.data;
  },
  
  activate: async (id) => {
    const response = await api.post(`/admin/personas/${id}/activate`);
    return response.data;
  },
  
  getUsers: async (id) => {
    const response = await api.get(`/admin/personas/${id}/users`);
    return response.data;
  },
};

// User API
export const userAPI = {
  getAll: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  
  create: async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },
  
  updateRole: async (id, role) => {
    const response = await api.put(`/admin/users/${id}/role`, null, {
      params: { new_role: role }
    });
    return response.data;
  },
  
  activate: async (id) => {
    const response = await api.post(`/admin/users/${id}/activate`);
    return response.data;
  },
  
  deactivate: async (id) => {
    const response = await api.post(`/admin/users/${id}/deactivate`);
    return response.data;
  },
  
  getPersonas: async (id) => {
    const response = await api.get(`/admin/users/${id}/personas`);
    return response.data;
  },
  
  assignPersona: async (userId, personaId) => {
    const response = await api.post(`/admin/users/${userId}/assign-persona`, {
      user_id: userId,
      persona_id: personaId
    });
    return response.data;
  },
  
  removePersona: async (userId, personaId) => {
    const response = await api.delete(`/admin/users/${userId}/personas/${personaId}`);
    return response.data;
  },
};

// User Role API
export const userRoleAPI = {
  getAll: async () => {
    const response = await api.get('/admin/user-roles');
    return response.data;
  },
};

export default api;
