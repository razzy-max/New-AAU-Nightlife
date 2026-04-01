import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API_BASE_URL from '../config';

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    blogs: 0,
    events: 0,
    jobs: 0,
    comments: 0,
    tickets: 0,
    subscribers: 0,
    users: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');

    if (!token || !userData) {
      navigate('/admin/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    setUser(parsedUser);
    fetchStats();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      };
      const cacheBuster = Date.now();

      const requests = [
        fetch(`${API_BASE_URL}/api/blogs?admin=true&pageNumber=1&_t=${cacheBuster}`, { headers }),
        fetch(`${API_BASE_URL}/api/events?admin=true&pageNumber=1&_t=${cacheBuster}`, { headers }),
        fetch(`${API_BASE_URL}/api/jobs?admin=true&pageNumber=1&_t=${cacheBuster}`, { headers }),
        fetch(`${API_BASE_URL}/api/comments/admin/count?_t=${cacheBuster}`, { headers }),
        fetch(`${API_BASE_URL}/api/tickets/admin/count?_t=${cacheBuster}`, { headers }),
        fetch(`${API_BASE_URL}/api/subscribers/admin/count?_t=${cacheBuster}`, { headers }),
        fetch(`${API_BASE_URL}/api/users/admin/list?_t=${cacheBuster}`, { headers }),
      ];

      const responses = await Promise.allSettled(requests);

      // Protected endpoints are comments, tickets, subscribers.
      const protectedUnauthorized = [responses[3], responses[4], responses[5], responses[6]].some(
        (result) => result.status === 'fulfilled' && result.value.status === 401
      );

      if (protectedUnauthorized) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin/login');
        return;
      }

      const readJson = async (result) => {
        if (result.status !== 'fulfilled') {
          return null;
        }

        const response = result.value;
        if (!response.ok) {
          return null;
        }

        try {
          return await response.json();
        } catch (error) {
          return null;
        }
      };

      const [blogsData, eventsData, jobsData, commentsData, ticketsData, subscribersData, usersData] = await Promise.all([
        readJson(responses[0]),
        readJson(responses[1]),
        readJson(responses[2]),
        readJson(responses[3]),
        readJson(responses[4]),
        readJson(responses[5]),
        readJson(responses[6]),
      ]);

      let commentsTotal = commentsData?.total;
      let ticketsTotal = ticketsData?.total;
      let subscribersTotal = subscribersData?.total;

      // Backward-compatible fallbacks for environments where new count endpoints are unavailable.
      if (typeof commentsTotal === 'undefined') {
        const fallback = await fetch(`${API_BASE_URL}/api/comments/admin/all?pageNumber=1&_t=${cacheBuster}`, { headers });
        if (fallback.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          navigate('/admin/login');
          return;
        }
        if (fallback.ok) {
          const data = await fallback.json();
          commentsTotal = data?.total;
        }
      }

      if (typeof ticketsTotal === 'undefined') {
        const fallback = await fetch(`${API_BASE_URL}/api/tickets/admin/list?_t=${cacheBuster}`, { headers });
        if (fallback.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          navigate('/admin/login');
          return;
        }
        if (fallback.ok) {
          const data = await fallback.json();
          ticketsTotal = data?.total;
        }
      }

      if (typeof subscribersTotal === 'undefined') {
        const fallback = await fetch(`${API_BASE_URL}/api/subscribers/admin/all?limit=1&_t=${cacheBuster}`, { headers });
        if (fallback.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          navigate('/admin/login');
          return;
        }
        if (fallback.ok) {
          const data = await fallback.json();
          subscribersTotal = data?.total;
        }
      }

      setStats((prev) => ({
        blogs: blogsData?.total ?? prev.blogs,
        events: eventsData?.total ?? prev.events,
        jobs: jobsData?.total ?? prev.jobs,
        comments: commentsTotal ?? prev.comments,
        tickets: ticketsTotal ?? prev.tickets,
        subscribers: subscribersTotal ?? prev.subscribers,
        users: usersData?.total ?? prev.users,
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-nav">
          <Link to="/" className="back-to-site-btn">← Back to Website</Link>
        </div>
        <h1>Admin Dashboard</h1>
        <div className="admin-actions">
          <span>Welcome, {user.username}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <h3>🏆</h3>
          <p>Awards</p>
          <Link to="/admin/awards" className="manage-link">Manage Awards</Link>
        </div>
        <div className="stat-card">
          <h3>{stats.blogs}</h3>
          <p>Blogs</p>
          <Link to="/admin/blogs" className="manage-link">Manage Blogs</Link>
        </div>
        <div className="stat-card">
          <h3>{stats.events}</h3>
          <p>Events</p>
          <Link to="/admin/events" className="manage-link">Manage Events</Link>
        </div>
        <div className="stat-card">
          <h3>{stats.tickets}</h3>
          <p>Ticket Sales</p>
          <Link to="/admin/tickets" className="manage-link">View Tickets</Link>
        </div>
        <div className="stat-card">
          <h3>{stats.jobs}</h3>
          <p>Jobs</p>
          <Link to="/admin/jobs" className="manage-link">Manage Jobs</Link>
        </div>
        <div className="stat-card">
          <h3>{stats.comments}</h3>
          <p>Comments</p>
          <Link to="/admin/comments" className="manage-link">Manage Comments</Link>
        </div>
        <div className="stat-card">
          <h3>{stats.subscribers}</h3>
          <p>Subscribers</p>
          <Link to="/admin/subscribers" className="manage-link">Manage Subscribers</Link>
        </div>
        <div className="stat-card">
          <h3>{stats.users}</h3>
          <p>Users</p>
          <Link to="/admin/users" className="manage-link">Manage Users</Link>
        </div>
      </div>

      <div className="admin-quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/admin/awards" className="action-btn">🏆 Manage Awards</Link>
          <Link to="/admin/blogs/new" className="action-btn">Add New Blog</Link>
          <Link to="/admin/events/new" className="action-btn">Add New Event</Link>
          <Link to="/admin/jobs/new" className="action-btn">Add New Job</Link>
          <Link to="/admin/tickets" className="action-btn">View Ticket Sales</Link>
          <Link to="/admin/carousel" className="action-btn">Manage Carousel</Link>
          <Link to="/admin/advertisers" className="action-btn">📢 Manage Advertisers</Link>
          <Link to="/admin/subscribers" className="action-btn">View Subscribers</Link>
          <Link to="/admin/users" className="action-btn">Manage Users</Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;