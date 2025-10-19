import React, { useState, useEffect } from 'react';
import { agentAPI } from '../services/api';

const PersonaForm = ({ persona, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    model_provider: 'openai',
    model_id: 'gpt-4o',
    agent_ids: []
  });

  const [availableAgents, setAvailableAgents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name || '',
        description: persona.description || '',
        instructions: persona.instructions || '',
        model_provider: persona.model_provider || 'openai',
        model_id: persona.model_id || 'gpt-4o',
        agent_ids: persona.agents || [] // Use agents from persona for new structure
      });
    }
    loadAgents();
  }, [persona]);

  const loadAgents = async () => {
    try {
      const agents = await agentAPI.getAll();
      console.log('Loaded agents:', agents); // Debug log
      // Ensure agents is an array
      if (Array.isArray(agents)) {
        setAvailableAgents(agents);
      } else {
        console.error('Agents data is not an array:', agents);
        setAvailableAgents([]);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      setAvailableAgents([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAgentSelection = (agentId, checked) => {
    console.log('Agent selection changed:', agentId, checked);
    setFormData(prev => {
      const newData = {
        ...prev,
        agent_ids: checked 
          ? [...prev.agent_ids, agentId]
          : prev.agent_ids.filter(id => id !== agentId)
      };
      console.log('New form data:', newData);
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate agents
    if (formData.agent_ids.length === 0) {
      alert('At least one agent must be selected');
      return;
    }

    console.log('Submitting persona data:', formData); // Debug log
    console.log('Agent IDs:', formData.agent_ids);

    setLoading(true);
    try {
      // Map agent_ids to agents for new structure
      const personaData = {
        ...formData,
        agents: formData.agent_ids // Send as agents instead of agent_ids
      };
      
      console.log('Calling onSubmit with:', persona?.id, personaData);
      await onSubmit(persona?.id, personaData);
      console.log('Persona creation successful');
    } catch (error) {
      console.error('Error submitting form:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {persona ? 'Edit Persona' : 'Create New Persona'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Persona Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter persona name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model Provider
                </label>
                <select
                  name="model_provider"
                  value={formData.model_provider}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="groq">Groq</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter persona description"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions *
              </label>
              <textarea
                name="instructions"
                rows="4"
                required
                value={formData.instructions}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter persona instructions"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model ID *
              </label>
              <input
                type="text"
                name="model_id"
                required
                value={formData.model_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., gpt-4o, llama-3.3-70b-versatile"
              />
            </div>

            {/* Agent Selection Section */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Select Agents * (At least one required)
              </h4>
              
              {!Array.isArray(availableAgents) || availableAgents.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No agents available. Please create agents first.</p>
                  <p className="text-sm mt-1">Go to the Agents tab to create agents.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(availableAgents) && availableAgents.map((agent) => (
                    <div key={agent.id} className="border border-gray-200 rounded-lg p-4">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.agent_ids.includes(agent.id)}
                          onChange={(e) => handleAgentSelection(agent.id, e.target.checked)}
                          className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="text-sm font-medium text-gray-900">
                                {agent.name}
                              </h5>
                              <p className="text-sm text-gray-600 mt-1">
                                Role: {agent.role}
                              </p>
                              {agent.instructions && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {agent.instructions.length > 100 
                                    ? `${agent.instructions.substring(0, 100)}...` 
                                    : agent.instructions
                                  }
                                </p>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              ID: {agent.id}
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 text-sm text-gray-600">
                Selected agents: {formData.agent_ids.length}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !Array.isArray(availableAgents) || availableAgents.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
              >
                {loading ? 'Creating...' : (persona ? 'Update Persona' : 'Create Persona')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonaForm;