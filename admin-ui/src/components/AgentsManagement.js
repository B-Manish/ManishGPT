import React, { useState, useEffect } from 'react';
import { agentAPI, personaAPI, toolAPI } from '../services/api';

const AgentsManagement = () => {
  const [agents, setAgents] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'specialist',
    instructions: '',
    model_provider: 'openai',
    model_id: 'gpt-4o',
    persona_id: '',
    tool_names: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsData, personasData, toolsData] = await Promise.all([
        agentAPI.getAll(),
        personaAPI.getAll(),
        toolAPI.getAll()
      ]);
      
      setAgents(agentsData || []);
      setPersonas(personasData);
      setAvailableTools(toolsData);
      setError('');
    } catch (err) {
      setError('Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      await agentAPI.create(formData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        role: 'specialist',
        instructions: '',
        model_provider: 'openai',
        model_id: 'gpt-4o',
        persona_id: '',
        tool_names: []
      });
      loadData();
    } catch (err) {
      setError('Failed to create agent');
      console.error('Error creating agent:', err);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) {
      return;
    }
    
    try {
      await agentAPI.delete(agentId);
      loadData();
    } catch (err) {
      setError('Failed to delete agent');
      console.error('Error deleting agent:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading agents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Agents Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Create Agent
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Agents List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {agents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No agents found. Create your first agent!
            </div>
          ) : (
            <div className="space-y-4">
              {agents.map((agent) => (
                <div key={agent.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          agent.role === 'team_leader' 
                            ? 'bg-purple-100 text-purple-800' 
                            : agent.role === 'specialist'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {agent.role}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          agent.persona_id 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {agent.persona_id ? 'Attached' : 'Available'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{agent.instructions}</p>
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Model:</span> {agent.model_provider}/{agent.model_id}
                        {agent.tools.length > 0 && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="font-medium">Tools:</span> {agent.tools.join(', ')}
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Agent Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Agent</h3>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="team_leader">Team Leader</option>
                  <option value="specialist">Specialist</option>
                  <option value="assistant">Assistant</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="3"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tools
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableTools.map((tool) => (
                    <label key={tool.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.tool_names.includes(tool.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              tool_names: [...formData.tool_names, tool.name]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              tool_names: formData.tool_names.filter(name => name !== tool.name)
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{tool.name} - {tool.description}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
                >
                  Create Agent
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentsManagement;
