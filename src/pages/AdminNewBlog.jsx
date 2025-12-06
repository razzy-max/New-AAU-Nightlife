import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminNewBlog() {
  const navigate = useNavigate();
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    if (!imageFile) newErrors.image = 'Image file is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const formDataToSend = new FormData();

      // Add text fields
      Object.keys(formData).forEach(key => {
        if (key === 'tags') {
          formDataToSend.append(key, formData[key]);
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add files
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }
      if (videoFile) {
        formDataToSend.append('video', videoFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/blogs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        navigate('/admin/blogs');
      } else {
        alert('Failed to create blog. Please try again.');
      }
    } catch (error) {
      console.error('Error creating blog:', error);
      alert('Error creating blog. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        <h1>Create New Blog</h1>
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
            <label htmlFor="image">Image File *</label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              required
            />
            {errors.image && <span className="error">{errors.image}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="video">Video File (Optional)</label>
          <input
            type="file"
            id="video"
            name="video"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files[0])}
          />
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
            placeholder="Full blog content"
            required
          />
          {errors.content && <span className="error">{errors.content}</span>}
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
              Publish Immediately
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/admin/blogs')} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Create Blog'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminNewBlog;