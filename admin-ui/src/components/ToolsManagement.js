import React, { useState, useEffect } from 'react';
import { toolAPI } from '../services/api';

const ToolsManagement = () => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      const data = await toolAPI.getAll();
      setTools(data);
      setError('');
    } catch (err) {
      setError('Failed to load tools');
      console.error('Error loading tools:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading tools...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Available Tools
        </h3>
        <p className="text-sm text-gray-500">
          Tools are automatically created when the server starts
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No tools found. Tools are created automatically when the server starts.
          </div>
        ) : (
          tools.map((tool) => (
            <div key={tool.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{tool.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  tool.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tool.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
              <div className="text-xs text-gray-500">
                <span className="font-medium">Class:</span> {tool.tool_class}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ToolsManagement;
