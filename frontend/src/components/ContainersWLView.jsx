import { useState, useEffect } from 'react';
import { config } from '../config/appConfig';

function ContainersWLView() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [filteredContainers, setFilteredContainers] = useState([]);
  
  // Estados para el modal de agregar/editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [formData, setFormData] = useState({
    iso_code: '',
    device_id: '',
    device_name: '',
    device_type: 'jetson'
  });

  // Fetch containers data
  const fetchContainers = async () => {
    try {
      setError(null);
      const response = await fetch(`${config.API_BASE_URL}/api/containers-wl/all?limit=500`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setContainers(data);
      setFilteredContainers(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching containers white list:', err);
      setError('Error loading containers white list data');
      setLoading(false);
    }
  };

  // Filter containers by device_name
  useEffect(() => {
    if (filterText.trim() === '') {
      setFilteredContainers(containers);
    } else {
      const filtered = containers.filter(container => 
        container.device_name?.toLowerCase().includes(filterText.toLowerCase())
      );
      setFilteredContainers(filtered);
    }
  }, [filterText, containers]);

  // Load data on mount
  useEffect(() => {
    fetchContainers();
  }, []);

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Open modal for adding new container
  const handleAddNew = () => {
    setEditingContainer(null);
    setFormData({
      iso_code: '',
      device_id: '',
      device_name: '',
      device_type: 'jetson'
    });
    setIsModalOpen(true);
  };

  // Open modal for editing container
  const handleEdit = (container) => {
    setEditingContainer(container);
    setFormData({
      iso_code: container.iso_code || '',
      device_id: container.device_id || '',
      device_name: container.device_name || '',
      device_type: container.device_type || 'jetson'
    });
    setIsModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save container (create or update)
  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!formData.iso_code.trim()) {
      alert('ISO Code is required');
      return;
    }

    try {
      setLoading(true);
      
      const url = editingContainer 
        ? `${config.API_BASE_URL}/api/containers-wl/${editingContainer.id}`
        : `${config.API_BASE_URL}/api/containers-wl`;
      
      const method = editingContainer ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await fetchContainers();
      setIsModalOpen(false);
      setEditingContainer(null);
    } catch (err) {
      console.error('Error saving container:', err);
      alert('Error saving container. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete container
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this container?')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${config.API_BASE_URL}/api/containers-wl/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await fetchContainers();
    } catch (err) {
      console.error('Error deleting container:', err);
      alert('Error deleting container. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && containers.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="glassmorphism-strong rounded-3xl p-8 text-center max-w-md">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-white/70 mb-4">{error}</p>
          <button
            onClick={fetchContainers}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header Card */}
      <div className="glassmorphism-strong rounded-3xl p-6 mb-6 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Containers White List</h2>
              <p className="text-white/60 text-sm">Manage authorized container ISO codes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2">
              <p className="text-white/60 text-xs">Total Records</p>
              <p className="text-white text-2xl font-bold">{containers.length}</p>
            </div>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl transition-all duration-300 shadow-lg"
              title="Add new container"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-white font-medium">Add New</span>
            </button>
            <button
              onClick={fetchContainers}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300"
              title="Refresh data"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div className="mt-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by Device Name..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <svg className="w-5 h-5 text-white/50 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {filterText && (
            <p className="text-white/60 text-sm mt-2">
              Showing {filteredContainers.length} of {containers.length} records
            </p>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="glassmorphism-strong rounded-3xl shadow-lg overflow-hidden">
        {filteredContainers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    ISO Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Device ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Device Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Device Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredContainers.map((container, index) => (
                  <tr 
                    key={container.id} 
                    className="hover:bg-white/5 transition-colors duration-200"
                    style={{
                      animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`
                    }}
                  >
                    {/* ISO Code */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                          <span className="text-white font-mono font-bold tracking-wider text-lg">
                            {container.iso_code}
                          </span>
                        </span>
                      </div>
                    </td>

                    {/* Device ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-white/70 text-sm">
                        {container.device_id || '-'}
                      </span>
                    </td>

                    {/* Device Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-white font-medium text-sm">
                        {container.device_name || '-'}
                      </span>
                    </td>

                    {/* Device Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {container.device_type || 'jetson'}
                      </span>
                    </td>

                    {/* Created At */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-white/70 text-sm">
                          {formatDate(container.created_at)}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(container)}
                          className="p-2 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(container.id)}
                          className="p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="w-20 h-20 text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white/60 text-lg font-medium">
              {filterText ? 'No containers found with that device name' : 'No containers in white list yet'}
            </p>
            <p className="text-white/40 text-sm mt-2">
              {filterText ? 'Try a different search term' : 'Click "Add New" to create your first entry'}
            </p>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glassmorphism-strong rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                {editingContainer ? 'Edit Container' : 'Add New Container'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* ISO Code */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  ISO Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="iso_code"
                  value={formData.iso_code}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., ABCD1234567"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Device ID */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Device ID
                </label>
                <input
                  type="text"
                  name="device_id"
                  value={formData.device_id}
                  onChange={handleInputChange}
                  placeholder="e.g., jetson-001"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Device Name */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Device Name
                </label>
                <input
                  type="text"
                  name="device_name"
                  value={formData.device_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Gate Camera"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Device Type */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Device Type
                </label>
                <select
                  name="device_type"
                  value={formData.device_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="jetson">Jetson</option>
                  <option value="camera">Camera</option>
                  <option value="mobile">Mobile</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium"
                >
                  {editingContainer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default ContainersWLView;