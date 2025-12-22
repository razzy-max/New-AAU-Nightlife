import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  const userData = localStorage.getItem('adminUser');

  // If no token or user data, redirect to login
  if (!token || !userData) {
    return <Navigate to="/admin/login" replace />;
  }

  // Parse and verify user role
  try {
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin') {
      return <Navigate to="/admin/login" replace />;
    }
  } catch (error) {
    // Invalid user data, redirect to login
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    return <Navigate to="/admin/login" replace />;
  }

  // User is authenticated and authorized
  return children;
}

export default ProtectedRoute;
