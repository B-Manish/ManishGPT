import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';

const UserAssignment = ({ persona, onPersonaUpdate }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, [persona.id]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const [allUsersData, assignedUsersData] = await Promise.all([
        userAPI.getAll(),
        userAPI.getPersonaUsers(persona.id)
      ]);
      
      setAllUsers(allUsersData.users || []);
      setAssignedUsers(assignedUsersData.users || []);
      setError('');
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async (userId) => {
    try {
      await userAPI.assignPersona(userId, persona.id);
      loadUsers(); // Reload to update lists
    } catch (err) {
      setError('Failed to assign user');
      console.error('Error assigning user:', err);
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await userAPI.removePersona(userId, persona.id);
      loadUsers(); // Reload to update lists
    } catch (err) {
      setError('Failed to remove user');
      console.error('Error removing user:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-900">User Assignment</h4>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Assigned Users */}
      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-2">Assigned Users</h5>
        {assignedUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No users assigned to this persona</p>
        ) : (
          <div className="space-y-2">
            {assignedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded p-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{user.username}</span>
                  <span className="text-xs text-gray-500">({user.email})</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.role_name === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role_name}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Users */}
      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-2">Available Users</h5>
        {allUsers.filter(user => !assignedUsers.some(assigned => assigned.id === user.id)).length === 0 ? (
          <p className="text-sm text-gray-500">All users are already assigned to this persona</p>
        ) : (
          <div className="space-y-2">
            {allUsers
              .filter(user => !assignedUsers.some(assigned => assigned.id === user.id))
              .map((user) => (
              <div key={user.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded p-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{user.username}</span>
                  <span className="text-xs text-gray-500">({user.email})</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.role_name === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role_name}
                  </span>
                </div>
                <button
                  onClick={() => handleAssignUser(user.id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Assign
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAssignment;
