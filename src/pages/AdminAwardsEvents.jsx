import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import '../components/awards/skeleton.css';
import '../components/awards-admin/awards-admin.css';

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
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    setOpenMenuId(null);
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
    setOpenMenuId(null);
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

      {loading ? (
        <div className="admin-table">
          <div className="skeleton" style={{ height: '48px', marginBottom: '2px' }} />
          <div className="skeleton" style={{ height: '64px', marginBottom: '2px' }} />
          <div className="skeleton" style={{ height: '64px', marginBottom: '2px' }} />
          <div className="skeleton" style={{ height: '64px' }} />
        </div>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th></th>
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
                  <td>
                    <div className="event-row-thumb">
                      {event.coverImage ? (
                        <img src={event.coverImage} alt="" />
                      ) : (
                        <span>🏆</span>
                      )}
                    </div>
                  </td>
                  <td><strong>{event.title}</strong></td>
                  <td>{event.organizerName}</td>
                  <td>
                    <button
                      className={`status-badge ${event.published ? 'active' : 'upcoming'} status-badge-toggle`}
                      onClick={() => handleTogglePublished(event._id, event.published)}
                      title="Click to toggle"
                    >
                      {event.published ? 'Published' : 'Draft'}
                    </button>
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
                    <div className="admin-row-menu-wrapper" ref={openMenuId === event._id ? menuRef : null}>
                      <button
                        className="btn-small edit admin-row-menu-trigger"
                        onClick={() => setOpenMenuId(openMenuId === event._id ? null : event._id)}
                      >
                        ⋯
                      </button>
                      {openMenuId === event._id && (
                        <div className="admin-row-menu">
                          <button onClick={() => handleOrganizerLink(event._id, false)}>Copy Organizer Link</button>
                          <button onClick={() => handleOrganizerLink(event._id, true)}>Rotate Link</button>
                          <button className="danger" onClick={() => handleDelete(event._id)}>Delete Event</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && (
            <div className="admin-table-empty">
              <p>No awards events yet.</p>
              <Link to="/admin/awards-events/new" className="add-btn">Create your first one</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminAwardsEvents;
