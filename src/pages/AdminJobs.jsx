import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/jobs?admin=true`, {
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
    const newStatus = !currentStatus;

    // Optimistic update - immediately update UI
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job._id === jobId ? { ...job, published: newStatus } : job
      )
    );

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: newStatus }),
      });

      if (response.ok) {
        // Successfully updated
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
      } else {
        // Revert optimistic update on failure
        setJobs(prevJobs =>
          prevJobs.map(job =>
            job._id === jobId ? { ...job, published: currentStatus } : job
          )
        );
        alert('Failed to update publish status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      // Revert optimistic update on error
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job._id === jobId ? { ...job, published: currentStatus } : job
        )
      );
      alert('Network error. Please try again.');
    }
  };

  const toggleFeatured = async (jobId, currentStatus) => {
    const newStatus = !currentStatus;

    // Optimistic update - immediately update UI
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job._id === jobId ? { ...job, featured: newStatus } : job
      )
    );

    try {
      const token = localStorage.getItem('adminToken');
      console.log(`Toggling featured for job ${jobId}: ${currentStatus} -> ${newStatus}`);

      const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featured: newStatus }),
      });

      if (response.ok) {
        console.log(`Successfully updated featured status for job ${jobId}`);
        // Trigger homepage refresh if function is available
        if (window.refreshHomepageData) {
          window.refreshHomepageData();
        }
      } else {
        console.error(`Failed to update featured status for job ${jobId}:`, response.status);
        const errorData = await response.text();
        console.error('Error response:', errorData);
        // Revert optimistic update on failure
        setJobs(prevJobs =>
          prevJobs.map(job =>
            job._id === jobId ? { ...job, featured: currentStatus } : job
          )
        );
        alert('Failed to update featured status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating job featured status:', error);
      // Revert optimistic update on error
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job._id === jobId ? { ...job, featured: currentStatus } : job
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
        if (window.refreshRelatedPosts) {
          window.refreshRelatedPosts();
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
    return <div className="admin-loading">Loading jobs...</div>;
  }

  return (
    <div className="admin-jobs">
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
        <h1>Manage Jobs</h1>
        <div className="admin-actions">
          <Link to="/admin/jobs/new" className="add-btn">Add New Job</Link>
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
                <td>
                  <button
                    onClick={() => toggleFeatured(job._id, job.featured)}
                    className={`status-btn ${job.featured ? 'featured' : 'not-featured'}`}
                  >
                    {job.featured ? 'Featured' : 'Not Featured'}
                  </button>
                </td>
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