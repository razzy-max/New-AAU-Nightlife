import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminEditEvent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    date: '',
    time: '',
    location: '',
    category: 'Social',
    contactEmail: '',
    image: null,
    featured: false,
    published: true
  });
  const [currentImage, setCurrentImage] = useState('');
  const [hasTicketing, setHasTicketing] = useState(false);
  const [tickets, setTickets] = useState([{ name: '', price: '' }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const event = await response.json();
        setFormData({
          title: event.title || '',
          description: event.description || '',
          shortDescription: event.shortDescription || '',
          date: event.date ? event.date.split('T')[0] : '',
          time: event.time || '',
          location: event.location || '',
          category: event.category || 'Social',
          contactEmail: event.contactEmail || '',
          image: null,
          featured: event.featured || false,
          published: event.published !== false
        });
        setCurrentImage(event.image || '');
        
        // Set up ticketing if event has tickets
        if (event.tickets && event.tickets.length > 0) {
          setHasTicketing(true);
          setTickets(event.tickets.map(t => ({ name: t.name, price: t.price })));
        }
      } else {
        alert('Failed to load event. Redirecting...');
        navigate('/admin/events');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      alert('Error loading event. Redirecting...');
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
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

  const handleTicketChange = (index, field, value) => {
    const updatedTickets = [...tickets];
    updatedTickets[index][field] = field === 'price' ? parseFloat(value) || 0 : value;
    setTickets(updatedTickets);
  };

  const addTicketRow = () => {
    setTickets([...tickets, { name: '', price: '' }]);
  };

  const removeTicketRow = (index) => {
    if (tickets.length > 1) {
      setTickets(tickets.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.shortDescription.trim()) newErrors.shortDescription = 'Short description is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.contactEmail.trim()) newErrors.contactEmail = 'Contact email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) newErrors.contactEmail = 'Invalid email format';

    if (hasTicketing) {
      const validTickets = tickets.filter(t => t.name.trim() && t.price);
      if (validTickets.length === 0) {
        newErrors.tickets = 'At least one valid ticket is required when ticketing is enabled';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const formDataToSend = new FormData();

      // Add all form fields except image and tickets
      Object.keys(formData).forEach(key => {
        if (key !== 'image' && formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add tickets as JSON if enabled
      if (hasTicketing) {
        const validTickets = tickets.filter(t => t.name.trim() && t.price);
        formDataToSend.append('tickets', JSON.stringify(validTickets));
      } else {
        formDataToSend.append('tickets', JSON.stringify([]));
      }

      // Add image file only if a new one is selected
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
        alert('Event updated successfully!');
        navigate('/admin/events');
      } else {
        alert('Failed to update event. Please try again.');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Error updating event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading" style={{ marginTop: '150px', textAlign: 'center' }}>
        <p>Loading event data...</p>
      </div>
    );
  }

  return (
    <div className="admin-new-event">
      <div style={{
        marginTop: '100px',
        marginBottom: '20px',
        position: 'relative',
        zIndex: '1000',
        padding: '10px'
      }}>
        <button
          onClick={() => navigate('/admin/events')}
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
          &larr; Back to Events
        </button>
      </div>

      <div className="admin-header">
        <h1>Edit Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-row">
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
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="Social">Social</option>
              <option value="Academic">Academic</option>
              <option value="Sports">Sports</option>
              <option value="Cultural">Cultural</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="shortDescription">Short Description *</label>
          <input
            type="text"
            id="shortDescription"
            name="shortDescription"
            value={formData.shortDescription}
            onChange={handleChange}
            required
          />
          {errors.shortDescription && <span className="error">{errors.shortDescription}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Full Description *</label>
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

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
            {errors.date && <span className="error">{errors.date}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="time">Time *</label>
            <input
              type="time"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              required
            />
            {errors.time && <span className="error">{errors.time}</span>}
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
            <label htmlFor="contactEmail">Contact Email *</label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              required
            />
            {errors.contactEmail && <span className="error">{errors.contactEmail}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="image">Event Image</label>
          {currentImage && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', color: '#666' }}>Current image:</p>
              <img src={currentImage} alt="Current event" style={{ maxWidth: '200px', borderRadius: '5px' }} />
            </div>
          )}
          <input
            type="file"
            id="image"
            name="image"
            onChange={handleChange}
            accept="image/*"
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Leave empty to keep current image
          </p>
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
              Featured Event
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

        {/* Ticketing Section */}
        <div className="ticketing-section" style={{
          borderTop: '2px solid #DAA520',
          paddingTop: '20px',
          marginTop: '20px'
        }}>
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasTicketing}
                onChange={(e) => setHasTicketing(e.target.checked)}
              />
              Enable Ticket Sales for This Event
            </label>
          </div>

          {hasTicketing && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ color: '#DAA520', marginBottom: '15px' }}>Ticket Types</h3>
              {errors.tickets && <span className="error">{errors.tickets}</span>}

              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '5px',
                padding: '10px'
              }}>
                {tickets.map((ticket, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      marginBottom: '12px',
                      padding: '10px',
                      backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                      borderRadius: '5px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Ticket Type (e.g., Regular, VIP Table)"
                        value={ticket.name}
                        onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          fontFamily: 'Arial, sans-serif'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="number"
                        placeholder="Price (₦)"
                        value={ticket.price}
                        onChange={(e) => handleTicketChange(index, 'price', e.target.value)}
                        min="0"
                        step="100"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          fontFamily: 'Arial, sans-serif'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTicketRow(index)}
                      disabled={tickets.length === 1}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: tickets.length === 1 ? '#ccc' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: tickets.length === 1 ? 'not-allowed' : 'pointer',
                        marginTop: '0'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addTicketRow}
                style={{
                  marginTop: '10px',
                  padding: '10px 20px',
                  backgroundColor: '#DAA520',
                  color: 'black',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                + Add Ticket Type
              </button>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/admin/events')} className="cancel-btn">
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

export default AdminEditEvent;
