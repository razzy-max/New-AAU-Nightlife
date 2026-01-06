import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState({ active: 0, unsubscribed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, unsubscribed
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscribers();
    fetchStats();
  }, [filter]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/subscribers/admin/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const response = await fetch(`${API_BASE_URL}/api/subscribers/admin/all${statusParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.subscribers || []);
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subscriberId) => {
    if (!confirm('Are you sure you want to delete this subscriber?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/subscribers/admin/${subscriberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchSubscribers();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting subscriber:', error);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const response = await fetch(`${API_BASE_URL}/api/subscribers/admin/export${statusParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting subscribers:', error);
      alert('Failed to export subscribers');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  if (loading) {
    return <div className="admin-loading">Loading subscribers...</div>;
  }

  return (
    <div className="admin-dashboard">
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
        <h1>Newsletter Subscribers</h1>
        <div className="admin-actions">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <h3>{stats.active}</h3>
          <p>Active Subscribers</p>
        </div>
        <div className="stat-card">
          <h3>{stats.unsubscribed}</h3>
          <p>Unsubscribed</p>
        </div>
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total All Time</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilter('all')}
            className={`status-btn ${filter === 'all' ? 'featured' : 'not-featured'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`status-btn ${filter === 'active' ? 'featured' : 'not-featured'}`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('unsubscribed')}
            className={`status-btn ${filter === 'unsubscribed' ? 'featured' : 'not-featured'}`}
          >
            Unsubscribed
          </button>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="add-btn"
          style={{ marginLeft: 'auto' }}
        >
          {exporting ? 'Exporting...' : '⬇ Export to CSV'}
        </button>
      </div>

      <div className="subscribers-table">
        <table>
          <thead>
            <tr>
              <th>WhatsApp Number</th>
              <th>Status</th>
              <th>Subscribed Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                  No subscribers found
                </td>
              </tr>
            ) : (
              subscribers.map(subscriber => (
                <tr key={subscriber._id}>
                  <td className="subscriber-email">{subscriber.whatsappNumber}</td>
                  <td>
                    <span className={`status-btn ${subscriber.status === 'active' ? 'published' : 'draft'}`}>
                      {subscriber.status}
                    </span>
                  </td>
                  <td>{new Date(subscriber.subscribedAt).toLocaleDateString()}</td>
                  <td className="actions">
                    <button onClick={() => handleDelete(subscriber._id)} className="delete-btn">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminSubscribers;
