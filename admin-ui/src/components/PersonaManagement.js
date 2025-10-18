import React, { useState, useEffect } from 'react';
import { personaAPI } from '../services/api';
import PersonaForm from './PersonaForm';
import PersonaCard from './PersonaCard';

const PersonaManagement = () => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await personaAPI.getAll();
      setPersonas(data);
      setError('');
    } catch (err) {
      setError('Failed to load personas');
      console.error('Error loading personas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePersona = async (id, personaData) => {
    try {
      console.log('Creating persona with data:', personaData); // Debug log
      console.log('Data type:', typeof personaData);
      console.log('Data keys:', Object.keys(personaData));
      
      const result = await personaAPI.create(personaData);
      console.log('Persona creation result:', result);
      
      await loadPersonas();
      setShowForm(false);
    } catch (err) {
      console.error('Persona creation error:', err); // Debug log
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to create persona');
    }
  };

  const handleUpdatePersona = async (id, personaData) => {
    try {
      await personaAPI.update(id, personaData);
      await loadPersonas();
      setEditingPersona(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update persona');
    }
  };

  const handleDeletePersona = async (id) => {
    if (window.confirm('Are you sure you want to delete this persona?')) {
      try {
        await personaAPI.delete(id);
        await loadPersonas();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to delete persona');
      }
    }
  };

  const handleEditPersona = (persona) => {
    setEditingPersona(persona);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPersona(null);
  };

  const handlePersonaUpdate = (updatedPersona) => {
    setPersonas(personas.map(p => p.id === updatedPersona.id ? updatedPersona : p));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Persona Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
        >
          Create Persona
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Personas List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {personas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No personas found. Create your first persona!
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {personas.map((persona) => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  onEdit={handleEditPersona}
                  onDelete={handleDeletePersona}
                  onPersonaUpdate={handlePersonaUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Persona Form Modal */}
      {showForm && (
        <PersonaForm
          persona={editingPersona}
          onSubmit={editingPersona ? handleUpdatePersona : handleCreatePersona}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
};

export default PersonaManagement;
