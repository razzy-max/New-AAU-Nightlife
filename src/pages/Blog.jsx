import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

function Blog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showSidebar, setShowSidebar] = useState(true);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gridRef, gridVisible] = useScrollAnimation();
  const [cacheBuster, setCacheBuster] = useState(() => {
    // Initialize from sessionStorage if available, otherwise use current time
    const stored = sessionStorage.getItem('blogs_cache_buster');
    return stored ? parseInt(stored) : Date.now();
  });

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        // Check if we have cached data
        const cachedData = sessionStorage.getItem('blogs_cache');
        const cacheTimestamp = sessionStorage.getItem('blogs_cache_timestamp');
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

        // Use cached data if it exists and is fresh (unless cacheBuster changed)
        if (cachedData && cacheTimestamp && cacheBuster === parseInt(sessionStorage.getItem('blogs_cache_buster') || '0')) {
          const age = Date.now() - parseInt(cacheTimestamp);
          if (age < cacheMaxAge) {
            setPosts(JSON.parse(cachedData));
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data with cache-busting parameter
        const response = await fetch(`${API_BASE_URL}/api/blogs?_t=${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch blogs');
        }
        const data = await response.json();
        const blogsData = data.blogs || [];
        
        setPosts(blogsData);
        
        // Cache the data
        sessionStorage.setItem('blogs_cache', JSON.stringify(blogsData));
        sessionStorage.setItem('blogs_cache_timestamp', Date.now().toString());
        sessionStorage.setItem('blogs_cache_buster', cacheBuster.toString());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [cacheBuster]);

  // Function to refresh blog data (exposed globally for admin use)
  const refreshBlogData = () => {
    setCacheBuster(Date.now());
  };

  // Expose refresh function globally
  useEffect(() => {
    window.refreshBlogData = refreshBlogData;
    return () => {
      delete window.refreshBlogData;
    };
  }, []);

  const categories = ['All', 'General', 'Events', 'Jobs', 'Sports', 'Academics'];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading blogs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div>
      <section className="blogs-header">
        <h1>Latest Blogs</h1>
        <p>Stay updated with the latest news, tips, and stories from AAU Nightlife</p>
      </section>
      <section className="blogs-section">
        <div className="blogs-container">
          <button className="sidebar-toggle" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? 'Hide Filters' : 'Show Filters'}
          </button>
          <aside className={`blogs-sidebar ${showSidebar ? 'active' : ''}`}>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="categories">
              <h3>Categories</h3>
              {categories.map(category => (
                <button
                  key={category}
                  className={selectedCategory === category ? 'active' : ''}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </aside>
          <main className="blogs-main">
            <div ref={gridRef} className="blogs-grid">
              {filteredPosts.map((post, index) => (
                <div key={post._id} className={`blog-card stagger-item ${gridVisible ? 'visible' : ''} delay-${Math.min((index % 3) + 1, 3)}`}>
                  <div className="blog-image">
                    <img
                      src={post.image}
                      alt={post.title}
                      loading="lazy"
                      decoding="async"
                      style={{ aspectRatio: '16/9' }}
                    />
                  </div>
                  <div className="blog-content">
                    <h3>{post.title}</h3>
                    <div className="blog-meta">
                      <span className="author">By {post.author}</span>
                      <span className="date">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <p className="blog-excerpt">{post.excerpt}</p>
                    <Link to={`/blog/${post._id}`} className="read-more-btn">Read More</Link>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}

export default Blog;