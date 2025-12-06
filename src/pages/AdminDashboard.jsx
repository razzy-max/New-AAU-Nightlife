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
      };

      const [blogsRes, eventsRes, jobsRes, commentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/blogs?pageNumber=1&pageSize=1`, { headers }),
        fetch(`${API_BASE_URL}/api/events?pageNumber=1&pageSize=1`, { headers }),
        fetch(`${API_BASE_URL}/api/jobs?pageNumber=1&pageSize=1`, { headers }),
        fetch(`${API_BASE_URL}/api/comments/admin/all?pageNumber=1&pageSize=1`, { headers }),
      ]);

      const blogsData = await blogsRes.json();
      const eventsData = await eventsRes.json();
      const jobsData = await jobsRes.json();
      const commentsData = await commentsRes.json();

      setStats({
        blogs: blogsData.total || 0,
        events: eventsData.total || 0,
        jobs: jobsData.total || 0,
        comments: commentsData.total || 0,
      });
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
        <h1>Admin Dashboard</h1>
        <div className="admin-actions">
          <span>Welcome, {user.username}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="admin-stats">
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
          <h3>{stats.jobs}</h3>
          <p>Jobs</p>
          <Link to="/admin/jobs" className="manage-link">Manage Jobs</Link>
        </div>
        <div className="stat-card">
          <h3>{stats.comments}</h3>
          <p>Comments</p>
          <Link to="/admin/comments" className="manage-link">Manage Comments</Link>
        </div>
      </div>

      <div className="admin-quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/admin/blogs/new" className="action-btn">Add New Blog</Link>
          <Link to="/admin/events/new" className="action-btn">Add New Event</Link>
          <Link to="/admin/jobs/new" className="action-btn">Add New Job</Link>
          <Link to="/admin/carousel" className="action-btn">Manage Carousel</Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;