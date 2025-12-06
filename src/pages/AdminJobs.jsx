import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchJobs(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const togglePublished = async (jobId, currentStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: !currentStatus }),
      });

      if (response.ok) {
        fetchJobs(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating job:', error);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading jobs...</div>;
  }

  return (
    <div className="admin-jobs">
      <div className="admin-header">
        <div className="admin-nav">
          <button onClick={() => navigate('/admin')} className="back-btn">&larr; Back to Dashboard</button>
        </div>
        <h1>Manage Jobs</h1>
        <div className="admin-actions">
          <Link to="/admin/jobs/new" className="add-btn">Add New Job</Link>
        </div>
      </div>

      <div className="jobs-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Location</th>
              <th>Type</th>
              <th>Published</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job._id}>
                <td className="job-title">{job.title}</td>
                <td>{job.company}</td>
                <td>{job.location}</td>
                <td>{job.type}</td>
                <td>
                  <button
                    onClick={() => togglePublished(job._id, job.published)}
                    className={`status-btn ${job.published ? 'published' : 'draft'}`}
                  >
                    {job.published ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td>{job.featured ? 'Yes' : 'No'}</td>
                <td className="actions">
                  <button onClick={() => handleDelete(job._id)} className="delete-btn">
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

export default AdminJobs;