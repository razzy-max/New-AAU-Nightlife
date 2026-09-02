import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
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

  if (loading) return <div className="awards-loading">Loading Awards...</div>;
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
        {events.length === 0 ? (
          <div className="empty-directory">
            <p>No live awards events right now. Check back soon!</p>
          </div>
        ) : (
          <div ref={gridRef} className="directory-grid">
            {events.map((event, index) => {
              const status = getEventStatus(event);
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
