import React, { useState, useEffect } from 'react';
import { modelsAPI } from '../services/api';

const ModelSelector = ({ 
  modelProvider, 
  modelId, 
  onProviderChange, 
  onModelChange, 
  disabled = false 
}) => {
  const [modelOptions, setModelOptions] = useState({
    openai: [],
    groq: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await modelsAPI.getAll();
      
      if (response.success) {
        const { data } = response;
        setModelOptions({
          openai: data.openai?.models || [],
          groq: data.groq?.models || []
        });
        setError(null);
      } else {
        console.error('Error loading models:', response.error);
        setError(response.error);
        // Use fallback models
        setModelOptions({
          openai: [
            { id: 'gpt-4o', name: 'GPT-4o', available: true },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', available: true },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', available: true },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', available: true }
          ],
          groq: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', available: true },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', available: true },
            { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', available: true },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', available: true }
          ]
        });
      }
    } catch (err) {
      console.error('Error loading models:', err);
      setError(err.message);
      // Use fallback models
      setModelOptions({
        openai: [
          { id: 'gpt-4o', name: 'GPT-4o', available: true },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', available: true },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', available: true },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', available: true }
        ],
        groq: [
          { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', available: true },
          { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', available: true },
          { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', available: true },
          { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', available: true }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    onProviderChange(newProvider);
  };

  const handleModelChange = (e) => {
    onModelChange(e.target.value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model Provider *
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100">
            Loading...
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model *
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Model Provider *
        </label>
        <select
          value={modelProvider}
          onChange={handleProviderChange}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="openai">OpenAI</option>
          <option value="groq">Groq</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Model *
        </label>
        <select
          value={modelId}
          onChange={handleModelChange}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          {modelOptions[modelProvider]?.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-red-500 mt-1">
            Using fallback models. Error: {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default ModelSelector;