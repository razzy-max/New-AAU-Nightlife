import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminAdvertisers() {
  const navigate = useNavigate();
  const [advertisers, setAdvertisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    logo: '',
    website: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    description: '',
    featured: true,
    active: true,
    displayOrder: 0
  });

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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      setUploading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/blogs/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          logo: data.imageUrl
        }));
        alert('Logo uploaded successfully!');
      } else {
        alert('Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error uploading logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName || !formData.logo) {
      alert('Please fill in company name and upload a logo');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
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
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingId ? 'Advertiser updated successfully!' : 'Advertiser created successfully!');
        resetForm();
        fetchAdvertisers();
        
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to save advertiser');
      }
    } catch (error) {
      console.error('Error saving advertiser:', error);
      alert('Error saving advertiser');
    }
  };

  const handleEdit = (advertiser) => {
    setFormData({
      companyName: advertiser.companyName,
      logo: advertiser.logo,
      website: advertiser.website || '',
      whatsapp: advertiser.whatsapp || '',
      instagram: advertiser.instagram || '',
      facebook: advertiser.facebook || '',
      description: advertiser.description || '',
      featured: advertiser.featured,
      active: advertiser.active,
      displayOrder: advertiser.displayOrder || 0
    });
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
      logo: '',
      website: '',
      whatsapp: '',
      instagram: '',
      facebook: '',
      description: '',
      featured: true,
      active: true,
      displayOrder: 0
    });
    setEditingId(null);
    setShowForm(false);
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
            <div className="form-group">
              <label>Company Name *</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Website URL</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-group">
              <label>WhatsApp Number</label>
              <input
                type="text"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleInputChange}
                placeholder="e.g., +2349012345678 or 09012345678"
              />
            </div>

            <div className="form-group">
              <label>Instagram Handle</label>
              <input
                type="text"
                name="instagram"
                value={formData.instagram}
                onChange={handleInputChange}
                placeholder="e.g., @companyname or https://instagram.com/companyname"
              />
            </div>

            <div className="form-group">
              <label>Facebook Page</label>
              <input
                type="text"
                name="facebook"
                value={formData.facebook}
                onChange={handleInputChange}
                placeholder="e.g., https://facebook.com/companypage"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Logo * {uploading && '(Uploading...)'}</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {formData.logo && (
                <div className="image-preview">
                  <img src={formData.logo} alt="Logo preview" />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Display Order</label>
              <input
                type="number"
                name="displayOrder"
                value={formData.displayOrder}
                onChange={handleInputChange}
                min="0"
              />
              <small>Lower numbers appear first</small>
            </div>

            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleInputChange}
                />
                Featured (Show on homepage)
              </label>
            </div>

            <div className="form-group-inline">
              <label>
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                />
                Active
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update Advertiser' : 'Create Advertiser'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
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
