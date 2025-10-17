import React from 'react';

const PersonaCard = ({ persona, onEdit, onDelete }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{persona.name}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(persona)}
            className="text-indigo-600 hover:text-indigo-800"
            title="Edit persona"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(persona.id)}
            className="text-red-600 hover:text-red-800"
            title="Delete persona"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <p className="text-gray-600 mb-3 line-clamp-2">
        {persona.description || 'No description provided'}
      </p>
      
      <div className="space-y-2 text-sm text-gray-500">
        <div className="flex items-center">
          <span className="font-medium mr-2">Model:</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            {persona.model_provider} - {persona.model_id}
          </span>
        </div>
        
        <div className="flex items-center">
          <span className="font-medium mr-2">Status:</span>
          <span className={`px-2 py-1 rounded-full text-xs ${
            persona.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {persona.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div className="flex items-center">
          <span className="font-medium mr-2">Created:</span>
          <span>{new Date(persona.created_at).toLocaleDateString()}</span>
        </div>
        
        {persona.created_by && (
          <div className="flex items-center">
            <span className="font-medium mr-2">By:</span>
            <span>{persona.created_by}</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 line-clamp-3">
          <span className="font-medium">Instructions:</span> {persona.instructions}
        </p>
      </div>
    </div>
  );
};

export default PersonaCard;
