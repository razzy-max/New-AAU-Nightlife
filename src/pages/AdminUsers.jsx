import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

function formatCurrency(amount) {
  return `N${Number(amount || 0).toLocaleString()}`;
}

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingUserId, setDeletingUserId] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await fetch(`${API_BASE_URL}/api/users/admin/list?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Unable to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user) => {
    const prompt = `Delete ${user.name || user.email}? This removes login access and anonymizes linked ticket/vote records.`;
    if (!window.confirm(prompt)) {
      return;
    }

    try {
      setDeletingUserId(user._id);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/users/admin/${user._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete user');
      }

      setUsers((prev) => prev.filter((item) => item._id !== user._id));
    } catch (err) {
      alert(err.message || 'Delete failed');
    } finally {
      setDeletingUserId('');
    }
  };

  const totalTicketSpend = users.reduce((sum, user) => sum + Number(user.totalTicketSpend || 0), 0);
  const totalVoteSpend = users.reduce((sum, user) => sum + Number(user.totalVoteSpend || 0), 0);

  return (
    <div className="admin-dashboard" style={{ marginTop: '95px' }}>
      <div className="admin-header">
        <div className="admin-nav">
          <button
            onClick={() => navigate('/admin')}
            className="back-btn"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Back to Dashboard
          </button>
        </div>
        <h1>User Management</h1>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <h3>{users.length}</h3>
          <p>Total Users</p>
        </div>
        <div className="stat-card">
          <h3>{formatCurrency(totalTicketSpend)}</h3>
          <p>Total Ticket Spend</p>
        </div>
        <div className="stat-card">
          <h3>{formatCurrency(totalVoteSpend)}</h3>
          <p>Total Vote Spend</p>
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, email or username"
          style={{
            flex: 1,
            minWidth: '260px',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '14px',
          }}
        />
        <button
          onClick={() => setSearchTerm(searchInput)}
          className="add-btn"
          style={{ padding: '10px 16px' }}
        >
          Search
        </button>
        <button
          onClick={() => {
            setSearchInput('');
            setSearchTerm('');
          }}
          className="delete-btn"
          style={{ padding: '10px 16px' }}
        >
          Clear
        </button>
      </div>

      {loading && <div className="admin-loading">Loading users...</div>}
      {error && <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '16px' }}>{error}</div>}

      {!loading && !error && (
        <div className="subscribers-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Ticket Spend</th>
                <th>Vote Spend</th>
                <th>Total Spend</th>
                <th>Verified</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '18px' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name || user.username || '-'}</td>
                    <td>{user.email}</td>
                    <td>{formatCurrency(user.totalTicketSpend)}</td>
                    <td>{formatCurrency(user.totalVoteSpend)}</td>
                    <td style={{ fontWeight: 'bold' }}>{formatCurrency(user.totalSpend)}</td>
                    <td>{user.isEmailVerified ? 'Yes' : 'No'}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="delete-btn"
                        disabled={deletingUserId === user._id}
                        onClick={() => handleDelete(user)}
                      >
                        {deletingUserId === user._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
