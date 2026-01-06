import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminEditJob() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    requirements: '',
    salary: '',
    type: 'Full-time',
    category: 'Other',
    applicationDeadline: '',
    contactEmail: '',
    whatsappNumber: '',
    image: '',
    featured: false,
    published: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const job = await response.json();
        setFormData({
          title: job.title || '',
          company: job.company || '',
          location: job.location || '',
          description: job.description || '',
          requirements: job.requirements || '',
          salary: job.salary || '',
          type: job.type || 'Full-time',
          category: job.category || 'Other',
          applicationDeadline: job.applicationDeadline ? job.applicationDeadline.split('T')[0] : '',
          contactEmail: job.contactEmail || '',
          whatsappNumber: job.whatsappNumber || '',
          image: job.image || '',
          featured: job.featured || false,
          published: job.published !== false
        });
      } else {
        alert('Failed to load job. Redirecting...');
        navigate('/admin/jobs');
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      alert('Error loading job. Redirecting...');
      navigate('/admin/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.company.trim()) newErrors.company = 'Company is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.requirements.trim()) newErrors.requirements = 'Requirements is required';
    if (!formData.salary.trim()) newErrors.salary = 'Salary is required';
    if (formData.contactEmail.trim() && !/\S+@\S+\.\S+/.test(formData.contactEmail)) newErrors.contactEmail = 'Invalid email format';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          applicationDeadline: formData.applicationDeadline || null
        }),
      });

      if (response.ok) {
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
        if (window.refreshJobsData) {
          window.refreshJobsData();
        }
        alert('Job updated successfully!');
        navigate('/admin/jobs');
      } else {
        alert('Failed to update job. Please try again.');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      alert('Error updating job. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading" style={{ marginTop: '150px', textAlign: 'center' }}>
        <p>Loading job data...</p>
      </div>
    );
  }

  return (
    <div className="admin-new-job">
      <div style={{
        marginTop: '100px',
        marginBottom: '20px',
        position: 'relative',
        zIndex: '1000',
        padding: '10px'
      }}>
        <button
          onClick={() => navigate('/admin/jobs')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '100px',
            zIndex: 10
          }}
        >
          &larr; Back to Jobs
        </button>
      </div>

      <div className="admin-header">
        <h1>Edit Job</h1>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">Job Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
            {errors.title && <span className="error">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="company">Company *</label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              required
            />
            {errors.company && <span className="error">{errors.company}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="location">Location *</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
            {errors.location && <span className="error">{errors.location}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="type">Job Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="Hospitality">Hospitality</option>
              <option value="Event Management">Event Management</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="salary">Salary *</label>
            <input
              type="text"
              id="salary"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              placeholder="e.g., 50,000 - 70,000 NGN/month"
              required
            />
            {errors.salary && <span className="error">{errors.salary}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Job Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            required
          />
          {errors.description && <span className="error">{errors.description}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="requirements">Requirements *</label>
          <textarea
            id="requirements"
            name="requirements"
            value={formData.requirements}
            onChange={handleChange}
            rows="3"
            required
          />
          {errors.requirements && <span className="error">{errors.requirements}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="applicationDeadline">Application Deadline</label>
            <input
              type="date"
              id="applicationDeadline"
              name="applicationDeadline"
              value={formData.applicationDeadline}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="contactEmail">Contact Email (optional)</label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
            />
            {errors.contactEmail && <span className="error">{errors.contactEmail}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="whatsappNumber">WhatsApp Number (for applications)</label>
          <input
            type="tel"
            id="whatsappNumber"
            name="whatsappNumber"
            value={formData.whatsappNumber}
            onChange={handleChange}
            placeholder="e.g., +2348012345678"
          />
          <small style={{color: '#666', fontSize: '0.85rem'}}>Include country code (e.g., +234). Applicants will use this to apply via WhatsApp.</small>
        </div>

        <div className="form-group">
          <label htmlFor="image">Company Logo URL</label>
          <input
            type="url"
            id="image"
            name="image"
            value={formData.image}
            onChange={handleChange}
            placeholder="https://example.com/logo.jpg"
          />
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleChange}
              />
              Featured Job
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="published"
                checked={formData.published}
                onChange={handleChange}
              />
              Published
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/admin/jobs')} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="submit-btn">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminEditJob;
