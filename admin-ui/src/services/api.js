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
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const response = await api.post('/auth/refresh');
        const newToken = response.data.access_token;
        localStorage.setItem('adminToken', newToken);
        
        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('adminToken');
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
  
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
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
    console.log('personaAPI.create called with:', personaData);
    console.log('Data type:', typeof personaData);
    console.log('Data keys:', Object.keys(personaData));
    
    const response = await api.post('/admin/personas', personaData);
    console.log('API response:', response);
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
  
  getPersonaUsers: async (personaId) => {
    const response = await api.get(`/admin/personas/${personaId}/users`);
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

// Models API
export const modelsAPI = {
  getAll: async () => {
    const response = await api.get('/api/models');
    return response.data;
  }
};

// Agent API
export const agentAPI = {
  // Get all agents
  getAll: async () => {
    const response = await api.get('/admin/agents');
    return response.data.agents || []; // Return just the agents array
  },
  
  // Create standalone agent
  create: async (agentData) => {
    const response = await api.post('/admin/agents', agentData);
    return response.data;
  },
  
  // Update agent
  update: async (agentId, agentData) => {
    const response = await api.put(`/admin/agents/${agentId}`, agentData);
    return response.data;
  },
  
  // Get agents for a persona
  getByPersona: async (personaId) => {
    const response = await api.get(`/admin/personas/${personaId}/agents`);
    return response.data.agents || []; // Return just the agents array
  },
  
  // Attach agent to persona
  attachToPersona: async (personaId, agentId) => {
    const response = await api.post(`/admin/personas/${personaId}/attach-agent/${agentId}`);
    return response.data;
  },
  
  // Detach agent from persona
  detachFromPersona: async (personaId, agentId) => {
    const response = await api.post(`/admin/personas/${personaId}/detach-agent/${agentId}`);
    return response.data;
  },
  
  // Get team info for a persona
  getTeamInfo: async (personaId) => {
    const response = await api.get(`/admin/personas/${personaId}/team-info`);
    return response.data;
  },
  
  // Create default team leader
  createTeamLeader: async (personaId) => {
    const response = await api.post(`/admin/personas/${personaId}/create-team-leader`);
    return response.data;
  },
  
  // Delete agent
  delete: async (agentId) => {
    const response = await api.delete(`/admin/agents/${agentId}`);
    return response.data;
  }
};

// Tools API
export const toolAPI = {
  getAll: async () => {
    const response = await api.get('/admin/tools');
    return response.data;
  }
};

export default api;
