function Events() {
  const events = [
    {
      id: 1,
      title: 'Tabata Festival 1.0',
      description: 'Get ready to kick off your day with high energy and pure vibes! Tabata Festival 1.0 is here to ignite your morning with fitness, music, and fun. Organized by Charlie\'s Gym & Dance Studio in collaboration with AAU Nightlife, this event is all about movement, motivation, and community.\n\n💪 What to Expect:\n- Tabata workout sessions\n- Dance & fitness challenges\n- Music and vibes\n- Free entry for all!',
      date: '2024-12-15',
      time: '8:00 AM',
      location: 'AAU Sports Complex',
      image: '/events/Bonfire.png'
    },
    {
      id: 2,
      title: 'Campus Concert Series: Afrobeat Night',
      description: 'Dive into the rhythms of Africa with our Campus Concert Series featuring rising Afrobeat stars! This electrifying event brings together talented musicians, dancers, and performers from across the university. Experience authentic beats, vibrant performances, and an unforgettable night of cultural celebration.\n\n🎵 Highlights:\n- Live Afrobeat performances\n- Dance competitions\n- Food stalls with African cuisine\n- Student DJ sets\n- Photography contest',
      date: '2024-12-20',
      time: '8:00 PM',
      location: 'AAU Auditorium',
      image: '/events/Hangout.jpg'
    },
    {
      id: 3,
      title: 'Nightlife Networking Mixer',
      description: 'Elevate your career prospects at our exclusive Nightlife Networking Mixer! Connect with industry professionals, entrepreneurs, and fellow students in a sophisticated atmosphere. This premier networking event features keynote speakers, panel discussions, and interactive workshops designed to boost your professional development.\n\n🤝 Networking Opportunities:\n- Industry leaders and entrepreneurs\n- Career counseling sessions\n- Resume review stations\n- Mock interview practice\n- Business pitch competitions\n- Free professional headshots',
      date: '2024-12-25',
      time: '6:00 PM',
      location: 'AAU Grand Ballroom',
      image: '/events/MovieAMA.jpg'
    }
  ];

  return (
    <div>
      <section className="events-header">
        <h1>Upcoming Events</h1>
        <p>Discover the vibrant nightlife and exciting events at AAU</p>
      </section>
      <section className="section events-section">
        <div className="events-grid">
          {events.map(event => (
            <div key={event.id} className="event-card">
              <div className="event-image">
                <img src={event.image} alt={event.title} loading="lazy" />
                <div className="event-date-badge">
                  <div className="date">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}, {new Date(event.date).getDate()}</div>
                  <div className="time">{event.time}</div>
                </div>
              </div>
              <div className="event-content">
                <h3>{event.title}</h3>
                <p className="event-description">{event.description}</p>
                <div className="event-details">
                  <p><strong>Location:</strong> {event.location}</p>
                </div>
                <button className="rsvp-btn">RSVP Now</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Events;