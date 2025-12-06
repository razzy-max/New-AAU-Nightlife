import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchEvents(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const togglePublished = async (eventId, currentStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: !currentStatus }),
      });

      if (response.ok) {
        fetchEvents(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading events...</div>;
  }

  return (
    <div className="admin-events">
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
        <h1>Manage Events</h1>
        <div className="admin-actions">
          <Link to="/admin/events/new" className="add-btn">Add New Event</Link>
        </div>
      </div>

      <div className="events-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Organizer</th>
              <th>Date</th>
              <th>Location</th>
              <th>Published</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event._id}>
                <td className="event-title">{event.title}</td>
                <td>{event.organizer}</td>
                <td>{new Date(event.date).toLocaleDateString()}</td>
                <td>{event.location}</td>
                <td>
                  <button
                    onClick={() => togglePublished(event._id, event.published)}
                    className={`status-btn ${event.published ? 'published' : 'draft'}`}
                  >
                    {event.published ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td>{event.featured ? 'Yes' : 'No'}</td>
                <td className="actions">
                  <button onClick={() => handleDelete(event._id)} className="delete-btn">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminEvents;