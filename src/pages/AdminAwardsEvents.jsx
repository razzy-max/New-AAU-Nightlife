import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

const backBtnStyle = {
  padding: '12px 24px',
  backgroundColor: '#000000',
  color: '#DAA520',
  border: '2px solid #DAA520',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 'bold',
};

function AdminAwardsEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/awards-events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch awards events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublished = async (eventId, currentStatus) => {
    setEvents((prev) => prev.map((e) => (e._id === eventId ? { ...e, published: !currentStatus } : e)));
    try {
      const token = localStorage.getItem('adminToken');
      const body = new FormData();
      body.append('published', !currentStatus);
      const response = await fetch(`${API_BASE_URL}/api/awards-events/${eventId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (!response.ok) throw new Error('Request failed');
    } catch (err) {
      setEvents((prev) => prev.map((e) => (e._id === eventId ? { ...e, published: currentStatus } : e)));
      alert('Failed to update publish status');
    }
  };

  const handleOrganizerLink = async (eventId, rotate = false) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/awards-events/${eventId}/organizer-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rotate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to generate organizer link');

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.url);
        alert(`Organizer link copied for sharing:\n\n${data.url}`);
      } else {
        prompt('Copy this organizer link:', data.url);
      }
    } catch (err) {
      alert(err.message || 'Unable to generate organizer link');
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Delete this awards event and all of its categories, candidates and votes?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/awards-events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading awards events...</div>;
  }

  return (
    <div className="admin-events">
      <div style={{ marginTop: '100px', marginBottom: '20px', padding: '10px' }}>
        <button onClick={() => navigate('/admin')} style={backBtnStyle}>
          &larr; Back to Dashboard
        </button>
      </div>

      <div className="admin-header">
        <h1>🏆 Awards Events</h1>
        <div className="admin-actions">
          <Link to="/admin/awards-events/new" className="add-btn">Add New Awards Event</Link>
        </div>
      </div>

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Organizer</th>
              <th>Status</th>
              <th>Voting Window</th>
              <th>Categories</th>
              <th>Candidates</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event._id}>
                <td><strong>{event.title}</strong></td>
                <td>{event.organizerName}</td>
                <td>
                  <span className={`status-badge ${event.published ? 'active' : 'upcoming'}`}>
                    {event.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td>
                  {new Date(event.votingStartsAt).toLocaleDateString()} - {new Date(event.votingEndsAt).toLocaleDateString()}
                </td>
                <td>{event.categoryCount}</td>
                <td>{event.candidateCount}</td>
                <td className="actions">
                  <button className="btn-small edit" onClick={() => navigate(`/admin/awards-events/edit/${event._id}`)}>
                    Manage
                  </button>
                  <button className="btn-small edit" onClick={() => handleTogglePublished(event._id, event.published)}>
                    {event.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="btn-small edit" onClick={() => handleOrganizerLink(event._id, false)}>
                    Get Link
                  </button>
                  <button className="btn-small edit" onClick={() => handleOrganizerLink(event._id, true)}>
                    Rotate Link
                  </button>
                  <button className="btn-small delete" onClick={() => handleDelete(event._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p style={{ padding: '1rem' }}>No awards events yet.</p>}
      </div>
    </div>
  );
}

export default AdminAwardsEvents;
