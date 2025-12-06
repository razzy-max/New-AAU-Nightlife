import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';

function Blog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showSidebar, setShowSidebar] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/blogs`);
        if (!response.ok) {
          throw new Error('Failed to fetch blogs');
        }
        const data = await response.json();
        setPosts(data.blogs || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  const categories = ['All', 'Events', 'Jobs', 'General'];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="loading">Loading blogs...</div>;
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
            <div className="blogs-grid">
              {filteredPosts.map(post => (
                <div key={post._id} className="blog-card">
                  <div className="blog-image">
                    <img src={post.image} alt={post.title} loading="lazy" />
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