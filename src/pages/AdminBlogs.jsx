import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminBlogs() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/blogs?admin=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBlogs(data.blogs || []);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (blogId) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/blogs/${blogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchBlogs(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
    }
  };

  const togglePublished = async (blogId, currentStatus) => {
    const newStatus = !currentStatus;

    // Optimistic update - immediately update UI
    setBlogs(prevBlogs =>
      prevBlogs.map(blog =>
        blog._id === blogId ? { ...blog, published: newStatus } : blog
      )
    );

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/blogs/${blogId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: newStatus }),
      });

      if (response.ok) {
        // Successfully updated
        // Trigger homepage and blog page refresh if functions are available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
        if (window.refreshBlogData) {
          window.refreshBlogData();
        }
      } else {
        // Revert optimistic update on failure
        setBlogs(prevBlogs =>
          prevBlogs.map(blog =>
            blog._id === blogId ? { ...blog, published: currentStatus } : blog
          )
        );
        alert('Failed to update publish status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating blog:', error);
      // Revert optimistic update on error
      setBlogs(prevBlogs =>
        prevBlogs.map(blog =>
          blog._id === blogId ? { ...blog, published: currentStatus } : blog
        )
      );
      alert('Network error. Please try again.');
    }
  };

  const toggleFeatured = async (blogId, currentStatus) => {
    const newStatus = !currentStatus;

    // Optimistic update - immediately update UI
    setBlogs(prevBlogs =>
      prevBlogs.map(blog =>
        blog._id === blogId ? { ...blog, featured: newStatus } : blog
      )
    );

    try {
      const token = localStorage.getItem('adminToken');
      console.log(`Toggling featured for blog ${blogId}: ${currentStatus} -> ${newStatus}`);

      const response = await fetch(`${API_BASE_URL}/api/blogs/${blogId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featured: newStatus }),
      });

      if (response.ok) {
        console.log(`Successfully updated featured status for blog ${blogId}`);
        // Trigger homepage and blog page refresh if functions are available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
        if (window.refreshBlogData) {
          window.refreshBlogData();
        }
      } else {
        console.error(`Failed to update featured status for blog ${blogId}:`, response.status);
        const errorData = await response.text();
        console.error('Error response:', errorData);
        // Revert optimistic update on failure
        setBlogs(prevBlogs =>
          prevBlogs.map(blog =>
            blog._id === blogId ? { ...blog, featured: currentStatus } : blog
          )
        );
        alert('Failed to update featured status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating blog featured status:', error);
      // Revert optimistic update on error
      setBlogs(prevBlogs =>
        prevBlogs.map(blog =>
          blog._id === blogId ? { ...blog, featured: currentStatus } : blog
        )
      );
      alert('Network error. Please try again.');
    }
  };

  const forceRefreshCache = async () => {
    setCacheRefreshing(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/blogs/invalidate-cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Trigger immediate refresh of all pages
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
        if (window.refreshBlogData) {
          window.refreshBlogData();
        }
        alert('Cache refresh triggered! Public website updated immediately.');
      } else {
        alert('Failed to trigger cache refresh.');
      }
    } catch (error) {
      console.error('Error refreshing cache:', error);
      alert('Network error while refreshing cache.');
    } finally {
      setCacheRefreshing(false);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading blogs...</div>;
  }

  return (
    <div className="admin-blogs">
      <div className="admin-header">
        <div className="admin-nav" style={{
          marginTop: '100px',
          marginBottom: '20px',
          position: 'relative',
          zIndex: '1000',
          padding: '10px'
        }}>
          <button
            onClick={() => navigate('/admin')}
            className="back-btn"
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              position: 'relative',
              zIndex: '1001'
            }}
          >
            &larr; Back to Dashboard
          </button>
        </div>
        <h1>Manage Blogs</h1>
        <div className="admin-actions">
          <Link to="/admin/blogs/new" className="add-btn">Add New Blog</Link>
          <button
            onClick={forceRefreshCache}
            disabled={cacheRefreshing}
            className="refresh-cache-btn"
            style={{
              padding: '12px 24px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: cacheRefreshing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              marginLeft: '10px'
            }}
          >
            {cacheRefreshing ? 'Refreshing...' : 'Force Refresh Public Cache'}
          </button>
        </div>
      </div>

      <div className="blogs-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Category</th>
              <th>Published</th>
              <th>Featured</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {blogs.map(blog => (
              <tr key={blog._id}>
                <td className="blog-title">{blog.title}</td>
                <td>{blog.author}</td>
                <td>{blog.category}</td>
                <td>
                  <button
                    onClick={() => togglePublished(blog._id, blog.published)}
                    className={`status-btn ${blog.published ? 'published' : 'draft'}`}
                  >
                    {blog.published ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td>
                  <button
                    onClick={() => toggleFeatured(blog._id, blog.featured)}
                    className={`status-btn ${blog.featured ? 'featured' : 'not-featured'}`}
                  >
                    {blog.featured ? 'Featured' : 'Not Featured'}
                  </button>
                </td>
                <td>{new Date(blog.createdAt).toLocaleDateString()}</td>
                <td className="actions">
                  <Link to={`/blog/${blog._id}`} className="view-btn" target="_blank">
                    View
                  </Link>
                  <button onClick={() => handleDelete(blog._id)} className="delete-btn">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminBlogs;