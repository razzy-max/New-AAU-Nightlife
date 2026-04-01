import { Navigate } from 'react-router-dom';
import { getUserToken, getUserData } from '../utils/userAuth';

function ProtectedUserRoute({ children }) {
  const token = getUserToken();
  const user = getUserData();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedUserRoute;
