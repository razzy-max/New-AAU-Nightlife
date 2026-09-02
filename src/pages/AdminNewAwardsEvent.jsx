import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import { localInputToISOString } from '../utils/datetimeLocal';

const backBtnStyle = {
  padding: '10px 20px',
  backgroundColor: '#000000',
  color: '#DAA520',
  border: '2px solid #DAA520',
  borderRadius: '6px',
  cursor: 'pointer',
};

function AdminNewAwardsEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    votingStartsAt: '',
    votingEndsAt: '',
    coverImage: null,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'file' ? files[0] : value }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.organizerName.trim()) newErrors.organizerName = 'Organizer name is required';
    if (!formData.organizerEmail.trim()) newErrors.organizerEmail = 'Organizer email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.organizerEmail)) newErrors.organizerEmail = 'Invalid email format';
    if (!formData.votingStartsAt) newErrors.votingStartsAt = 'Start time is required';
    if (!formData.votingEndsAt) newErrors.votingEndsAt = 'End time is required';
    if (formData.votingStartsAt && formData.votingEndsAt && formData.votingEndsAt <= formData.votingStartsAt) {
      newErrors.votingEndsAt = 'End time must be after the start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (key === 'votingStartsAt' || key === 'votingEndsAt') {
          body.append(key, localInputToISOString(value));
        } else {
          body.append(key, value);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/awards-events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (response.ok) {
        navigate('/admin/awards-events');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to create awards event');
      }
    } catch (err) {
      console.error('Error creating awards event:', err);
      alert('Error creating awards event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-new-event">
      <div style={{ marginTop: '100px', marginBottom: '20px', padding: '10px' }}>
        <button onClick={() => navigate('/admin/awards-events')} style={backBtnStyle}>
          &larr; Back to Awards Events
        </button>
      </div>

      <div className="admin-header">
        <h1>Create New Awards Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label htmlFor="title">Event Title *</label>
          <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
          {errors.title && <span className="error">{errors.title}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea id="description" name="description" rows="4" value={formData.description} onChange={handleChange} required />
          {errors.description && <span className="error">{errors.description}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="coverImage">Cover Image</label>
          <input type="file" id="coverImage" name="coverImage" accept="image/*" onChange={handleChange} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="organizerName">Organizer / Department Name *</label>
            <input type="text" id="organizerName" name="organizerName" value={formData.organizerName} onChange={handleChange} required />
            {errors.organizerName && <span className="error">{errors.organizerName}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="organizerEmail">Organizer Email *</label>
            <input type="email" id="organizerEmail" name="organizerEmail" value={formData.organizerEmail} onChange={handleChange} required />
            {errors.organizerEmail && <span className="error">{errors.organizerEmail}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="organizerPhone">Organizer Phone</label>
          <input type="text" id="organizerPhone" name="organizerPhone" value={formData.organizerPhone} onChange={handleChange} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="votingStartsAt">Voting Starts *</label>
            <input type="datetime-local" id="votingStartsAt" name="votingStartsAt" value={formData.votingStartsAt} onChange={handleChange} required />
            {errors.votingStartsAt && <span className="error">{errors.votingStartsAt}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="votingEndsAt">Voting Ends *</label>
            <input type="datetime-local" id="votingEndsAt" name="votingEndsAt" value={formData.votingEndsAt} onChange={handleChange} required />
            {errors.votingEndsAt && <span className="error">{errors.votingEndsAt}</span>}
          </div>
        </div>

        <p style={{ fontSize: '13px', color: '#666' }}>
          The event will be saved as a draft. Use "Publish" from the Awards Events list once categories and candidates are ready.
        </p>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/admin/awards-events')} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Create Awards Event'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminNewAwardsEvent;
