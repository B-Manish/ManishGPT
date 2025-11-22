import React, { useState, useEffect } from 'react';
import { agentAPI, toolAPI, modelsAPI } from '../services/api';
import ModelSelector from './ModelSelector';

const AgentEditModal = ({ agent, isOpen, onClose, onAgentUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    role: 'specialist',
    instructions: '',
    model_provider: 'openai',
    model_id: 'gpt-4o',
    tool_names: []
  });
  const [availableTools, setAvailableTools] = useState([]);
  const [modelOptions, setModelOptions] = useState({ openai: [], groq: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (agent && isOpen) {
      setFormData({
        name: agent.name || '',
        role: agent.role || 'specialist',
        instructions: agent.instructions || '',
        model_provider: agent.model_provider || 'openai',
        model_id: agent.model_id || 'gpt-4o',
        tool_names: agent.tools || []
      });
    }
  }, [agent, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadTools();
      loadModels();
    }
  }, [isOpen]);

  const loadTools = async () => {
    try {
      const toolsData = await toolAPI.getAll();
      setAvailableTools(toolsData);
    } catch (err) {
      console.error('Error loading tools:', err);
    }
  };

  const loadModels = async () => {
    try {
      const response = await modelsAPI.getAll();
      if (response.success) {
        const { data } = response;
        setModelOptions({
          openai: data.openai?.models || [],
          groq: data.groq?.models || []
        });
      }
    } catch (err) {
      console.error('Error loading models:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const agentData = {
        name: formData.name,
        role: formData.role,
        instructions: formData.instructions,
        model_provider: formData.model_provider,
        model_id: formData.model_id,
        tool_names: formData.tool_names  // Send tool_names instead of tools
      };
      
      const updatedAgent = await agentAPI.update(agent.id, agentData);
      onAgentUpdate(updatedAgent);
      onClose();
    } catch (err) {
      setError('Failed to update agent');
      console.error('Error updating agent:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToolChange = (toolName, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        tool_names: [...formData.tool_names, toolName]
      });
    } else {
      setFormData({
        ...formData,
        tool_names: formData.tool_names.filter(name => name !== toolName)
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Edit Agent</h3>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              Model Configuration *
            </label>
            <ModelSelector
              modelProvider={formData.model_provider}
              modelId={formData.model_id}
              onProviderChange={(provider) => {
                // Get the first model for the new provider from API data
                const firstModel = modelOptions[provider]?.[0]?.id;
                setFormData({
                  ...formData, 
                  model_provider: provider,
                  model_id: firstModel || 'gpt-4o'
                });
              }}
              onModelChange={(model) => setFormData({...formData, model_id: model})}
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
                    onChange={(e) => handleToolChange(tool.name, e.target.checked)}
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
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Agent'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentEditModal;
