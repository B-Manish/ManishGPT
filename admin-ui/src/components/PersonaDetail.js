import React, { useState, useEffect } from 'react';
import { personaAPI, agentAPI, userAPI } from '../services/api';
import AgentAttachment from './AgentAttachment';
import UserAssignment from './UserAssignment';

const PersonaDetail = ({ persona, onClose, onPersonaUpdate }) => {
  const [personaData, setPersonaData] = useState(persona);
  const [activeSection, setActiveSection] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: persona.name,
    description: persona.description,
    instructions: persona.instructions,
    model_provider: persona.model_provider,
    model_id: persona.model_id
  });

  useEffect(() => {
    setPersonaData(persona);
    setFormData({
      name: persona.name,
      description: persona.description,
      instructions: persona.instructions,
      model_provider: persona.model_provider,
      model_id: persona.model_id
    });
  }, [persona]);

  const handleSave = async () => {
    try {
      const updatedPersona = await personaAPI.update(persona.id, formData);
      setPersonaData(updatedPersona);
      setIsEditing(false);
      onPersonaUpdate(updatedPersona);
    } catch (error) {
      console.error('Error updating persona:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this persona?')) {
      try {
        await personaAPI.delete(persona.id);
        onClose();
      } catch (error) {
        console.error('Error deleting persona:', error);
      }
    }
  };

  const sections = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'agents', name: 'Agents', icon: '👥' },
    { id: 'users', name: 'Assigned Users', icon: '👤' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{personaData.name}</h2>
              <p className="text-purple-100 mt-1">{personaData.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-50 border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeSection === section.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-gray-900">{personaData.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    {isEditing ? (
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={formData.model_provider}
                          onChange={(e) => setFormData({ ...formData, model_provider: e.target.value })}
                          placeholder="Provider"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                          type="text"
                          value={formData.model_id}
                          onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                          placeholder="Model ID"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-900">{personaData.model_provider} - {personaData.model_id}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-gray-900">{personaData.description}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instructions
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.instructions}
                        onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap">{personaData.instructions}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status</span>
                    <p className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      personaData.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {personaData.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Created</span>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(personaData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Creator</span>
                    <p className="mt-1 text-sm text-gray-900">{personaData.created_by}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'agents' && (
            <AgentAttachment persona={personaData} onPersonaUpdate={onPersonaUpdate} />
          )}

          {activeSection === 'users' && (
            <UserAssignment persona={personaData} onPersonaUpdate={onPersonaUpdate} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonaDetail;
