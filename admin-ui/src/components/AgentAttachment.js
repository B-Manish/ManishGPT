import React, { useState, useEffect } from 'react';
import { agentAPI, personaAPI } from '../services/api';

const AgentAttachment = ({ persona, onPersonaUpdate }) => {
  const [availableAgents, setAvailableAgents] = useState([]);
  const [attachedAgents, setAttachedAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAgents();
  }, [persona.id]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const allAgentsData = await agentAPI.getAll();
      
      // Get attached agents from persona.agents
      const attachedAgentIds = persona.agents || [];
      const attached = allAgentsData.filter(agent => attachedAgentIds.includes(agent.id));
      const available = allAgentsData.filter(agent => !attachedAgentIds.includes(agent.id));
      
      setAvailableAgents(available);
      setAttachedAgents(attached);
      setError('');
    } catch (err) {
      setError('Failed to load agents');
      console.error('Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAttachAgent = async (agentId) => {
    try {
      // Add agent to persona's agents list
      const currentAgents = persona.agents || [];
      const updatedAgents = [...currentAgents, agentId];
      
      await personaAPI.update(persona.id, { agents: updatedAgents });
      
      // Update local state
      const updatedPersona = { ...persona, agents: updatedAgents };
      onPersonaUpdate(updatedPersona);
      
      loadAgents(); // Reload to update lists
    } catch (err) {
      setError('Failed to attach agent');
      console.error('Error attaching agent:', err);
    }
  };

  const handleDetachAgent = async (agentId) => {
    try {
      // Remove agent from persona's agents list
      const currentAgents = persona.agents || [];
      const updatedAgents = currentAgents.filter(id => id !== agentId);
      
      await personaAPI.update(persona.id, { agents: updatedAgents });
      
      // Update local state
      const updatedPersona = { ...persona, agents: updatedAgents };
      onPersonaUpdate(updatedPersona);
      
      loadAgents(); // Reload to update lists
    } catch (err) {
      setError('Failed to detach agent');
      console.error('Error detaching agent:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading agents...</div>;
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-900">Agent Attachment</h4>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Attached Agents */}
      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-2">Attached Agents</h5>
        {attachedAgents.length === 0 ? (
          <p className="text-sm text-gray-500">No agents attached to this persona</p>
        ) : (
          <div className="space-y-2">
            {attachedAgents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{agent.name}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    agent.role === 'team_leader' 
                      ? 'bg-purple-100 text-purple-800' 
                      : agent.role === 'specialist'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {agent.role}
                  </span>
                </div>
                <button
                  onClick={() => handleDetachAgent(agent.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Detach
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Agents */}
      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-2">Available Agents</h5>
        {availableAgents.length === 0 ? (
          <p className="text-sm text-gray-500">No available agents to attach</p>
        ) : (
          <div className="space-y-2">
            {availableAgents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded p-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{agent.name}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    agent.role === 'team_leader' 
                      ? 'bg-purple-100 text-purple-800' 
                      : agent.role === 'specialist'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {agent.role}
                  </span>
                  {agent.tools.length > 0 && (
                    <span className="text-xs text-gray-500">
                      Tools: {agent.tools.join(', ')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleAttachAgent(agent.id)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Attach
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentAttachment;
