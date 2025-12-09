import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/events?admin=true`, {
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
    const newStatus = !currentStatus;

    // Optimistic update - immediately update UI
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event._id === eventId ? { ...event, published: newStatus } : event
      )
    );

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: newStatus }),
      });

      if (response.ok) {
        // Successfully updated
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
      } else {
        // Revert optimistic update on failure
        setEvents(prevEvents =>
          prevEvents.map(event =>
            event._id === eventId ? { ...event, published: currentStatus } : event
          )
        );
        alert('Failed to update publish status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      // Revert optimistic update on error
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event._id === eventId ? { ...event, published: currentStatus } : event
        )
      );
      alert('Network error. Please try again.');
    }
  };

  const toggleFeatured = async (eventId, currentStatus) => {
    const newStatus = !currentStatus;

    // Optimistic update - immediately update UI
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event._id === eventId ? { ...event, featured: newStatus } : event
      )
    );

    try {
      const token = localStorage.getItem('adminToken');
      console.log(`Toggling featured for event ${eventId}: ${currentStatus} -> ${newStatus}`);

      const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featured: newStatus }),
      });

      if (response.ok) {
        console.log(`Successfully updated featured status for event ${eventId}`);
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
        // Refresh the events list to ensure UI is in sync
        fetchEvents();
      } else {
        console.error(`Failed to update featured status for event ${eventId}:`, response.status);
        const errorData = await response.text();
        console.error('Error response:', errorData);
        // Revert optimistic update on failure
        setEvents(prevEvents =>
          prevEvents.map(event =>
            event._id === eventId ? { ...event, featured: currentStatus } : event
          )
        );
        alert('Failed to update featured status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating event featured status:', error);
      // Revert optimistic update on error
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event._id === eventId ? { ...event, featured: currentStatus } : event
        )
      );
      alert('Network error. Please try again.');
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

      <div className="events-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Time</th>
              <th>Location</th>
              <th>Description</th>
              <th>Published</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event._id}>
                <td className="event-title">{event.title}</td>
                <td>{new Date(event.date).toLocaleDateString()}</td>
                <td>{event.time}</td>
                <td>{event.location}</td>
                <td className="event-description">
                  {event.shortDescription || event.description?.substring(0, 50) + (event.description?.length > 50 ? '...' : '')}
                </td>
                <td>
                  <button
                    onClick={() => togglePublished(event._id, event.published)}
                    className={`status-btn ${event.published ? 'published' : 'draft'}`}
                  >
                    {event.published ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td>
                  <button
                    onClick={() => toggleFeatured(event._id, event.featured)}
                    className={`status-btn ${event.featured ? 'featured' : 'not-featured'}`}
                  >
                    {event.featured ? 'Featured' : 'Not Featured'}
                  </button>
                </td>
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