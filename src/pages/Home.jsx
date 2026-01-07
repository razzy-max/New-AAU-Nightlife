import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Carousel from '../components/Carousel';
import API_BASE_URL from '../config';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useTypewriter } from '../hooks/useTypewriter';
import { formatTime } from '../utils/formatTime';

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
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [advertiserIndex, setAdvertiserIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState('');
  const [cacheBuster, setCacheBuster] = useState(() => {
    // Initialize from sessionStorage if available, otherwise use current time
    const stored = sessionStorage.getItem('home_cache_buster');
    return stored ? parseInt(stored) : Date.now();
  });

  // Scroll animations
  const [eventsRef, eventsVisible] = useScrollAnimation();
  const [countdownRef, countdownVisible] = useScrollAnimation();
  const [statsRef, statsVisible] = useScrollAnimation();
  const [jobsRef, jobsVisible] = useScrollAnimation();
  const [blogsRef, blogsVisible] = useScrollAnimation();
  const [advertisersRef, advertisersVisible] = useScrollAnimation();
  const [newsletterRef, newsletterVisible] = useScrollAnimation();
  
  // Typewriter animation for hero
  const { displayText, isComplete, showCursor } = useTypewriter();

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    setSubscribing(true);
    setSubscribeMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ whatsappNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscribeMessage(data.message || 'Successfully subscribed!');
        setWhatsappNumber('');
        // Clear message after 5 seconds
        setTimeout(() => setSubscribeMessage(''), 5000);
      } else {
        setSubscribeMessage(data.message || 'Failed to subscribe. Please try again.');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      setSubscribeMessage('Network error. Please try again later.');
    } finally {
      setSubscribing(false);
    }
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
      author: "Sarah Johnson ",
      role: "Computer Science Student"
    },
    {
      text: "The job opportunities posted here helped me land my dream internship. Highly recommend!",
      author: "Michael Adebayo ",
      role: "Business Administration Student"
    },
    {
      text: "The blogs keep me updated on campus life and career tips. Great platform for students!",
      author: "Grace Okafor ",
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

  // Fetch homepage data (featured blogs, upcoming events, featured jobs, advertisers)
  useEffect(() => {
    const fetchHomepageData = async () => {
      try {
        // Check if we have cached data
        const cachedBlogs = sessionStorage.getItem('home_blogs_cache');
        const cachedEvents = sessionStorage.getItem('home_events_cache');
        const cachedJobs = sessionStorage.getItem('home_jobs_cache');
        const cachedAdvertisers = sessionStorage.getItem('home_advertisers_cache');
        const cacheTimestamp = sessionStorage.getItem('home_cache_timestamp');
        const cachedBuster = sessionStorage.getItem('home_cache_buster');
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

        // Use cached data if it exists, is fresh, and cacheBuster hasn't changed
        // Include advertisers in the cache check
        if (cachedBlogs && cachedEvents && cachedJobs && cachedAdvertisers && cacheTimestamp && 
            cacheBuster === parseInt(cachedBuster || '0')) {
          const age = Date.now() - parseInt(cacheTimestamp);
          if (age < cacheMaxAge) {
            setFeaturedPosts(JSON.parse(cachedBlogs));
            setUpcomingEvents(JSON.parse(cachedEvents));
            setFeaturedJobs(JSON.parse(cachedJobs));
            setAdvertisers(JSON.parse(cachedAdvertisers));
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

        // Fetch featured advertisers
        const advertisersResponse = await fetch(`${API_BASE_URL}/api/advertisers/featured?_t=${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (advertisersResponse.ok) {
          const advertisersData = await advertisersResponse.json();
          setAdvertisers(advertisersData.data || []);
          sessionStorage.setItem('home_advertisers_cache', JSON.stringify(advertisersData.data || []));
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
        setAdvertisers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageData();
  }, [cacheBuster]);

  // Auto-slide advertisers carousel every 4 seconds
  useEffect(() => {
    if (advertisers.length <= 1) return;
    
    const interval = setInterval(() => {
      setAdvertiserIndex(prev => {
        const itemsPerView = window.innerWidth <= 768 ? 1 : window.innerWidth <= 992 ? 2 : 3;
        const maxIndex = Math.max(0, advertisers.length - itemsPerView);
        // Loop back to start when reaching the end
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [advertisers.length]);

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
          <h1 className="typewriter-text">
            {displayText}
            {showCursor && <span className="cursor">|</span>}
          </h1>
          <p className={`hero-subtitle ${isComplete ? 'fade-in' : ''}`}>
            Experience the vibrant nightlife in Ekpoma, AAU
          </p>
          <Link 
            to="/events" 
            className={`explore-btn ${isComplete ? 'slide-up' : ''}`}
          >
            Explore Events
          </Link>
        </div>
      </section>
      <section className="section">
        <h2>About Us</h2>
        <p>AAU Nightlife is a student-centered platform dedicated to capturing and amplifying the vibrant lifestyle of Ambrose Alli University. We serve as a hub for <strong>event promotion, planning, and hosting</strong>, while also providing space for <strong>blogging, articles, and campus reporting</strong>. In addition, we connect students to opportunities through <strong>job advert placements</strong>, making AAU Nightlife a one-stop destination for entertainment, information, and career growth.<br /><br />When it comes to <strong>events</strong>, AAU Nightlife is at the forefront of creating unforgettable experiences. From nightlife parties and hangouts to cultural showcases and campus celebrations, we specialize in promoting and hosting gatherings that bring students together. Our events are designed to foster community, highlight creativity, and ensure that AAU remains a lively and engaging environment.<br /><br />Through our <strong>blogs, articles, and reporting</strong>, we give students a voice and a platform to share their stories. We cover campus happenings, lifestyle trends, and student perspectives, ensuring that the AAU community stays informed and connected. Our content is authentic, engaging, and reflective of the diverse experiences that make up student life.<br /><br />Finally, AAU Nightlife is committed to supporting students beyond entertainment by offering <strong>job advert placements</strong>. We help connect students with part-time roles, internships, and opportunities that fit their academic schedules and career aspirations. By bridging the gap between employers and the student community, we empower individuals to gain valuable experience while pursuing their studies.<br /><br /><strong>AAU Nightlife is more than just a platform — it is a community.</strong> Behind the scenes, our dedicated team works tirelessly to curate events, publish stories, and share opportunities that matter most to students. Together, we are building a space where fun, culture, and opportunity meet, redefining what it means to be a student at Ambrose Alli University.</p>
      </section>
      <section ref={statsRef} className="section stats-dashboard">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className={`stat-item scale-in ${statsVisible ? 'visible' : ''} delay-${index + 1}`}>
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
      <section ref={eventsRef} className="section upcoming-events">
        <h2 className={`fade-in-up ${eventsVisible ? 'visible' : ''}`}>Upcoming Events</h2>
        <div className="events-preview-grid">
          {upcomingEvents.length > 0 ? upcomingEvents.map((event, index) => (
            <div key={event._id} className={`event-preview-card stagger-item ${eventsVisible ? 'visible' : ''} delay-${Math.min(index + 1, 3)}`}>
              <div className="event-preview-image">
                <img src={event.image} alt={event.title} loading="lazy" />
                <div className="event-preview-date">
                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="event-preview-content">
                <h3>{event.title}</h3>
                <p className="event-preview-description">{event.shortDescription || event.description?.substring(0, 100) + '...'}</p>
                <p className="event-preview-time">{formatTime(event.time)} • {event.location}</p>
                <Link to={`/events/${event._id}`} className="learn-more-btn">Learn More</Link>
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
      <section ref={countdownRef} className={`section event-countdown fade-in-up ${countdownVisible ? 'visible' : ''}`}>
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
              })} at {formatTime(nextEvent.time)}
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
      <section ref={blogsRef} className="section featured-blogs">
        <h2 className={`fade-in-up ${blogsVisible ? 'visible' : ''}`}>Featured Blogs</h2>
        <div className="blogs-preview-grid">
          {featuredPosts.length > 0 ? featuredPosts.map((post, index) => (
            <div key={post._id} className={`blog-preview-card stagger-item ${blogsVisible ? 'visible' : ''} delay-${Math.min(index + 1, 3)}`}>
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
      <section ref={jobsRef} className="section job-opportunities">
        <h2 className={`fade-in-up ${jobsVisible ? 'visible' : ''}`}>Career Opportunities</h2>
        <div className="jobs-preview-grid">
          {featuredJobs.length > 0 ? featuredJobs.map((job, index) => (
            <div key={job._id} className={`job-preview-card stagger-item ${jobsVisible ? 'visible' : ''} delay-${Math.min(index + 1, 3)}`}>
              <div className="job-preview-header">
                <span className="job-type-badge">{job.type}</span>
                <h3>{job.title}</h3>
                <p className="job-company">{job.company}</p>
              </div>
              <div className="job-preview-content">
                <p className="job-location">📍 {job.location}</p>
                <p className="job-description">{job.description?.substring(0, 100) + '...'}</p>
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
      <section ref={advertisersRef} className="section featured-advertisers">
        <h2 className={`fade-in-up ${advertisersVisible ? 'visible' : ''}`}>Featured Advertisers</h2>
        <p className={`fade-in-up ${advertisersVisible ? 'visible' : ''}`}>Discover amazing World-class businesses and services</p>
        {advertisers.length > 0 ? (
          <div className="advertisers-carousel-container">
            <button 
              className="carousel-nav-btn prev" 
              onClick={() => setAdvertiserIndex(prev => Math.max(0, prev - 1))}
              disabled={advertiserIndex === 0}
            >
              ‹
            </button>
            <div 
              className="advertisers-carousel"
              style={{ transform: `translateX(-${advertiserIndex * (window.innerWidth <= 768 ? 100 : window.innerWidth <= 992 ? 50 : 33.333)}%)` }}
            >
              {advertisers.map((advertiser, index) => (
                <div 
                  key={advertiser._id} 
                  className={`advertiser-card stagger-item ${advertisersVisible ? 'visible' : ''} delay-${Math.min(index + 1, 4)}`}
                >
                  <div className="advertiser-logo">
                    <img src={advertiser.logo} alt={advertiser.companyName} loading="lazy" />
                  </div>
                  <div className="advertiser-info">
                    <h4>{advertiser.companyName}</h4>
                    {advertiser.description && <p>{advertiser.description}</p>}
                    <div className="advertiser-links">
                      {advertiser.website && (
                        <a href={advertiser.website} target="_blank" rel="noopener noreferrer" title="Visit Website">
                          <i className="fas fa-globe"></i>
                        </a>
                      )}
                      {advertiser.whatsapp && (
                        <a href={`https://wa.me/${advertiser.whatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                          <i className="fab fa-whatsapp"></i>
                        </a>
                      )}
                      {advertiser.instagram && (
                        <a href={advertiser.instagram.startsWith('http') ? advertiser.instagram : `https://instagram.com/${advertiser.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" title="Instagram">
                          <i className="fab fa-instagram"></i>
                        </a>
                      )}
                      {advertiser.facebook && (
                        <a href={advertiser.facebook} target="_blank" rel="noopener noreferrer" title="Facebook">
                          <i className="fab fa-facebook-f"></i>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button 
              className="carousel-nav-btn next" 
              onClick={() => setAdvertiserIndex(prev => {
                const itemsPerView = window.innerWidth <= 768 ? 1 : window.innerWidth <= 992 ? 2 : 3;
                const maxIndex = Math.max(0, advertisers.length - itemsPerView);
                return Math.min(maxIndex, prev + 1);
              })}
              disabled={advertiserIndex >= advertisers.length - (window.innerWidth <= 768 ? 1 : window.innerWidth <= 992 ? 2 : 3)}
            >
              ›
            </button>
          </div>
        ) : (
          <div className="no-advertisers">
            <p>No advertisers to display at the moment.</p>
          </div>
        )}
      </section>
      <section ref={newsletterRef} className={`section newsletter-signup fade-in-up ${newsletterVisible ? 'visible' : ''}`}>
        <h2>Stay Updated</h2>
        <p>Subscribe to our newsletter for the latest events, job opportunities, and campus news.</p>
        {subscribeMessage && (
          <div className={`subscribe-message ${subscribeMessage.includes('error') || subscribeMessage.includes('Failed') ? 'error' : 'success'}`}>
            {subscribeMessage}
          </div>
        )}
        <form onSubmit={handleNewsletterSubmit} className="newsletter-form">
          <input
            type="tel"
            placeholder="Enter your WhatsApp number"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            required
            disabled={subscribing}
          />
          <button type="submit" className="subscribe-btn" disabled={subscribing}>
            {subscribing ? 'Subscribing...' : 'Subscribe'}
          </button>
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