import React, { useState, useEffect } from 'react';

const PersonaForm = ({ persona, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    model_provider: 'openai',
    model_id: 'gpt-4o',
  });

  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name || '',
        description: persona.description || '',
        instructions: persona.instructions || '',
        model_provider: persona.model_provider || 'openai',
        model_id: persona.model_id || 'gpt-4o',
      });
    }
  }, [persona]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(persona?.id, formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {persona ? 'Edit Persona' : 'Create New Persona'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
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
            
            <div className="mb-4">
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
            
            <div className="mb-4">
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
            
            <div className="mb-4">
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
            
            <div className="mb-4">
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
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              >
                {persona ? 'Update' : 'Create'} Persona
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PersonaForm;
