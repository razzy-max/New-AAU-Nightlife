import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminCarousel() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    image: null,
    altText: '',
    link: '',
    order: 0,
    active: true,
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/carousel?admin=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSlides(data);
      }
    } catch (error) {
      console.error('Error fetching slides:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.altText.trim()) newErrors.altText = 'Alt text is required';
    if (!editingSlide && !formData.image) newErrors.image = 'Image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const formDataToSend = new FormData();

      // Add all form fields except image
      Object.keys(formData).forEach(key => {
        if (key !== 'image' && formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add image file
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const url = editingSlide
        ? `${API_BASE_URL}/api/carousel/${editingSlide._id}`
        : `${API_BASE_URL}/api/carousel`;

      const response = await fetch(url, {
        method: editingSlide ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        fetchSlides();
        resetForm();
        setShowForm(false);
        setEditingSlide(null);
      } else {
        alert('Failed to save slide. Please try again.');
      }
    } catch (error) {
      console.error('Error saving slide:', error);
      alert('Error saving slide. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (slide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      image: null, // Don't pre-fill file input
      altText: slide.altText,
      link: slide.link || '',
      order: slide.order,
      active: slide.active,
      description: slide.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (slideId) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/carousel/${slideId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchSlides();
      }
    } catch (error) {
      console.error('Error deleting slide:', error);
    }
  };

  const toggleActive = async (slideId, currentStatus) => {
    const newStatus = !currentStatus;

    // Optimistic update
    setSlides(prevSlides =>
      prevSlides.map(slide =>
        slide._id === slideId ? { ...slide, active: newStatus } : slide
      )
    );

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/carousel/${slideId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: newStatus }),
      });

      if (!response.ok) {
        // Revert on failure
        setSlides(prevSlides =>
          prevSlides.map(slide =>
            slide._id === slideId ? { ...slide, active: currentStatus } : slide
          )
        );
        alert('Failed to update slide status.');
      }
    } catch (error) {
      // Revert on error
      setSlides(prevSlides =>
        prevSlides.map(slide =>
          slide._id === slideId ? { ...slide, active: currentStatus } : slide
        )
      );
      alert('Network error. Please try again.');
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newSlides = [...slides];
    const draggedSlide = newSlides[draggedIndex];

    // Remove dragged item
    newSlides.splice(draggedIndex, 1);
    // Insert at new position
    newSlides.splice(dropIndex, 0, draggedSlide);

    // Update order values
    const updatedSlides = newSlides.map((slide, index) => ({
      ...slide,
      order: index
    }));

    setSlides(updatedSlides);
    setDraggedIndex(null);

    // Save order to server
    try {
      const token = localStorage.getItem('adminToken');
      const orderData = updatedSlides.map(slide => ({
        id: slide._id,
        order: slide.order
      }));

      await fetch(`${API_BASE_URL}/api/carousel/order/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slides: orderData }),
      });
    } catch (error) {
      console.error('Error updating order:', error);
      // Revert on error
      fetchSlides();
    }
  };

  const forceRefreshCache = async () => {
    setCacheRefreshing(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/blogs/invalidate-cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Trigger immediate refresh of all pages
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
        if (window.refreshBlogData) {
          window.refreshBlogData();
        }
        if (window.refreshRelatedPosts) {
          window.refreshRelatedPosts();
        }
        alert('Cache refresh triggered! Public website updated immediately.');
      } else {
        alert('Failed to trigger cache refresh.');
      }
    } catch (error) {
      console.error('Error refreshing cache:', error);
      alert('Network error while refreshing cache.');
    } finally {
      setCacheRefreshing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image: null,
      altText: '',
      link: '',
      order: slides.length,
      active: true,
      description: ''
    });
    setErrors({});
  };

  if (loading) {
    return <div className="admin-loading">Loading carousel slides...</div>;
  }

  return (
    <div className="admin-carousel">
      <div className="admin-header">
        <div className="admin-nav" style={{
          marginTop: '100px',
          marginBottom: '20px',
          position: 'relative',
          zIndex: '1000',
          padding: '10px'
        }}>
          <button
            onClick={() => navigate('/admin')}
            className="back-btn"
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              position: 'relative',
              zIndex: '1001'
            }}
          >
            &larr; Back to Dashboard
          </button>
        </div>
        <h1>Manage Carousel</h1>
        <div className="admin-actions">
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="add-btn"
          >
            Add New Slide
          </button>
          <button
            onClick={forceRefreshCache}
            disabled={cacheRefreshing}
            className="refresh-cache-btn"
            style={{
              padding: '12px 24px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: cacheRefreshing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              marginLeft: '10px'
            }}
          >
            {cacheRefreshing ? 'Refreshing...' : 'Force Refresh Public Cache'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2>{editingSlide ? 'Edit Slide' : 'Add New Slide'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Title *</label>
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
                <label htmlFor="altText">Alt Text *</label>
                <input
                  type="text"
                  id="altText"
                  name="altText"
                  value={formData.altText}
                  onChange={handleChange}
                  required
                />
                {errors.altText && <span className="error">{errors.altText}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="image">Image {editingSlide ? '(Optional)' : '*'}</label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  onChange={handleChange}
                  accept="image/*"
                  required={!editingSlide}
                />
                {errors.image && <span className="error">{errors.image}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="link">Link (Optional)</label>
                <input
                  type="url"
                  id="link"
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="order">Order</label>
                  <input
                    type="number"
                    id="order"
                    name="order"
                    value={formData.order}
                    onChange={handleChange}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleChange}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={saving} className="submit-btn">
                  {saving ? 'Saving...' : (editingSlide ? 'Update Slide' : 'Create Slide')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSlide(null);
                    resetForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="carousel-slides">
        <div className="slides-grid">
          {slides.map((slide, index) => (
            <div
              key={slide._id}
              className="slide-card"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                margin: '10px',
                background: 'white',
                cursor: 'grab',
                opacity: draggedIndex === index ? 0.5 : 1
              }}
            >
              <div className="slide-image" style={{ marginBottom: '10px' }}>
                <img
                  src={slide.image}
                  alt={slide.altText}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div className="slide-info">
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{slide.title}</h3>
                <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
                  Order: {slide.order} | {slide.active ? 'Active' : 'Inactive'}
                </p>
                {slide.link && (
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    Link: <a href={slide.link} target="_blank" rel="noopener noreferrer">{slide.link}</a>
                  </p>
                )}
              </div>

              <div className="slide-actions" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={() => toggleActive(slide._id, slide.active)}
                  className={`status-btn ${slide.active ? 'published' : 'draft'}`}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  {slide.active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleEdit(slide)}
                  className="edit-btn"
                  style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#28a745' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(slide._id)}
                  className="delete-btn"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .carousel-slides {
          margin-top: 20px;
        }

        .slides-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .slide-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .form-row {
          display: flex;
          gap: 15px;
        }

        .form-group {
          flex: 1;
        }

        .error {
          color: red;
          font-size: 12px;
          margin-top: 4px;
        }

        .submit-btn, .cancel-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .submit-btn {
          background-color: #007bff;
          color: white;
        }

        .cancel-btn {
          background-color: #6c757d;
          color: white;
        }

        .status-btn.published {
          background-color: #28a745;
          color: white;
        }

        .status-btn.draft {
          background-color: #6c757d;
          color: white;
        }

        .edit-btn {
          background-color: #ffc107;
          color: black;
        }

        .delete-btn {
          background-color: #dc3545;
          color: white;
        }

        @media (max-width: 768px) {
          .form-row {
            flex-direction: column;
          }

          .slides-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminCarousel;