import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import '../components/awards/skeleton.css';
import './AwardsDirectory.css';

function getEventStatus(event) {
  const now = new Date();
  const start = new Date(event.votingStartsAt);
  const end = new Date(event.votingEndsAt);
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'live';
}

const STATUS_LABEL = { live: 'Live Now', upcoming: 'Upcoming', ended: 'Ended' };

function formatRemaining(targetDate) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function DirectoryCardSkeleton() {
  return (
    <div className="directory-card">
      <div className="directory-card-image skeleton" />
      <div className="directory-card-body">
        <div className="skeleton" style={{ height: '1.2rem', width: '70%', marginBottom: '0.6rem' }} />
        <div className="skeleton" style={{ height: '0.8rem', width: '45%', marginBottom: '0.6rem' }} />
        <div className="skeleton" style={{ height: '0.8rem', width: '60%', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '1rem', width: '35%' }} />
      </div>
    </div>
  );
}

function AwardsDirectory() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gridRef, gridVisible] = useScrollAnimation();

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/awards-events/public/directory`);
        const data = await response.json();
        if (data.success) {
          setEvents(data.data);
        } else {
          setError('Failed to load awards events');
        }
      } catch (err) {
        setError('Failed to load awards events');
      } finally {
        setLoading(false);
      }
    };

    fetchDirectory();
  }, []);

  if (error) return <div className="awards-error">{error}</div>;

  return (
    <div className="awards-directory-page">
      <div className="awards-hero">
        <div className="hero-content">
          <h1>🏆 Awards & Voting</h1>
          <p>Live voting events across campus — pick one and cast your vote!</p>
        </div>
      </div>

      <div className="awards-directory-container">
        {loading ? (
          <div className="directory-grid">
            <DirectoryCardSkeleton />
            <DirectoryCardSkeleton />
            <DirectoryCardSkeleton />
          </div>
        ) : events.length === 0 ? (
          <div className="empty-directory">
            <p>No live awards events right now. Check back soon!</p>
          </div>
        ) : (
          <div ref={gridRef} className="directory-grid">
            {events.map((event, index) => {
              const status = getEventStatus(event);
              const remaining =
                status === 'live'
                  ? formatRemaining(event.votingEndsAt)
                  : status === 'upcoming'
                  ? formatRemaining(event.votingStartsAt)
                  : null;

              return (
                <Link
                  to={`/awards/${event.slug || event._id}`}
                  key={event._id}
                  className={`directory-card stagger-item ${gridVisible ? 'visible' : ''} delay-${Math.min(index + 1, 5)}`}
                >
                  <div className="directory-card-image">
                    {event.coverImage ? (
                      <img src={event.coverImage} alt={event.title} loading="lazy" />
                    ) : (
                      <div className="directory-card-image-fallback">🏆</div>
                    )}
                    <span className={`directory-status-pill ${status}`}>
                      {status === 'live' && <span className="pulse-dot" />}
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  <div className="directory-card-body">
                    <h3>{event.title}</h3>
                    <p className="directory-card-org">{event.organizerName}</p>
                    <p className="directory-card-meta">
                      {event.categoryCount} {event.categoryCount === 1 ? 'category' : 'categories'} · {event.candidateCount} nominees
                    </p>
                    {remaining && (
                      <p className="directory-card-remaining">
                        {status === 'live' ? `Ends in ${remaining}` : `Starts in ${remaining}`}
                      </p>
                    )}
                    <span className="directory-card-cta">Vote Now →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AwardsDirectory;
