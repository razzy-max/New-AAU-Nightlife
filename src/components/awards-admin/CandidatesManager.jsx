import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import './awards-admin.css';

function CandidatesManager({ eventId, authHeaders, categories }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchCandidates(selectedCategoryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      alert('Create a category first');
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('name', name);
      body.append('description', description);
      body.append('category', selectedCategoryId);
      if (imageFile) body.append('image', imageFile);

      const response = await fetch(`${API_BASE_URL}/api/awards-events/${eventId}/candidates`, {
        method: 'POST',
        headers: { ...authHeaders },
        body,
      });

      const data = await response.json();
      if (data.success) {
        setName('');
        setDescription('');
        setImageFile(null);
        fetchCandidates(selectedCategoryId);
      } else {
        alert(data.message || 'Failed to create candidate');
      }
    } catch (err) {
      console.error('Error creating candidate:', err);
      alert('Failed to create candidate');
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
        <h2>Add New Candidate</h2>
        <form onSubmit={handleCreate}>
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
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0] || null)} />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Candidate'}
          </button>
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
                {candidate.image && (
                  <img src={candidate.image} alt={candidate.name} className="candidate-admin-thumb" />
                )}
                <h4>{candidate.name}</h4>
                <p className="description">{candidate.description}</p>
                <div className="vote-stats">
                  <span>📊 Total Votes: {candidate.voteCount}</span>
                </div>
                <button className="btn-small delete" onClick={() => handleDelete(candidate._id)}>
                  Delete
                </button>
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
