import { useState } from 'react';
import { Link } from 'react-router-dom';

function Blog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showSidebar, setShowSidebar] = useState(false);

  const posts = [
    {
      id: 1,
      title: 'Campus Life at AAU: A Student\'s Perspective',
      excerpt: 'Exploring the vibrant student life at Ambrose Alli University. From academic challenges to social events, discover what makes AAU special.\n\nIn this post, we dive into the daily experiences of students navigating campus life.',
      author: 'John Doe',
      date: '2024-11-15',
      category: 'General',
      image: '/blog/blog1.jpg',
      fullContent: 'Full content for Campus Life at AAU...'
    },
    {
      id: 2,
      title: 'Nightlife Tips: Enjoying Safely',
      excerpt: 'Essential tips for enjoying AAU\'s nightlife scene responsibly. Learn about safety measures, transportation options, and making the most of your evenings.\n\nSafety first: Always have a plan, stay with friends, and know your limits.',
      author: 'Jane Smith',
      date: '2024-11-20',
      category: 'Events',
      image: '/blog/blog2.jpg',
      fullContent: 'Full content for Nightlife Tips...'
    },
    {
      id: 3,
      title: 'Career Opportunities in the Nightlife Industry',
      excerpt: 'Discover exciting career paths in event management, hospitality, and entertainment. From bartending to event coordination, explore job prospects.\n\nThe nightlife industry offers diverse opportunities for creative and outgoing individuals.',
      author: 'Mike Johnson',
      date: '2024-11-25',
      category: 'Jobs',
      image: '/blog/blog3.jpg',
      fullContent: 'Full content for Career Opportunities...'
    }
  ];

  const categories = ['All', 'Events', 'Jobs', 'General'];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
                <div key={post.id} className="blog-card">
                  <div className="blog-image">
                    <img src={post.image} alt={post.title} loading="lazy" />
                  </div>
                  <div className="blog-content">
                    <h3>{post.title}</h3>
                    <div className="blog-meta">
                      <span className="author">By {post.author}</span>
                      <span className="date">{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <p className="blog-excerpt">{post.excerpt}</p>
                    <Link to={`/blog/${post.id}`} className="read-more-btn">Read More</Link>
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