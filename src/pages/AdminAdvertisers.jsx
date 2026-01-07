import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB max for logos

function AdminAdvertisers() {
  const navigate = useNavigate();
  const [advertisers, setAdvertisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    description: '',
    featured: true,
    active: true,
    displayOrder: 0
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  const fetchAdvertisers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/advertisers/admin/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdvertisers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching advertisers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size
    if (file.size > MAX_LOGO_SIZE) {
      setErrors(prev => ({ ...prev, logo: 'Logo file is too large. Maximum size is 2MB.' }));
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, logo: 'Please select an image file.' }));
      return;
    }

    setLogoFile(file);
    setErrors(prev => ({ ...prev, logo: '' }));

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!logoPreview) newErrors.logo = 'Logo is required';
    if (logoFile && logoFile.size > MAX_LOGO_SIZE) {
      newErrors.logo = 'Logo file is too large. Maximum size is 2MB.';
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
      
      // Convert logo to base64 if a new file was selected
      let logoData = logoPreview;
      
      const dataToSend = {
        ...formData,
        logo: logoData
      };

      const url = editingId
        ? `${API_BASE_URL}/api/advertisers/admin/update/${editingId}`
        : `${API_BASE_URL}/api/advertisers/admin/create`;
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        resetForm();
        fetchAdvertisers();
        
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
      } else {
        const data = await response.json().catch(() => ({}));
        console.error('Server error:', response.status, data);
        alert(data.message || `Failed to save advertiser (Error ${response.status})`);
      }
    } catch (error) {
      console.error('Error saving advertiser:', error);
      alert('Error saving advertiser: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (advertiser) => {
    setFormData({
      companyName: advertiser.companyName,
      website: advertiser.website || '',
      whatsapp: advertiser.whatsapp || '',
      instagram: advertiser.instagram || '',
      facebook: advertiser.facebook || '',
      description: advertiser.description || '',
      featured: advertiser.featured,
      active: advertiser.active,
      displayOrder: advertiser.displayOrder || 0
    });
    setLogoPreview(advertiser.logo);
    setLogoFile(null);
    setEditingId(advertiser._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this advertiser?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/advertisers/admin/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Advertiser deleted successfully!');
        fetchAdvertisers();
        
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
      } else {
        alert('Failed to delete advertiser');
      }
    } catch (error) {
      console.error('Error deleting advertiser:', error);
      alert('Error deleting advertiser');
    }
  };

  const toggleFeatured = async (id, currentStatus) => {
    const newStatus = !currentStatus;

    setAdvertisers(prev =>
      prev.map(adv =>
        adv._id === id ? { ...adv, featured: newStatus } : adv
      )
    );

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/advertisers/admin/update/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featured: newStatus }),
      });

      if (response.ok) {
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
      } else {
        setAdvertisers(prev =>
          prev.map(adv =>
            adv._id === id ? { ...adv, featured: currentStatus } : adv
          )
        );
        alert('Failed to update featured status');
      }
    } catch (error) {
      console.error('Error updating advertiser:', error);
      setAdvertisers(prev =>
        prev.map(adv =>
          adv._id === id ? { ...adv, featured: currentStatus } : adv
        )
      );
    }
  };

  const toggleActive = async (id, currentStatus) => {
    const newStatus = !currentStatus;

    setAdvertisers(prev =>
      prev.map(adv =>
        adv._id === id ? { ...adv, active: newStatus } : adv
      )
    );

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/advertisers/admin/update/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: newStatus }),
      });

      if (response.ok) {
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
      } else {
        setAdvertisers(prev =>
          prev.map(adv =>
            adv._id === id ? { ...adv, active: currentStatus } : adv
          )
        );
        alert('Failed to update active status');
      }
    } catch (error) {
      console.error('Error updating advertiser:', error);
      setAdvertisers(prev =>
        prev.map(adv =>
          adv._id === id ? { ...adv, active: currentStatus } : adv
        )
      );
    }
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      website: '',
      whatsapp: '',
      instagram: '',
      facebook: '',
      description: '',
      featured: true,
      active: true,
      displayOrder: 0
    });
    setLogoFile(null);
    setLogoPreview('');
    setEditingId(null);
    setShowForm(false);
    setErrors({});
  };

  if (loading) {
    return <div className="admin-loading">Loading advertisers...</div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Manage Advertisers</h1>
        <div className="admin-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Add New Advertiser'}
          </button>
          <Link to="/admin/dashboard" className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {showForm && (
        <div className="admin-form-card">
          <h2>{editingId ? 'Edit Advertiser' : 'Add New Advertiser'}</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="companyName">Company Name *</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                />
                {errors.companyName && <span className="error">{errors.companyName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="website">Website URL</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="whatsapp">WhatsApp Number</label>
                <input
                  type="text"
                  id="whatsapp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="e.g., +2349012345678"
                />
              </div>

              <div className="form-group">
                <label htmlFor="instagram">Instagram Handle</label>
                <input
                  type="text"
                  id="instagram"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  placeholder="e.g., @companyname"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="facebook">Facebook Page</label>
                <input
                  type="text"
                  id="facebook"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleInputChange}
                  placeholder="https://facebook.com/companypage"
                />
              </div>

              <div className="form-group">
                <label htmlFor="displayOrder">Display Order</label>
                <input
                  type="number"
                  id="displayOrder"
                  name="displayOrder"
                  value={formData.displayOrder}
                  onChange={handleInputChange}
                  min="0"
                />
                <small style={{ fontSize: '12px', color: '#666' }}>Lower numbers appear first</small>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Brief description of the advertiser/business"
              />
            </div>

            <div className="form-group">
              <label htmlFor="logo">Logo * (Max 2MB)</label>
              <input
                type="file"
                id="logo"
                accept="image/*"
                onChange={handleLogoChange}
              />
              {errors.logo && <span className="error">{errors.logo}</span>}
              {logoPreview && (
                <div style={{ marginTop: '10px' }}>
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    style={{ 
                      maxWidth: '150px', 
                      maxHeight: '100px', 
                      objectFit: 'contain',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '5px'
                    }} 
                  />
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleInputChange}
                  />
                  Featured (Show on homepage)
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Saving...' : (editingId ? 'Update Advertiser' : 'Create Advertiser')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Company</th>
              <th>Contact Methods</th>
              <th>Featured</th>
              <th>Active</th>
              <th>Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {advertisers.length > 0 ? (
              advertisers.map((advertiser) => (
                <tr key={advertiser._id}>
                  <td>
                    <img
                      src={advertiser.logo}
                      alt={advertiser.companyName}
                      className="table-logo"
                    />
                  </td>
                  <td>{advertiser.companyName}</td>
                  <td>
                    {advertiser.website && (
                      <a href={advertiser.website} target="_blank" rel="noopener noreferrer" style={{display: 'block', marginBottom: '4px'}}>
                        🌐 Website
                      </a>
                    )}
                    {advertiser.whatsapp && (
                      <a href={`https://wa.me/${advertiser.whatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{display: 'block', marginBottom: '4px'}}>
                        💬 WhatsApp
                      </a>
                    )}
                    {advertiser.instagram && (
                      <a href={advertiser.instagram.startsWith('http') ? advertiser.instagram : `https://instagram.com/${advertiser.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{display: 'block', marginBottom: '4px'}}>
                        📷 Instagram
                      </a>
                    )}
                    {advertiser.facebook && (
                      <a href={advertiser.facebook} target="_blank" rel="noopener noreferrer" style={{display: 'block'}}>
                        📘 Facebook
                      </a>
                    )}
                    {!advertiser.website && !advertiser.whatsapp && !advertiser.instagram && !advertiser.facebook && (
                      <span style={{color: '#999'}}>No contact methods</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`toggle-btn ${advertiser.featured ? 'active' : ''}`}
                      onClick={() => toggleFeatured(advertiser._id, advertiser.featured)}
                    >
                      {advertiser.featured ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`toggle-btn ${advertiser.active ? 'active' : ''}`}
                      onClick={() => toggleActive(advertiser._id, advertiser.active)}
                    >
                      {advertiser.active ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td>{advertiser.displayOrder}</td>
                  <td className="action-buttons">
                    <button
                      className="btn btn-edit"
                      onClick={() => handleEdit(advertiser)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-delete"
                      onClick={() => handleDelete(advertiser._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  No advertisers found. Create your first advertiser!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminAdvertisers;
