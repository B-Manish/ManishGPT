import React, { useState, useEffect } from 'react';
import { userAPI, personaAPI } from '../services/api';

const AssignmentManagement = () => {
  const [users, setUsers] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading assignment data...');
      
      const [usersData, personasData] = await Promise.all([
        userAPI.getAll(),
        personaAPI.getAll()
      ]);
      
      console.log('Users data:', usersData);
      console.log('Personas data:', personasData);
      
      setUsers(usersData.users || usersData);
      setPersonas(personasData);
      
      // Load assignments for each user
      const assignmentPromises = (usersData.users || usersData).map(async (user) => {
        try {
          console.log(`Loading personas for user ${user.id} (${user.username})`);
          const userPersonas = await userAPI.getPersonas(user.id);
          console.log(`User ${user.id} personas:`, userPersonas);
          return {
            userId: user.id,
            userName: user.username,
            userEmail: user.email,
            personas: userPersonas.personas || []
          };
        } catch (err) {
          console.error(`Error loading personas for user ${user.id}:`, err);
          return {
            userId: user.id,
            userName: user.username,
            userEmail: user.email,
            personas: []
          };
        }
      });
      
      const assignmentData = await Promise.all(assignmentPromises);
      console.log('Final assignment data:', assignmentData);
      setAssignments(assignmentData);
      setError('');
    } catch (err) {
      console.error('Error loading assignment data:', err);
      setError('Failed to load assignment data: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPersona = async (userId, personaId) => {
    try {
      await userAPI.assignPersona(userId, personaId);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign persona');
    }
  };

  const handleRemovePersona = async (userId, personaId) => {
    if (window.confirm('Are you sure you want to remove this persona assignment?')) {
      try {
        await userAPI.removePersona(userId, personaId);
        await loadData();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to remove persona assignment');
      }
    }
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
        <h2 className="text-2xl font-bold text-gray-900">Persona Assignments</h2>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Debug Info */}
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        <p><strong>Debug Info:</strong></p>
        <p>Users count: {users.length}</p>
        <p>Personas count: {personas.length}</p>
        <p>Assignments count: {assignments.length}</p>
        <p>Loading: {loading.toString()}</p>
        <p>Error: {error || 'None'}</p>
      </div>

      {/* Assignments List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {assignments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No users found.</p>
          ) : (
            <div className="space-y-6">
              {assignments.map((assignment) => (
                <div
                  key={assignment.userId}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assignment.userName}
                      </h3>
                      <p className="text-gray-600">{assignment.userEmail}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-700">Assigned Personas:</h4>
                    {assignment.personas.length === 0 ? (
                      <p className="text-gray-500 text-sm">No personas assigned</p>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {assignment.personas.map((persona) => (
                          <div
                            key={persona.id}
                            className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                          >
                            <div>
                              <span className="font-medium text-gray-900">
                                {persona.name}
                              </span>
                              <p className="text-xs text-gray-500">
                                Assigned: {new Date(persona.assigned_at).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemovePersona(assignment.userId, persona.id)}
                              className="text-red-600 hover:text-red-800 ml-2"
                              title="Remove assignment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Assign New Persona */}
                    <div className="pt-3 border-t border-gray-200">
                      <h4 className="font-medium text-gray-700 mb-2">Assign New Persona:</h4>
                      <div className="flex space-x-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignPersona(assignment.userId, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select a persona...</option>
                          {personas
                            .filter(persona => !assignment.personas.some(assigned => assigned.id === persona.id))
                            .map(persona => (
                              <option key={persona.id} value={persona.id}>
                                {persona.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentManagement;
