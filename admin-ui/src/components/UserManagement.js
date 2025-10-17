import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import UserForm from './UserForm';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userAPI.getAll();
      setUsers(data.users || data);
      setError('');
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      await userAPI.create(userData);
      await loadUsers();
      setShowCreateForm(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      if (currentStatus) {
        await userAPI.deactivate(userId);
      } else {
        await userAPI.activate(userId);
      }
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user status');
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
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create User
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Users List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {users.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No users found.</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {user.username}
                      </h3>
                      <p className="text-gray-600 mt-1">{user.email}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            user.role_name === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {user.role_name}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span>
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          user.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create User Form Modal */}
      {showCreateForm && (
        <UserForm
          onSubmit={handleCreateUser}
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

export default UserManagement;
