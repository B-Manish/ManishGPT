import React from 'react';

const ModelSelector = ({ 
  modelProvider, 
  modelId, 
  onProviderChange, 
  onModelChange, 
  disabled = false 
}) => {
  const modelOptions = {
    openai: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    groq: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
    ]
  };

  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    onProviderChange(newProvider);
    
    // Reset model to first option of new provider
    const firstModel = modelOptions[newProvider]?.[0]?.value;
    if (firstModel) {
      onModelChange(firstModel);
    }
  };

  const handleModelChange = (e) => {
    onModelChange(e.target.value);
  };

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
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ModelSelector;