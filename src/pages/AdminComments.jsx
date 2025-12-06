import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminComments() {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComments, setSelectedComments] = useState([]);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/comments/admin/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (commentId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved: true }),
      });

      if (response.ok) {
        fetchComments(); // Refresh the list
      }
    } catch (error) {
      console.error('Error approving comment:', error);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchComments(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedComments.length === 0) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/comments/approve/bulk`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentIds: selectedComments }),
      });

      if (response.ok) {
        setSelectedComments([]);
        fetchComments(); // Refresh the list
      }
    } catch (error) {
      console.error('Error bulk approving comments:', error);
    }
  };

  const handleSelectComment = (commentId) => {
    setSelectedComments(prev =>
      prev.includes(commentId)
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    );
  };

  if (loading) {
    return <div className="admin-loading">Loading comments...</div>;
  }

  return (
    <div className="admin-comments">
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
        <h1>Manage Comments</h1>
      </div>

      <div className="admin-actions">
        {selectedComments.length > 0 && (
          <button onClick={handleBulkApprove} className="bulk-approve-btn">
            Approve Selected ({selectedComments.length})
          </button>
        )}
      </div>

      <div className="comments-table">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedComments(comments.filter(c => !c.approved).map(c => c._id));
                    } else {
                      setSelectedComments([]);
                    }
                  }}
                />
              </th>
              <th>Content</th>
              <th>Author</th>
              <th>Email</th>
              <th>Type</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {comments.map(comment => (
              <tr key={comment._id}>
                <td>
                  {!comment.approved && (
                    <input
                      type="checkbox"
                      checked={selectedComments.includes(comment._id)}
                      onChange={() => handleSelectComment(comment._id)}
                    />
                  )}
                </td>
                <td className="comment-content">{comment.content}</td>
                <td>{comment.author}</td>
                <td>{comment.email}</td>
                <td>{comment.contentType}</td>
                <td>{new Date(comment.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={`status ${comment.approved ? 'approved' : 'pending'}`}>
                    {comment.approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="actions">
                  {!comment.approved && (
                    <button onClick={() => handleApprove(comment._id)} className="approve-btn">
                      Approve
                    </button>
                  )}
                  <button onClick={() => handleDelete(comment._id)} className="delete-btn">
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

export default AdminComments;