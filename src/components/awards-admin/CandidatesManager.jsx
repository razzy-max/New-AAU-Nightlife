import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import './awards-admin.css';

function CandidatesManager({ eventId, authHeaders, categories }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchCandidates(selectedCategoryId);
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const fetchCandidates = async (categoryId) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/awards-events/${eventId}/candidates?categoryId=${categoryId}`,
        { headers: { ...authHeaders } }
      );
      const data = await response.json();
      if (data.success) {
        setCandidates(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setImageFile(null);
    setExistingImage(null);
    setFormError(null);
  };

  const handleEdit = (candidate) => {
    setEditingId(candidate._id);
    setName(candidate.name);
    setDescription(candidate.description || '');
    setImageFile(null);
    setExistingImage(candidate.image || null);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      setFormError('Create a category first.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const body = new FormData();
      body.append('name', name);
      body.append('description', description);
      body.append('category', selectedCategoryId);
      if (imageFile) body.append('image', imageFile);

      const url = editingId
        ? `${API_BASE_URL}/api/awards-events/${eventId}/candidates/${editingId}`
        : `${API_BASE_URL}/api/awards-events/${eventId}/candidates`;

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { ...authHeaders },
        body,
      });

      const data = await response.json();
      if (data.success) {
        resetForm();
        fetchCandidates(selectedCategoryId);
      } else {
        setFormError(data.message || 'Failed to save candidate.');
      }
    } catch (err) {
      console.error('Error saving candidate:', err);
      setFormError('Failed to save candidate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (candidateId) => {
    if (!window.confirm('Delete this candidate and its votes?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/awards-events/${eventId}/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: { ...authHeaders },
      });
      const data = await response.json();
      if (data.success) {
        if (editingId === candidateId) resetForm();
        fetchCandidates(selectedCategoryId);
      }
    } catch (err) {
      console.error('Error deleting candidate:', err);
      alert('Failed to delete candidate');
    }
  };

  if (categories.length === 0) {
    return (
      <div className="admin-tab-content">
        <p className="no-selection">Create a category first before adding candidates.</p>
      </div>
    );
  }

  return (
    <div className="admin-tab-content">
      <div className="category-selector-header">
        <h3>Currently Managing Candidates For:</h3>
        <div className="category-quick-selector">
          {categories.map((cat) => (
            <button
              key={cat._id}
              className={`quick-select ${selectedCategoryId === cat._id ? 'active' : ''}`}
              onClick={() => setSelectedCategoryId(cat._id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-form-section">
        <h2>{editingId ? 'Edit Candidate' : 'Add New Candidate'}</h2>
        {formError && <div className="settings-save-banner error" style={{ marginBottom: '1rem' }}>{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Candidate Name *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Photo (optional)</label>
            <div className="settings-cover-row">
              <div className="settings-cover-preview candidate-photo-preview">
                {imagePreview || existingImage ? (
                  <img src={imagePreview || existingImage} alt="" />
                ) : (
                  <span className="settings-cover-placeholder">{name ? name.charAt(0).toUpperCase() : '?'}</span>
                )}
              </div>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0] || null)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update Candidate' : 'Add Candidate'}
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
        <h2>Candidates</h2>
        {loading ? (
          <p>Loading...</p>
        ) : candidates.length > 0 ? (
          <div className="candidates-grid">
            {candidates.map((candidate) => (
              <div key={candidate._id} className="candidate-admin-card">
                {candidate.image ? (
                  <img src={candidate.image} alt={candidate.name} className="candidate-admin-thumb" />
                ) : (
                  <div className="candidate-admin-thumb candidate-admin-thumb-placeholder">
                    {candidate.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <h4>{candidate.name}</h4>
                <p className="description">{candidate.description}</p>
                <div className="vote-stats">
                  <span>📊 Total Votes: {candidate.voteCount}</span>
                </div>
                <div className="actions">
                  <button className="btn-small edit" onClick={() => handleEdit(candidate)}>Edit</button>
                  <button className="btn-small delete" onClick={() => handleDelete(candidate._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No candidates for this category yet.</p>
        )}
      </div>
    </div>
  );
}

export default CandidatesManager;
