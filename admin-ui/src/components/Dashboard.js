import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PersonaManagement from './PersonaManagement';
import UserManagement from './UserManagement';
import ToolsManagement from './ToolsManagement';
import AgentsManagement from './AgentsManagement';
import LogsViewer from './LogsViewer';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('personas');

  const tabs = [
    { id: 'personas', name: 'Personas', icon: '🤖' },
    { id: 'agents', name: 'Agents', icon: '👤' },
    { id: 'users', name: 'Users', icon: '👥' },
    { id: 'tools', name: 'Tools', icon: '🔧' },
    { id: 'logs', name: 'Logs', icon: '📋' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'personas':
        return <PersonaManagement />;
      case 'agents':
        return <AgentsManagement />;
      case 'users':
        return <UserManagement />;
      case 'tools':
        return <ToolsManagement />;
      case 'logs':
        return <LogsViewer />;
      default:
        return <PersonaManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                ManishGPT Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
