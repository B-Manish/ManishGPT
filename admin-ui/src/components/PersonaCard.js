import React, { useState } from 'react';
import PersonaDetail from './PersonaDetail';

const PersonaCard = ({ persona, onEdit, onDelete, onPersonaUpdate }) => {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div 
        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{persona.name}</h3>
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(persona);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="Edit Persona"
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(persona.id);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete Persona"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <p className="text-gray-600 mb-3">{persona.description}</p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Model: {persona.model_provider} - {persona.model_id}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            persona.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            Status: {persona.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div className="text-sm text-gray-500">
          <p>Created: {new Date(persona.created_at).toLocaleDateString()}</p>
          <p>By: {persona.created_by}</p>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Instructions:</strong> {persona.instructions}
          </p>
        </div>
        
        <div className="mt-3 text-center">
          <span className="text-sm text-purple-600 font-medium">
            Click to manage agents and users →
          </span>
        </div>
      </div>

      {showDetail && (
        <PersonaDetail
          persona={persona}
          onClose={() => setShowDetail(false)}
          onPersonaUpdate={onPersonaUpdate}
        />
      )}
    </>
  );
};

export default PersonaCard;