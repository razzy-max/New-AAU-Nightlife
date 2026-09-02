import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import API_BASE_URL from '../config';
import CategoriesManager from '../components/awards-admin/CategoriesManager';
import CandidatesManager from '../components/awards-admin/CandidatesManager';
import EventSettingsForm from '../components/awards-admin/EventSettingsForm';
import ActivityFeed from '../components/awards-admin/ActivityFeed';
import '../components/awards-admin/awards-admin.css';

function getVotingStatus(event) {
  const now = new Date();
  if (now < new Date(event.votingStartsAt)) return { label: 'Upcoming', className: 'upcoming' };
  if (now > new Date(event.votingEndsAt)) return { label: 'Ended', className: 'ended' };
  return { label: 'Live Now', className: 'active' };
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'categories', label: 'Categories' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'activity', label: 'Activity' },
  { key: 'settings', label: 'Settings' },
];

function OrganizerPanel() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState(null);
  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [overviewStats, setOverviewStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const urlToken = searchParams.get('access');
    if (urlToken) {
      sessionStorage.setItem(`organizerAccess:${slug}`, urlToken);
      setToken(urlToken);
      setSearchParams({}, { replace: true });
    } else {
      setToken(sessionStorage.getItem(`organizerAccess:${slug}`));
    }
  }, [slug, searchParams, setSearchParams]);

  const authHeaders = token ? { 'X-Organizer-Access': token } : {};

  const fetchEvent = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/awards-events/${slug}`, {
        headers: { ...authHeaders },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load event');
      }
      setEvent(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token]);

  useEffect(() => {
    if (token) fetchEvent();
  }, [token, fetchEvent]);

  useEffect(() => {
    if (!event) return;
    const fetchStats = async () => {
      try {
        const [catRes, candRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/awards-events/${slug}/categories`, { headers: { ...authHeaders } }),
          fetch(`${API_BASE_URL}/api/awards-events/${slug}/candidates`, { headers: { ...authHeaders } }),
        ]);
        const [catData, candData] = await Promise.all([catRes.json(), candRes.json()]);
        setOverviewStats({
          categoryCount: catData.data?.length || 0,
          candidateCount: candData.data?.length || 0,
        });
      } catch (err) {
        console.error('Failed to load overview stats:', err);
      }
    };
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, slug]);

  if (!token) {
    return (
      <div className="organizer-error-banner">
        <h2 style={{ fontFamily: 'Georgia, serif', color: '#DAA520' }}>Access link required</h2>
        <p>This page needs the organizer access link you were given. Please open the full link you received.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading" style={{ marginTop: '140px', textAlign: 'center' }}>Loading your event...</div>;
  }

  if (error || !event) {
    const revoked = error?.toLowerCase().includes('revoked') || error?.toLowerCase().includes('invalid');
    return (
      <div className="organizer-error-banner">
        <h2 style={{ fontFamily: 'Georgia, serif', color: '#DAA520' }}>
          {revoked ? 'Access link revoked' : 'Unable to load event'}
        </h2>
        <p>{revoked ? 'Your access link has been revoked or rotated — contact the site admin for a new link.' : (error || 'Please try again later.')}</p>
      </div>
    );
  }

  return (
    <div className="organizer-panel">
      <div className="organizer-hero">
        {event.coverImage && <img src={event.coverImage} alt="" className="organizer-hero-thumb" />}
        <div className="organizer-hero-text">
          <p className="eyebrow">You are managing</p>
          <h1>{event.title}</h1>
        </div>
      </div>

      <div className="organizer-panel-body">
        <div className="organizer-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`organizer-tab-pill ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="admin-list-section">
            <h2>Overview</h2>
            <div className="activity-stats-grid">
              <div className="activity-stat-tile">
                <div className="activity-stat-value" style={{ fontSize: '1.4rem' }}>
                  {event.published ? 'Live' : 'Draft'}
                </div>
                <div className="activity-stat-label">
                  {event.published ? getVotingStatus(event).label : 'Awaiting approval'}
                </div>
              </div>
              <div className="activity-stat-tile">
                <div className="activity-stat-value">{overviewStats ? overviewStats.categoryCount : '—'}</div>
                <div className="activity-stat-label">Categories</div>
              </div>
              <div className="activity-stat-tile">
                <div className="activity-stat-value">{overviewStats ? overviewStats.candidateCount : '—'}</div>
                <div className="activity-stat-label">Candidates</div>
              </div>
            </div>
            <p style={{ marginTop: '1.5rem', color: '#555' }}>
              <strong>Voting window:</strong> {new Date(event.votingStartsAt).toLocaleString()} &rarr; {new Date(event.votingEndsAt).toLocaleString()}
            </p>
            {!event.published && (
              <p style={{ color: '#b8860b', fontSize: '0.9rem' }}>
                Your event is still a draft — it won't appear publicly until the site admin publishes it.
              </p>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <CategoriesManager eventId={slug} authHeaders={authHeaders} onCategoriesChanged={setCategories} />
        )}

        {activeTab === 'candidates' && (
          <CandidatesManager eventId={slug} authHeaders={authHeaders} categories={categories} />
        )}

        {activeTab === 'activity' && (
          <ActivityFeed eventId={slug} authHeaders={authHeaders} />
        )}

        {activeTab === 'settings' && (
          <EventSettingsForm
            event={event}
            eventId={slug}
            authHeaders={authHeaders}
            isSuperadmin={false}
            onUpdated={setEvent}
          />
        )}
      </div>
    </div>
  );
}

export default OrganizerPanel;
