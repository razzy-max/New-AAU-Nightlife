import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminAwards = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'upcoming',
    pricingType: 'free',
    pricePerVote: 100,
  });

  const [candidateForm, setCandidateForm] = useState({
    name: '',
    description: '',
    category: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchCandidates(selectedCategory._id);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/awards/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setCategories(data.data);
        if (data.data.length > 0 && !selectedCategory) {
          setSelectedCategory(data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (categoryId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/awards/candidates/category/${categoryId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();

      if (data.success) {
        setCandidates(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/awards/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(categoryForm),
      });

      const data = await response.json();

      if (data.success) {
        alert('Category created successfully!');
        setCategoryForm({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          status: 'upcoming',
          pricingType: 'free',
          pricePerVote: 100,
        });
        fetchCategories();
      } else {
        alert(data.message || 'Failed to create category');
      }
    } catch (err) {
      console.error('Error creating category:', err);
      alert('Failed to create category');
    }
  };

  const handleUpdateCategory = async (categoryId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/awards/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(categoryForm),
      });

      const data = await response.json();

      if (data.success) {
        alert('Category updated successfully!');
        setEditingItem(null);
        setCategoryForm({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          status: 'upcoming',
          pricingType: 'free',
          pricePerVote: 100,
        });
        fetchCategories();
      }
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/awards/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        alert('Category deleted successfully!');
        fetchCategories();
        setSelectedCategory(null);
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category');
    }
  };

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/awards/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...candidateForm,
          category: selectedCategory._id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Candidate created successfully!');
        setCandidateForm({ name: '', description: '' });
        fetchCandidates(selectedCategory._id);
      } else {
        alert(data.message || 'Failed to create candidate');
      }
    } catch (err) {
      console.error('Error creating candidate:', err);
      alert('Failed to create candidate');
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/awards/candidates/${candidateId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('Candidate deleted successfully!');
        fetchCandidates(selectedCategory._id);
      }
    } catch (err) {
      console.error('Error deleting candidate:', err);
      alert('Failed to delete candidate');
    }
  };

  const handleEditCategory = (category) => {
    setEditingItem(category._id);
    setCategoryForm({
      name: category.name,
      description: category.description,
      startDate: category.startDate.split('T')[0],
      endDate: category.endDate.split('T')[0],
      status: category.status,
      pricingType: category.pricingType || 'free',
      pricePerVote: category.pricePerVote || 100,
    });
  };

  const getStatusBasedOnDates = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return 'upcoming';
    } else if (now >= start && now <= end) {
      return 'active';
    } else {
      return 'ended';
    }
  };

  return (
    <div className="admin-awards">
      <div style={{
        marginTop: '100px',
        marginBottom: '20px',
        padding: '10px'
      }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          ← Back to Admin Dashboard
        </button>
      </div>
      <h1>🏆 Award Management</h1>

      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          📋 Categories
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'candidates' ? 'active' : ''}`}
          onClick={() => setActiveTab('candidates')}
        >
          👥 Candidates
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="admin-tab-content">
          <div className="admin-form-section">
            <h2>{editingItem ? 'Edit Category' : 'Create New Category'}</h2>
            <form onSubmit={(e) =>
              editingItem ? handleUpdateCategory(editingItem) : handleCreateCategory(e)
            }>
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  required
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  rows="4"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={categoryForm.startDate}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, startDate: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={categoryForm.endDate}
                    onChange={(e) => setCategoryForm({ ...categoryForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={categoryForm.status}
                  onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value })}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div className="form-group">
                <label>Voting Type *</label>
                <div className="pricing-type-selector">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="pricingType"
                      value="free"
                      checked={categoryForm.pricingType === 'free'}
                      onChange={(e) => setCategoryForm({ ...categoryForm, pricingType: e.target.value })}
                    />
                    <span className="radio-label">🆓 Free (with CAPTCHA)</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="pricingType"
                      value="paid"
                      checked={categoryForm.pricingType === 'paid'}
                      onChange={(e) => setCategoryForm({ ...categoryForm, pricingType: e.target.value })}
                    />
                    <span className="radio-label">💰 Paid (with Paystack)</span>
                  </label>
                </div>
              </div>

              {categoryForm.pricingType === 'paid' && (
                <div className="form-group">
                  <label>Price Per Vote (₦) *</label>
                  <input
                    type="number"
                    min="1"
                    required={categoryForm.pricingType === 'paid'}
                    value={categoryForm.pricePerVote}
                    onChange={(e) => setCategoryForm({ ...categoryForm, pricePerVote: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 100"
                  />
                  <small>Amount in Naira per single vote</small>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingItem ? 'Update Category' : 'Create Category'}
                </button>
                {editingItem && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditingItem(null);
                      setCategoryForm({
                        name: '',
                        description: '',
                        startDate: '',
                        endDate: '',
                        status: 'upcoming',
                        pricingType: 'free',
                        pricePerVote: 100,
                      });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="admin-list-section">
            <h2>Categories</h2>
            {loading ? (
              <p>Loading...</p>
            ) : categories.length > 0 ? (
              <div className="admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Total Votes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category._id}>
                        <td>
                          <strong>{category.name}</strong>
                        </td>
                        <td>
                          <span className={`status-badge ${category.status}`}>
                            {category.status}
                          </span>
                        </td>
                        <td>
                          <span className={`type-badge ${category.pricingType}`}>
                            {category.pricingType === 'free' ? '🆓 Free' : '💰 Paid'}
                          </span>
                        </td>
                        <td>{new Date(category.startDate).toLocaleDateString()}</td>
                        <td>{new Date(category.endDate).toLocaleDateString()}</td>
                        <td>{category.totalVotes}</td>
                        <td className="actions">
                          <button
                            className="btn-small edit"
                            onClick={() => handleEditCategory(category)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-small delete"
                            onClick={() => handleDeleteCategory(category._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No categories found</p>
            )}
          </div>
        </div>
      )}

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div className="admin-tab-content">
          {selectedCategory ? (
            <>
              <div className="category-selector-header">
                <h3>Currently Managing: {selectedCategory.name}</h3>
                <div className="category-quick-selector">
                  {categories.map((cat) => (
                    <button
                      key={cat._id}
                      className={`quick-select ${selectedCategory._id === cat._id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                      title={`Start: ${new Date(cat.startDate).toLocaleString()} | End: ${new Date(cat.endDate).toLocaleString()}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
                        <span>{cat.name}</span>
                        <span className={`status-badge ${getStatusBasedOnDates(cat.startDate, cat.endDate)}`}>
                          {getStatusBasedOnDates(cat.startDate, cat.endDate)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-form-section">
                <h2>Add New Candidate</h2>
                <form onSubmit={handleCreateCandidate}>
                  <div className="form-group">
                    <label>Candidate Name *</label>
                    <input
                      type="text"
                      required
                      value={candidateForm.name}
                      onChange={(e) =>
                        setCandidateForm({ ...candidateForm, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Description *</label>
                    <textarea
                      required
                      value={candidateForm.description}
                      onChange={(e) =>
                        setCandidateForm({ ...candidateForm, description: e.target.value })
                      }
                      rows="4"
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    Add Candidate
                  </button>
                </form>
              </div>

              <div className="admin-list-section">
                <h2>Candidates for {selectedCategory.name}</h2>
                {candidates.length > 0 ? (
                  <div className="candidates-grid">
                    {candidates.map((candidate) => (
                      <div key={candidate._id} className="candidate-admin-card">
                        <h4>{candidate.name}</h4>
                        <p className="description">{candidate.description}</p>
                        <div className="vote-stats">
                          <span>📊 Total Votes: {candidate.voteCount}</span>
                        </div>
                        <button
                          className="btn-small delete"
                          onClick={() => handleDeleteCandidate(candidate._id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No candidates for this category</p>
                )}
              </div>
            </>
          ) : (
            <p className="no-selection">Please create a category first</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAwards;
