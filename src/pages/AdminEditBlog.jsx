import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminEditBlog() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: '',
    category: 'General',
    tags: '',
    featured: false,
    published: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [currentImage, setCurrentImage] = useState('');
  const [currentVideo, setCurrentVideo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchBlog();
  }, [id]);

  const fetchBlog = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blog = await response.json();
        setFormData({
          title: blog.title || '',
          excerpt: blog.excerpt || '',
          content: blog.content || '',
          author: blog.author || '',
          category: blog.category || 'General',
          tags: blog.tags ? blog.tags.join(', ') : '',
          featured: blog.featured || false,
          published: blog.published !== false
        });
        setCurrentImage(blog.image || '');
        setCurrentVideo(blog.video || '');
      } else {
        alert('Failed to load blog. Redirecting...');
        navigate('/admin/blogs');
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      alert('Error loading blog. Redirecting...');
      navigate('/admin/blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.excerpt.trim()) newErrors.excerpt = 'Excerpt is required';
    if (!formData.content.trim()) newErrors.content = 'Content is required';
    if (!formData.author.trim()) newErrors.author = 'Author is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const formDataToSend = new FormData();

      // Add text fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      // Add files only if new ones are selected
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }
      if (videoFile) {
        formDataToSend.append('video', videoFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        // Trigger all relevant page refreshes if functions are available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
        if (window.refreshBlogData) {
          window.refreshBlogData();
        }
        if (window.refreshRelatedPosts) {
          window.refreshRelatedPosts();
        }
        alert('Blog updated successfully!');
        navigate('/admin/blogs');
      } else {
        alert('Failed to update blog. Please try again.');
      }
    } catch (error) {
      console.error('Error updating blog:', error);
      alert('Error updating blog. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading" style={{ marginTop: '150px', textAlign: 'center' }}>
        <p>Loading blog data...</p>
      </div>
    );
  }

  return (
    <div className="admin-new-blog">
      <div style={{
        marginTop: '100px',
        marginBottom: '20px',
        position: 'relative',
        zIndex: '1000',
        padding: '10px'
      }}>
        <button
          onClick={() => navigate('/admin/blogs')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '100px',
            zIndex: 10
          }}
        >
          &larr; Back to Blogs
        </button>
      </div>

      <div className="admin-header">
        <h1>Edit Blog</h1>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
            {errors.title && <span className="error">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="author">Author *</label>
            <input
              type="text"
              id="author"
              name="author"
              value={formData.author}
              onChange={handleChange}
              required
            />
            {errors.author && <span className="error">{errors.author}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="General">General</option>
              <option value="Events">Events</option>
              <option value="Jobs">Jobs</option>
              <option value="Sports">Sports</option>
              <option value="Academics">Academics</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="image">Image File</label>
            {currentImage && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '12px', color: '#666' }}>Current image:</p>
                <img src={currentImage} alt="Current blog" style={{ maxWidth: '200px', borderRadius: '5px' }} />
              </div>
            )}
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Leave empty to keep current image
            </p>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="video">Video File (Optional)</label>
          {currentVideo && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', color: '#666' }}>Current video is set</p>
            </div>
          )}
          <input
            type="file"
            id="video"
            name="video"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files[0])}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Leave empty to keep current video (if any)
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="excerpt">Excerpt *</label>
          <textarea
            id="excerpt"
            name="excerpt"
            value={formData.excerpt}
            onChange={handleChange}
            rows="2"
            placeholder="Brief summary of the blog post"
            required
          />
          {errors.excerpt && <span className="error">{errors.excerpt}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="content">Content *</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows="8"
            placeholder="Full blog content. Use [link text](url) for hyperlinks."
            required
          />
          {errors.content && <span className="error">{errors.content}</span>}
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Tip: Use [link text](https://example.com) to create clickable links
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="e.g., nightlife, events, campus"
          />
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleChange}
              />
              Featured Post
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="published"
                checked={formData.published}
                onChange={handleChange}
              />
              Published
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/admin/blogs')} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="submit-btn">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminEditBlog;
