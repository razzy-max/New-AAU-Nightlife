import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminBlogs() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/blogs`, {
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
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/blogs/${blogId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: !currentStatus }),
      });

      if (response.ok) {
        fetchBlogs(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating blog:', error);
    }
  };

  const toggleFeatured = async (blogId, currentStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/blogs/${blogId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featured: !currentStatus }),
      });

      if (response.ok) {
        fetchBlogs(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating blog:', error);
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