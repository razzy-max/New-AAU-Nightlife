import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import CategoriesManager from '../components/awards-admin/CategoriesManager';
import CandidatesManager from '../components/awards-admin/CandidatesManager';
import EventSettingsForm from '../components/awards-admin/EventSettingsForm';
import ActivityFeed from '../components/awards-admin/ActivityFeed';
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

const TABS = [
  { key: 'categories', label: '📋 Categories' },
  { key: 'candidates', label: '👥 Candidates' },
  { key: 'activity', label: '📊 Activity' },
  { key: 'settings', label: '⚙️ Settings' },
];

function AdminEditAwardsEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories');

  const token = localStorage.getItem('adminToken');
  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchEvent = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/awards-events/${id}`, { headers: { ...authHeaders } });
      const data = await response.json();
      if (data.success) setEvent(data.data);
    } catch (err) {
      console.error('Failed to fetch awards event:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleOrganizerLink = async (rotate = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/awards-events/${id}/organizer-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
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

  if (loading) {
    return <div className="admin-loading">Loading event...</div>;
  }

  if (!event) {
    return <div className="admin-loading">Awards event not found.</div>;
  }

  return (
    <div className="admin-awards">
      <div style={{ marginTop: '100px', marginBottom: '20px', padding: '10px' }}>
        <button onClick={() => navigate('/admin/awards-events')} style={backBtnStyle}>
          &larr; Back to Awards Events
        </button>
      </div>

      <h1>🏆 {event.title}</h1>
      <p style={{ marginBottom: '1.5rem' }}>
        <span className={`status-badge ${event.published ? 'active' : 'upcoming'}`}>
          {event.published ? 'Published' : 'Draft'}
        </span>
        {' '}Organized by {event.organizerName}
      </p>

      <div className="admin-actions" style={{ marginBottom: '1.5rem' }}>
        <button className="add-btn" onClick={() => handleOrganizerLink(false)}>Get Organizer Link</button>
        <button className="add-btn" onClick={() => handleOrganizerLink(true)} style={{ marginLeft: '10px' }}>Rotate Link</button>
      </div>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'categories' && (
        <CategoriesManager eventId={id} authHeaders={authHeaders} onCategoriesChanged={setCategories} />
      )}

      {activeTab === 'candidates' && (
        <CandidatesManager eventId={id} authHeaders={authHeaders} categories={categories} />
      )}

      {activeTab === 'activity' && (
        <ActivityFeed eventId={id} authHeaders={authHeaders} />
      )}

      {activeTab === 'settings' && (
        <EventSettingsForm
          event={event}
          eventId={id}
          authHeaders={authHeaders}
          isSuperadmin={true}
          onUpdated={setEvent}
        />
      )}
    </div>
  );
}

export default AdminEditAwardsEvent;
