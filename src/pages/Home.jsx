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
  const [loading, setLoading] = useState(true);
  const [cacheBuster, setCacheBuster] = useState(Date.now());

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

  const events = [
    {
      id: 1,
      title: 'Tabata Festival 1.0',
      description: 'Get ready to kick off your day with high energy and pure vibes! Tabata Festival 1.0 is here to ignite your morning with fitness, music, and fun.',
      date: '2024-12-15',
      time: '8:00 AM',
      location: 'AAU Sports Complex',
      image: '/events/Bonfire.png'
    },
    {
      id: 2,
      title: 'Campus Concert Series: Afrobeat Night',
      description: 'Dive into the rhythms of Africa with our Campus Concert Series featuring rising Afrobeat stars!',
      date: '2024-12-20',
      time: '8:00 PM',
      location: 'AAU Auditorium',
      image: '/events/Hangout.jpg'
    },
    {
      id: 3,
      title: 'Nightlife Networking Mixer',
      description: 'Elevate your career prospects at our exclusive Nightlife Networking Mixer!',
      date: '2024-12-25',
      time: '6:00 PM',
      location: 'AAU Grand Ballroom',
      image: '/events/MovieAMA.jpg'
    }
  ];

  const upcomingEvents = events.slice(0, 3);


  const jobs = [
    {
      id: 1,
      title: 'Event Bartender',
      company: 'Club X Nightlife',
      location: 'Ekpoma, AAU',
      description: 'Join our dynamic team at Club X as an Event Bartender! We\'re looking for enthusiastic individuals with a passion for mixology and customer service.',
      salary: '₦50,000 - ₦80,000/month',
      type: 'Part-time'
    },
    {
      id: 2,
      title: 'Event Coordinator',
      company: 'AAU Nightlife Events',
      location: 'Ekpoma, AAU',
      description: 'Are you organized, creative, and passionate about student life? We\'re seeking an Event Coordinator to help plan and execute unforgettable nightlife experiences.',
      salary: '₦70,000 - ₦120,000/month',
      type: 'Full-time'
    },
    {
      id: 3,
      title: 'Social Media Manager',
      company: 'AAU Nightlife',
      location: 'Ekpoma, AAU',
      description: 'Help us amplify the AAU Nightlife brand! We\'re looking for a creative Social Media Manager to handle our online presence.',
      salary: '₦60,000 - ₦100,000/month',
      type: 'Part-time'
    }
  ];

  const featuredJobs = jobs.slice(0, 3);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [testimonials.length]);

  useEffect(() => {
    const nextEvent = events[0];
    const eventDate = new Date(`${nextEvent.date}T${nextEvent.time}`);

    const updateCountdown = () => {
      const now = new Date();
      const difference = eventDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);

    return () => clearInterval(countdownInterval);
  }, [events]);

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

  // Fetch featured blogs for homepage
  useEffect(() => {
    const fetchFeaturedBlogs = async () => {
      try {
        // Use cache-busting parameter to force fresh data
        const response = await fetch(`${API_BASE_URL}/api/blogs/featured/list?_t=${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setFeaturedPosts(data);
        }
      } catch (error) {
        console.error('Error fetching featured blogs:', error);
        // Fallback to empty array
        setFeaturedPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedBlogs();
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
        <p>AAU Nightlife is your go-to platform for events, jobs, and student blogs in Ambrose Alli University.</p>
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
          {upcomingEvents.map(event => (
            <div key={event.id} className="event-preview-card">
              <div className="event-preview-image">
                <img src={event.image} alt={event.title} loading="lazy" />
                <div className="event-preview-date">
                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="event-preview-content">
                <h3>{event.title}</h3>
                <p className="event-preview-description">{event.description.substring(0, 100)}...</p>
                <p className="event-preview-time">{event.time} • {event.location}</p>
                <Link to="/events" className="learn-more-btn">Learn More</Link>
              </div>
            </div>
          ))}
        </div>
        <div className="view-all-events">
          <Link to="/events" className="view-all-btn">View All Events</Link>
        </div>
      </section>
      <section className="section event-countdown">
        <h2>Next Event Countdown</h2>
        <div className="countdown-container">
          <div className="countdown-item">
            <div className="countdown-number">{timeLeft.days}</div>
            <div className="countdown-label">Days</div>
          </div>
          <div className="countdown-item">
            <div className="countdown-number">{timeLeft.hours}</div>
            <div className="countdown-label">Hours</div>
          </div>
          <div className="countdown-item">
            <div className="countdown-number">{timeLeft.minutes}</div>
            <div className="countdown-label">Minutes</div>
          </div>
          <div className="countdown-item">
            <div className="countdown-number">{timeLeft.seconds}</div>
            <div className="countdown-label">Seconds</div>
          </div>
        </div>
        <p className="countdown-event">Until {events[0].title}</p>
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
          {featuredJobs.map(job => (
            <div key={job.id} className="job-preview-card">
              <div className="job-preview-header">
                <span className="job-type-badge">{job.type}</span>
                <h3>{job.title}</h3>
                <p className="job-company">{job.company}</p>
              </div>
              <div className="job-preview-content">
                <p className="job-location">📍 {job.location}</p>
                <p className="job-description">{job.description.substring(0, 100)}...</p>
                <p className="job-salary">{job.salary}</p>
                <Link to="/jobs" className="apply-btn">Apply Now</Link>
              </div>
            </div>
          ))}
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
      <section className="section social-media">
        <h2>Follow Us</h2>
        <p>Stay connected with AAU Nightlife on social media for the latest updates and behind-the-scenes content.</p>
        <div className="social-links">
          <a href="https://instagram.com/aau_nightlife" target="_blank" rel="noopener noreferrer" className="social-link instagram">Instagram</a>
          <a href="https://facebook.com/aau_nightlife" target="_blank" rel="noopener noreferrer" className="social-link facebook">Facebook</a>
          <a href="https://twitter.com/aau_nightlife" target="_blank" rel="noopener noreferrer" className="social-link twitter">Twitter</a>
          <a href="https://tiktok.com/@aau_nightlife" target="_blank" rel="noopener noreferrer" className="social-link tiktok">TikTok</a>
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