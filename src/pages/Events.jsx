import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Check if we have cached data
        const cachedData = sessionStorage.getItem('events_cache');
        const cacheTimestamp = sessionStorage.getItem('events_cache_timestamp');
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

        // Use cached data if it exists and is fresh
        if (cachedData && cacheTimestamp) {
          const age = Date.now() - parseInt(cacheTimestamp);
          if (age < cacheMaxAge) {
            setEvents(JSON.parse(cachedData));
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data
        const response = await fetch(`${API_BASE_URL}/api/events`);
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        const eventsData = data.events || [];
        
        setEvents(eventsData);
        
        // Cache the data
        sessionStorage.setItem('events_cache', JSON.stringify(eventsData));
        sessionStorage.setItem('events_cache_timestamp', Date.now().toString());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div>
      <section className="events-header">
        <h1>Upcoming Events</h1>
        <p>Discover the vibrant nightlife and exciting events at AAU</p>
      </section>
      <section className="section events-section">
        <div className="events-grid">
          {events.map(event => (
            <div key={event._id} className="event-card">
              <div className="event-image">
                <img src={event.image} alt={event.title} loading="lazy" />
                <div className="event-date-badge">
                  <div className="date">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}, {new Date(event.date).getDate()}</div>
                  <div className="time">{event.time}</div>
                </div>
              </div>
              <div className="event-content">
                <h3>{event.title}</h3>
                <p className="event-description">{event.shortDescription || event.description}</p>
                <div className="event-details">
                  <p><strong>Location:</strong> {event.location}</p>
                  <p><strong>Contact:</strong> {event.contactEmail}</p>
                </div>
                <Link to={`/events/${event._id}`} style={{ textDecoration: 'none' }}>
                  <button className="rsvp-btn">RSVP Now</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Events;