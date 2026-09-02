import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';

const emptyForm = {
  name: '',
  description: '',
  status: 'active',
  pricingType: 'free',
  pricePerVote: 100,
};

function CategoriesManager({ eventId, authHeaders, onCategoriesChanged }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/awards-events/${eventId}/categories`, {
        headers: { ...authHeaders },
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
        onCategoriesChanged?.(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `${API_BASE_URL}/api/awards-events/${eventId}/categories/${editingId}`
        : `${API_BASE_URL}/api/awards-events/${eventId}/categories`;

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (data.success) {
        resetForm();
        fetchCategories();
      } else {
        alert(data.message || 'Failed to save category');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setForm({
      name: category.name,
      description: category.description,
      status: category.status,
      pricingType: category.pricingType || 'free',
      pricePerVote: category.pricePerVote || 100,
    });
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Delete this category and all of its candidates/votes?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/awards-events/${eventId}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { ...authHeaders },
      });
      const data = await response.json();
      if (data.success) {
        fetchCategories();
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category');
    }
  };

  return (
    <div className="admin-tab-content">
      <div className="admin-form-section">
        <h2>{editingId ? 'Edit Category' : 'Create New Category'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              required
              rows="4"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active (open for voting)</option>
              <option value="paused">Paused (temporarily closed)</option>
            </select>
            <small>
              Categories are open by default the moment the event's voting window starts. Only switch
              this to Paused if you need to close this one specific category early.
            </small>
          </div>

          <div className="form-group">
            <label>Voting Type *</label>
            <div className="pricing-type-selector">
              <label className="radio-option">
                <input
                  type="radio"
                  name="pricingType"
                  value="free"
                  checked={form.pricingType === 'free'}
                  onChange={(e) => setForm({ ...form, pricingType: e.target.value })}
                />
                <span className="radio-label">🆓 Free</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="pricingType"
                  value="paid"
                  checked={form.pricingType === 'paid'}
                  onChange={(e) => setForm({ ...form, pricingType: e.target.value })}
                />
                <span className="radio-label">💰 Paid (Paystack)</span>
              </label>
            </div>
          </div>

          {form.pricingType === 'paid' && (
            <div className="form-group">
              <label>Price Per Vote (₦) *</label>
              <input
                type="number"
                min="1"
                required={form.pricingType === 'paid'}
                value={form.pricePerVote}
                onChange={(e) => setForm({ ...form, pricePerVote: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? 'Update Category' : 'Create Category'}
            </button>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
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
                  <th>Total Votes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category._id}>
                    <td><strong>{category.name}</strong></td>
                    <td><span className={`status-badge ${category.status}`}>{category.status}</span></td>
                    <td>
                      <span className={`type-badge ${category.pricingType}`}>
                        {category.pricingType === 'free' ? '🆓 Free' : '💰 Paid'}
                      </span>
                    </td>
                    <td>{category.totalVotes}</td>
                    <td className="actions">
                      <button className="btn-small edit" onClick={() => handleEdit(category)}>Edit</button>
                      <button className="btn-small delete" onClick={() => handleDelete(category._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No categories yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}

export default CategoriesManager;
