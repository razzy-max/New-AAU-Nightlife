import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Carousel from '../components/Carousel';
import API_BASE_URL from '../config';

// Background prefetching utility
const prefetchData = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Cache-Control': 'max-age=3600' } // Cache for 1 hour
    });
    if (response.ok) {
      await response.json(); // Consume the response to cache it
    }
  } catch (error) {
    // Silently fail - prefetching is not critical
    console.log('Prefetch failed:', url);
  }
};

function Home() {
  const [email, setEmail] = useState('');
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cacheBuster, setCacheBuster] = useState(() => {
    // Initialize from sessionStorage if available, otherwise use current time
    const stored = sessionStorage.getItem('home_cache_buster');
    return stored ? parseInt(stored) : Date.now();
  });

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    alert(`Thank you for subscribing with ${email}!`);
    setEmail('');
  };

  // Function to refresh homepage data (exposed globally for admin use)
  const refreshHomepageData = () => {
    setCacheBuster(Date.now());
  };

  // Expose refresh function globally
  useEffect(() => {
    window.refreshHomepageData = refreshHomepageData;
    return () => {
      delete window.refreshHomepageData;
    };
  }, []);


  const stats = [
    { number: '50+', label: 'Events Hosted' },
    { number: '2000+', label: 'Students Engaged' },
    { number: '100+', label: 'Job Opportunities' },
    { number: '5000+', label: 'Newsletter Subscribers' }
  ];

  const testimonials = [
    {
      text: "AAU Nightlife has transformed my university experience! The events are amazing and I've made so many friends.",
      author: "Sarah Johnson",
      role: "Computer Science Student"
    },
    {
      text: "The job opportunities posted here helped me land my dream internship. Highly recommend!",
      author: "Michael Adebayo",
      role: "Business Administration Student"
    },
    {
      text: "The blogs keep me updated on campus life and career tips. Great platform for students!",
      author: "Grace Okafor",
      role: "Engineering Student"
    }
  ];

  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [nextEvent, setNextEvent] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [testimonials.length]);

  useEffect(() => {
    if (upcomingEvents.length > 0) {
      // Filter out past events and sort by nearest date
      const now = new Date();
      const futureEvents = upcomingEvents
        .map(event => {
          // Extract just the date part (YYYY-MM-DD) from the ISO date string
          const dateOnly = event.date.split('T')[0];
          // Combine with the time to create a proper datetime
          const eventDateTime = new Date(`${dateOnly}T${event.time}`);
          return {
            ...event,
            eventDateTime
          };
        })
        .filter(event => event.eventDateTime > now)
        .sort((a, b) => a.eventDateTime - b.eventDateTime);

      if (futureEvents.length > 0) {
        const upcoming = futureEvents[0];
        setNextEvent(upcoming);

        const updateCountdown = () => {
          const now = new Date();
          const difference = upcoming.eventDateTime - now;

          if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds });
          } else {
            // Event has passed, reset to zero and clear next event
            setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            setNextEvent(null);
          }
        };

        updateCountdown();
        const countdownInterval = setInterval(updateCountdown, 1000);

        return () => clearInterval(countdownInterval);
      } else {
        // No future events
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setNextEvent(null);
      }
    } else {
      // No events at all
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setNextEvent(null);
    }
  }, [upcomingEvents]);

  // Background prefetching of blog data
  useEffect(() => {
    const prefetchBlogData = async () => {
      // Wait 2 seconds after page load to avoid interfering with initial render
      setTimeout(async () => {
        try {
          // Prefetch blog listings
          await prefetchData(`${API_BASE_URL}/api/blogs`);

          // Prefetch featured blogs
          await prefetchData(`${API_BASE_URL}/api/blogs/featured/list`);

          // Prefetch events and jobs
          await prefetchData(`${API_BASE_URL}/api/events`);
          await prefetchData(`${API_BASE_URL}/api/jobs`);

          console.log('Background prefetching completed');
        } catch (error) {
          console.log('Background prefetching failed:', error);
        }
      }, 2000);
    };

    prefetchBlogData();
  }, []);

  // Fetch homepage data (featured blogs, upcoming events, featured jobs)
  useEffect(() => {
    const fetchHomepageData = async () => {
      try {
        // Check if we have cached data
        const cachedBlogs = sessionStorage.getItem('home_blogs_cache');
        const cachedEvents = sessionStorage.getItem('home_events_cache');
        const cachedJobs = sessionStorage.getItem('home_jobs_cache');
        const cacheTimestamp = sessionStorage.getItem('home_cache_timestamp');
        const cachedBuster = sessionStorage.getItem('home_cache_buster');
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

        // Use cached data if it exists, is fresh, and cacheBuster hasn't changed
        if (cachedBlogs && cachedEvents && cachedJobs && cacheTimestamp && 
            cacheBuster === parseInt(cachedBuster || '0')) {
          const age = Date.now() - parseInt(cacheTimestamp);
          if (age < cacheMaxAge) {
            setFeaturedPosts(JSON.parse(cachedBlogs));
            setUpcomingEvents(JSON.parse(cachedEvents));
            setFeaturedJobs(JSON.parse(cachedJobs));
            setLoading(false);
            return;
          }
        }

        // Fetch featured blogs
        const blogsResponse = await fetch(`${API_BASE_URL}/api/blogs/featured/list?_t=${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (blogsResponse.ok) {
          const blogsData = await blogsResponse.json();
          setFeaturedPosts(blogsData);
          sessionStorage.setItem('home_blogs_cache', JSON.stringify(blogsData));
        }

        // Fetch featured events (like blogs)
        const eventsResponse = await fetch(`${API_BASE_URL}/api/events/featured/list?_t=${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setUpcomingEvents(eventsData);
          sessionStorage.setItem('home_events_cache', JSON.stringify(eventsData));
        }

        // Fetch featured jobs
        const jobsResponse = await fetch(`${API_BASE_URL}/api/jobs/featured/list?_t=${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          setFeaturedJobs(jobsData);
          sessionStorage.setItem('home_jobs_cache', JSON.stringify(jobsData));
        }

        // Update cache metadata
        sessionStorage.setItem('home_cache_timestamp', Date.now().toString());
        sessionStorage.setItem('home_cache_buster', cacheBuster.toString());
      } catch (error) {
        console.error('Error fetching homepage data:', error);
        // Fallback to empty arrays
        setFeaturedPosts([]);
        setUpcomingEvents([]);
        setFeaturedJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageData();
  }, [cacheBuster]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading homepage...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="hero">
        <Carousel />
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Welcome to AAU Nightlife</h1>
          <p>Experience the vibrant nightlife in Ekpoma, AAU</p>
          <Link to="/events" className="explore-btn">Explore Events</Link>
        </div>
      </section>
      <section className="section">
        <h2>About Us</h2>
        <p>AAU Nightlife is your go-to platform for everything happening in and around Ambrose Alli University. We are dedicated to showcasing the vibrant student lifestyle by curating the latest events, job opportunities, and student blogs that matter most to the AAU community.<br /><br />Our mission is to connect students with experiences that enrich campus life — from nightlife parties and hangouts to career-building opportunities and creative storytelling. Whether you're looking for where the next rave is happening, searching for part-time jobs to support your studies, or simply wanting to share and read authentic student perspectives, AAU Nightlife is here to keep you informed and engaged.<br /><br />We pride ourselves on being more than just an entertainment hub. AAU Nightlife is a community-driven platform that amplifies student voices, supports local businesses, and promotes collaboration across campus. By blending fun, culture, and opportunity, we aim to redefine what it means to be a student at Ambrose Alli University.<br /><br />Join us as we continue to grow, inspire, and celebrate the energy of AAU.</p>
      </section>
      <section className="section stats-dashboard">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="section upcoming-events">
        <h2>Upcoming Events</h2>
        <div className="events-preview-grid">
          {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
            <div key={event._id} className="event-preview-card">
              <div className="event-preview-image">
                <img src={event.image} alt={event.title} loading="lazy" />
                <div className="event-preview-date">
                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="event-preview-content">
                <h3>{event.title}</h3>
                <p className="event-preview-description">{event.shortDescription || event.description?.substring(0, 100) + '...'}</p>
                <p className="event-preview-time">{event.time} • {event.location}</p>
                <Link to="/events" className="learn-more-btn">Learn More</Link>
              </div>
            </div>
          )) : (
            <div className="no-events">
              <p>No upcoming events available. Check back soon!</p>
            </div>
          )}
        </div>
        <div className="view-all-events">
          <Link to="/events" className="view-all-btn">View All Events</Link>
        </div>
      </section>
      <section className="section event-countdown">
        <h2>Next Event Countdown</h2>
        {nextEvent ? (
          <>
            <p className="countdown-event-title">Counting down to: <strong>{nextEvent.title}</strong></p>
            <p className="countdown-event-date">
              {new Date(nextEvent.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} at {nextEvent.time}
            </p>
            <div className="countdown-container">
              <div className="countdown-item">
                <div className="countdown-number">{String(timeLeft.days).padStart(2, '0')}</div>
                <div className="countdown-label">Days</div>
              </div>
              <div className="countdown-separator">:</div>
              <div className="countdown-item">
                <div className="countdown-number">{String(timeLeft.hours).padStart(2, '0')}</div>
                <div className="countdown-label">Hours</div>
              </div>
              <div className="countdown-separator">:</div>
              <div className="countdown-item">
                <div className="countdown-number">{String(timeLeft.minutes).padStart(2, '0')}</div>
                <div className="countdown-label">Minutes</div>
              </div>
              <div className="countdown-separator">:</div>
              <div className="countdown-item">
                <div className="countdown-number">{String(timeLeft.seconds).padStart(2, '0')}</div>
                <div className="countdown-label">Seconds</div>
              </div>
            </div>
          </>
        ) : (
          <div className="no-countdown">
            <p>No upcoming events scheduled at the moment.</p>
            <Link to="/events" className="btn-primary">Check All Events</Link>
          </div>
        )}
      </section>
      <section className="section featured-blogs">
        <h2>Featured Blogs</h2>
        <div className="blogs-preview-grid">
          {featuredPosts.length > 0 ? featuredPosts.map(post => (
            <div key={post._id} className="blog-preview-card">
              <div className="blog-preview-image">
                <img src={post.image} alt={post.title} loading="lazy" />
              </div>
              <div className="blog-preview-content">
                <h3>{post.title}</h3>
                <p className="blog-preview-excerpt">{post.excerpt.substring(0, 120)}...</p>
                <div className="blog-preview-meta">
                  <span>By {post.author}</span>
                  <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <Link
                  to={`/blog/${post._id}`}
                  className="read-more-btn"
                  rel="prefetch"
                >
                  Read More
                </Link>
              </div>
            </div>
          )) : (
            <div className="no-featured-blogs">
              <p>No featured blogs available yet. Check back soon!</p>
            </div>
          )}
        </div>
        <div className="view-all-blogs">
          <Link
            to="/blog"
            className="view-all-btn"
            rel="prefetch"
          >
            View All Blogs
          </Link>
        </div>
      </section>
      <section className="section job-opportunities">
        <h2>Career Opportunities</h2>
        <div className="jobs-preview-grid">
          {featuredJobs.length > 0 ? featuredJobs.map(job => (
            <div key={job._id} className="job-preview-card">
              <div className="job-preview-header">
                <span className="job-type-badge">{job.type}</span>
                <h3>{job.title}</h3>
                <p className="job-company">{job.company}</p>
              </div>
              <div className="job-preview-content">
                <p className="job-location">📍 {job.location}</p>
                <p className="job-description">{job.description?.substring(0, 100) + '...'}</p>
                <p className="job-salary">{job.salary}</p>
                <Link to="/jobs" className="apply-btn">Apply Now</Link>
              </div>
            </div>
          )) : (
            <div className="no-jobs">
              <p>No job opportunities available yet. Check back soon!</p>
            </div>
          )}
        </div>
        <div className="view-all-jobs">
          <Link to="/jobs" className="view-all-btn">View All Jobs</Link>
        </div>
      </section>
      <section className="section newsletter-signup">
        <h2>Stay Updated</h2>
        <p>Subscribe to our newsletter for the latest events, job opportunities, and campus news.</p>
        <form onSubmit={handleNewsletterSubmit} className="newsletter-form">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="subscribe-btn">Subscribe</button>
        </form>
      </section>
      <section className="section testimonials">
        <h2>What Students Say</h2>
        <div className="testimonial-carousel">
          <div className="testimonial">
            <p className="testimonial-text">"{testimonials[currentTestimonial].text}"</p>
            <div className="testimonial-author">
              <strong>{testimonials[currentTestimonial].author}</strong>
              <span>{testimonials[currentTestimonial].role}</span>
            </div>
          </div>
          <div className="testimonial-indicators">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentTestimonial ? 'active' : ''}`}
                onClick={() => setCurrentTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="section cta-banner">
        <div className="cta-content">
          <h2>Ready to Join the Fun?</h2>
          <p>Don't miss out on the best events and opportunities at AAU. Register now and be part of the nightlife community!</p>
          <Link to="/events" className="cta-btn">Register for Events</Link>
        </div>
      </section>
    </div>
  );
}

export default Home;